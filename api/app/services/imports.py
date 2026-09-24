from __future__ import annotations

import csv
import hashlib
import io
import json
import uuid
from datetime import timedelta
from decimal import Decimal, InvalidOperation
from typing import Any

from dateutil.parser import isoparse
from flask import current_app
from sqlalchemy import or_, select

from app.extensions import db
from app.models import Category, CSVImport, JobType, Transaction, User
from app.services.jobs.service import JobService
from app.services.transactions import LedgerError, TransactionService
from app.utils.time import as_utc, utcnow

REQUIRED_FIELDS = {"date", "amount", "description", "type", "category"}
DEFAULT_MAPPING = {field: field for field in REQUIRED_FIELDS}


class ImportService:
    def preview(
        self, user: User, content: str, filename: str, mapping: dict[str, str] | None
    ) -> CSVImport:
        mapping = dict(mapping or DEFAULT_MAPPING)
        missing = REQUIRED_FIELDS - mapping.keys()
        if missing:
            raise LedgerError("invalid_mapping", f"Missing mappings: {', '.join(sorted(missing))}")
        try:
            rows = list(csv.DictReader(io.StringIO(content)))
        except csv.Error as exc:
            raise LedgerError("invalid_csv", "CSV could not be parsed") from exc
        if not rows:
            raise LedgerError("empty_csv", "CSV contains no data rows")
        headers = set(rows[0])
        if "merchant" in headers and "merchant" not in mapping:
            mapping["merchant"] = "merchant"
        unknown = set(mapping.values()) - headers
        if unknown:
            raise LedgerError(
                "invalid_mapping", f"Unknown CSV columns: {', '.join(sorted(unknown))}"
            )

        categories = self._category_lookup(user.id)
        parsed_rows: list[dict[str, Any]] = []
        errors: list[dict[str, Any]] = []
        seen: set[str] = set()
        duplicate_count = 0
        for row_number, row in enumerate(rows, start=2):
            try:
                parsed = self._parse_row(row, mapping, categories)
                fingerprint = self._fingerprint(user.id, parsed)
                duplicate = fingerprint in seen or db.session.scalar(
                    select(Transaction.id).where(
                        Transaction.owner_id == user.id,
                        Transaction.import_fingerprint == fingerprint,
                    )
                )
                seen.add(fingerprint)
                parsed["fingerprint"] = fingerprint
                parsed["duplicate"] = bool(duplicate)
                duplicate_count += int(bool(duplicate))
                parsed_rows.append(parsed)
            except (ValueError, InvalidOperation, LedgerError) as exc:
                errors.append({"row": row_number, "error": str(exc), "data": json.dumps(row)})

        batch = CSVImport(
            owner_id=user.id,
            filename=filename[:255],
            mapping=mapping,
            rows=parsed_rows,
            row_count=len(rows),
            valid_count=len(parsed_rows),
            duplicate_count=duplicate_count,
            error_count=len(errors),
            error_csv=self._error_csv(errors) if errors else None,
            expires_at=utcnow() + timedelta(hours=current_app.config["CSV_PREVIEW_TTL_HOURS"]),
        )
        db.session.add(batch)
        db.session.commit()
        return batch

    def confirm(
        self, user: User, import_id: uuid.UUID, *, include_duplicates: bool = False
    ) -> dict:
        batch = self._owned(user.id, import_id, for_update=True)
        if batch.confirmed_at is not None:
            return {
                "import_id": str(batch.id),
                "status": batch.status,
                "imported": batch.imported_count,
                "already_confirmed": True,
                "job_id": str(batch.job_id) if batch.job_id else None,
            }
        if as_utc(batch.expires_at) <= utcnow():
            raise LedgerError("import_expired", "Import preview has expired", 410)
        eligible = [row for row in batch.rows if include_duplicates or not row["duplicate"]]
        batch.confirmed_at = utcnow()
        if len(eligible) > current_app.config["CSV_SYNC_ROW_LIMIT"]:
            db.session.flush()
            job = JobService().create(
                JobType.CSV_IMPORT,
                {"import_id": str(batch.id), "include_duplicates": include_duplicates},
                idempotency_key=f"csv-import:{batch.id}",
                owner_id=user.id,
            )
            batch.job_id = job.id
            batch.status = "queued"
            db.session.commit()
            return {
                "import_id": str(batch.id),
                "status": "pending",
                "job_id": str(job.id),
                "status_url": f"/api/v1/jobs/{job.id}",
            }

        service = TransactionService()
        for row in eligible:
            service.create(
                user,
                {
                    "category_id": uuid.UUID(row["category_id"]),
                    "transaction_type": row["type"],
                    "amount": Decimal(row["amount"]),
                    "description": row["description"],
                    "merchant": row.get("merchant"),
                    "occurred_at": isoparse(row["occurred_at"]),
                },
                source="csv_import",
                import_fingerprint=row["fingerprint"],
                commit=False,
            )
        batch.status = "completed"
        batch.imported_count = len(eligible)
        db.session.commit()
        return {
            "import_id": str(batch.id),
            "status": batch.status,
            "imported": batch.imported_count,
            "skipped_duplicates": batch.valid_count - len(eligible),
            "already_confirmed": False,
        }

    def get(self, user: User, import_id: uuid.UUID) -> CSVImport:
        return self._owned(user.id, import_id)

    @staticmethod
    def _parse_row(row: dict, mapping: dict, categories: dict) -> dict:
        amount = Decimal(row[mapping["amount"]]).quantize(Decimal("0.01"))
        if amount <= 0:
            raise ValueError("amount must be positive")
        occurred_at = isoparse(row[mapping["date"]])
        if occurred_at.tzinfo is None:
            raise ValueError("date must include a timezone")
        transaction_type = row[mapping["type"]].strip().lower()
        if transaction_type not in {"income", "expense"}:
            raise ValueError("type must be income or expense")
        category_key = row[mapping["category"]].strip().casefold()
        category = categories.get((category_key, transaction_type))
        if category is None:
            raise ValueError("category is unavailable or has the wrong type")
        description = row[mapping["description"]].strip()
        if not description:
            raise ValueError("description is required")
        merchant_column = mapping.get("merchant")
        merchant = row.get(merchant_column, "").strip() if merchant_column else ""
        return {
            "category_id": str(category.id),
            "type": transaction_type,
            "amount": str(amount),
            "description": description[:255],
            "merchant": merchant[:160] or None,
            "occurred_at": occurred_at.isoformat(),
        }

    @staticmethod
    def _fingerprint(user_id: uuid.UUID, row: dict) -> str:
        raw = "|".join(
            [
                str(user_id),
                row["occurred_at"],
                row["amount"],
                row["type"],
                row["description"].casefold(),
                (row.get("merchant") or "").casefold(),
            ]
        )
        return hashlib.sha256(raw.encode()).hexdigest()

    @staticmethod
    def _category_lookup(user_id: uuid.UUID) -> dict[tuple[str, str], Category]:
        categories = db.session.scalars(
            select(Category).where(
                or_(Category.owner_id == user_id, Category.owner_id.is_(None)),
                Category.is_active.is_(True),
            )
        )
        return {(item.name.casefold(), item.category_type): item for item in categories}

    @staticmethod
    def _error_csv(errors: list[dict]) -> str:
        stream = io.StringIO()
        writer = csv.DictWriter(stream, fieldnames=["row", "error", "data"])
        writer.writeheader()
        writer.writerows(errors)
        return stream.getvalue()

    @staticmethod
    def _owned(owner_id: uuid.UUID, import_id: uuid.UUID, *, for_update: bool = False) -> CSVImport:
        statement = select(CSVImport).where(
            CSVImport.id == import_id, CSVImport.owner_id == owner_id
        )
        if for_update:
            statement = statement.with_for_update()
        batch = db.session.scalar(statement)
        if batch is None:
            raise LedgerError("import_not_found", "Import not found", 404)
        return batch


def serialize_import(batch: CSVImport) -> dict:
    return {
        "import_id": str(batch.id),
        "status": batch.status,
        "filename": batch.filename,
        "row_count": batch.row_count,
        "valid_count": batch.valid_count,
        "duplicate_count": batch.duplicate_count,
        "error_count": batch.error_count,
        "expires_at": batch.expires_at.isoformat(),
        "preview": batch.rows[:20],
        "errors_url": (
            f"/api/v1/transactions/imports/{batch.id}/errors" if batch.error_count else None
        ),
    }
