from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import select

from app.extensions import db
from app.models import (
    Category,
    RevisionAction,
    Transaction,
    TransactionRevision,
    User,
)
from app.repositories.transactions import TransactionRepository
from app.services.audit import record_audit
from app.utils.time import as_utc, utcnow


class LedgerError(Exception):
    def __init__(self, code: str, message: str, status: int = 400):
        super().__init__(message)
        self.code = code
        self.message = message
        self.status = status


class TransactionService:
    def __init__(self, repository: TransactionRepository | None = None):
        self.repository = repository or TransactionRepository()

    def create(
        self,
        user: User,
        values: dict[str, Any],
        *,
        source: str = "manual",
        import_fingerprint: str | None = None,
        recurring_rule_id: uuid.UUID | None = None,
        scheduled_for: datetime | None = None,
        commit: bool = True,
    ) -> Transaction:
        self._validate(user.id, values)
        transaction = self.repository.add(
            Transaction(
                owner_id=user.id,
                source=source,
                import_fingerprint=import_fingerprint,
                recurring_rule_id=recurring_rule_id,
                scheduled_for=scheduled_for,
                **values,
            )
        )
        db.session.flush()
        self._revision(transaction, user.id, RevisionAction.CREATED)
        record_audit(
            "transaction.created",
            actor_id=user.id,
            details={"transaction_id": str(transaction.id), "source": source},
        )
        if commit:
            db.session.commit()
        return transaction

    def get(self, user: User, transaction_id: uuid.UUID, *, track: bool = True) -> Transaction:
        transaction = self._owned(user.id, transaction_id)
        if track:
            self.repository.activity(user.id, transaction.id).last_viewed_at = utcnow()
            db.session.commit()
        return transaction

    def update(self, user: User, transaction_id: uuid.UUID, changes: dict) -> Transaction:
        transaction = self._owned(user.id, transaction_id, active=True)
        values = {
            "category_id": changes.get("category_id", transaction.category_id),
            "transaction_type": changes.get("transaction_type", transaction.transaction_type),
            "amount": changes.get("amount", transaction.amount),
            "description": changes.get("description", transaction.description),
            "merchant": changes.get("merchant", transaction.merchant),
            "occurred_at": changes.get("occurred_at", as_utc(transaction.occurred_at)),
        }
        self._validate(user.id, values)
        for field, value in changes.items():
            setattr(transaction, field, value.strip() if isinstance(value, str) else value)
        self._revision(transaction, user.id, RevisionAction.UPDATED)
        self.repository.activity(user.id, transaction.id).last_edited_at = utcnow()
        record_audit(
            "transaction.updated",
            actor_id=user.id,
            details={"transaction_id": str(transaction.id)},
        )
        db.session.commit()
        return transaction

    def soft_delete(self, user: User, transaction_id: uuid.UUID) -> Transaction:
        transaction = self._owned(user.id, transaction_id, active=True)
        transaction.deleted_at = utcnow()
        self._revision(transaction, user.id, RevisionAction.DELETED)
        self.repository.activity(user.id, transaction.id).last_edited_at = utcnow()
        db.session.commit()
        return transaction

    def restore(self, user: User, transaction_id: uuid.UUID) -> Transaction:
        transaction = self._owned(user.id, transaction_id)
        if transaction.deleted_at is None:
            raise LedgerError("transaction_not_deleted", "Transaction is not deleted", 409)
        transaction.deleted_at = None
        self._revision(transaction, user.id, RevisionAction.RESTORED)
        self.repository.activity(user.id, transaction.id).last_edited_at = utcnow()
        db.session.commit()
        return transaction

    def _owned(
        self, owner_id: uuid.UUID, transaction_id: uuid.UUID, *, active: bool = False
    ) -> Transaction:
        transaction = self.repository.get_owned(transaction_id, owner_id)
        if transaction is None or (active and transaction.deleted_at is not None):
            raise LedgerError("transaction_not_found", "Transaction not found", 404)
        return transaction

    @staticmethod
    def _validate(owner_id: uuid.UUID, values: dict) -> None:
        amount = Decimal(values["amount"])
        if amount <= 0:
            raise LedgerError("invalid_amount", "Amount must be positive")
        occurred_at = values["occurred_at"]
        if occurred_at.tzinfo is None:
            raise LedgerError("timezone_required", "occurred_at must include a timezone")
        category = db.session.scalar(
            select(Category).where(
                Category.id == values["category_id"],
                Category.is_active.is_(True),
            )
        )
        if category is None or category.owner_id not in {None, owner_id}:
            raise LedgerError("category_not_found", "Category not found", 404)
        if category.category_type != values["transaction_type"]:
            raise LedgerError("category_type_mismatch", "Category type must match transaction type")

    @staticmethod
    def _revision(transaction: Transaction, actor_id: uuid.UUID, action: RevisionAction) -> None:
        revision_number = len(transaction.revisions) + 1
        db.session.add(
            TransactionRevision(
                transaction=transaction,
                actor_id=actor_id,
                revision_number=revision_number,
                action=action.value,
                snapshot=serialize_transaction(transaction),
            )
        )


def serialize_transaction(transaction: Transaction) -> dict[str, Any]:
    return {
        "id": str(transaction.id),
        "category_id": str(transaction.category_id),
        "type": transaction.transaction_type,
        "amount": str(transaction.amount),
        "description": transaction.description,
        "merchant": transaction.merchant,
        "occurred_at": transaction.occurred_at.isoformat(),
        "source": transaction.source,
        "deleted_at": transaction.deleted_at.isoformat() if transaction.deleted_at else None,
        "recurring_rule_id": (
            str(transaction.recurring_rule_id) if transaction.recurring_rule_id else None
        ),
        "version": transaction.version,
    }
