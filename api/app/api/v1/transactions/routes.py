from __future__ import annotations

import uuid
from datetime import datetime

from flask import Blueprint, current_app, g, request

from app.api.responses import success
from app.repositories.transactions import TransactionRepository
from app.schemas.transactions import TransactionSchema, TransactionUpdateSchema
from app.services.recurrence import RecurrenceService
from app.services.transactions import LedgerError, TransactionService, serialize_transaction
from app.utils.security import auth_required

transactions = Blueprint("transactions", __name__)


def _date_arg(name: str):
    value = request.args.get(name)
    if not value:
        return None
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError as exc:
        raise LedgerError("invalid_filter", f"{name} must be an ISO-8601 datetime") from exc
    if parsed.tzinfo is None:
        raise LedgerError("invalid_filter", f"{name} must include a timezone")
    return parsed


@transactions.get("")
@auth_required()
def list_transactions():
    RecurrenceService().materialize_due(g.current_user)
    page = max(request.args.get("page", 1, type=int), 1)
    per_page = min(
        max(request.args.get("per_page", current_app.config["DEFAULT_PAGE_SIZE"], type=int), 1),
        current_app.config["MAX_PAGE_SIZE"],
    )
    category_id = request.args.get("category_id", type=uuid.UUID)
    items, total = TransactionRepository().list_owned(
        g.current_user.id,
        page=page,
        per_page=per_page,
        category_id=category_id,
        transaction_type=request.args.get("type"),
        date_from=_date_arg("from"),
        date_to=_date_arg("to"),
        query=request.args.get("q"),
        include_deleted=request.args.get("include_deleted", "false").lower() == "true",
    )
    return success(
        [serialize_transaction(item) for item in items],
        meta={"page": page, "per_page": per_page, "total": total},
    )


@transactions.post("")
@auth_required()
def create_transaction():
    values = TransactionSchema().load(request.get_json(silent=True) or {})
    transaction = TransactionService().create(g.current_user, values)
    return success(serialize_transaction(transaction), status=201)


@transactions.get("/recent")
@auth_required()
def recent_transactions():
    limit = min(max(request.args.get("limit", 10, type=int), 1), 50)
    rows = TransactionRepository().recent(g.current_user.id, limit)
    return success(
        [
            {
                "transaction": serialize_transaction(transaction),
                "last_viewed_at": (
                    activity.last_viewed_at.isoformat() if activity.last_viewed_at else None
                ),
                "last_edited_at": (
                    activity.last_edited_at.isoformat() if activity.last_edited_at else None
                ),
            }
            for activity, transaction in rows
        ]
    )


@transactions.get("/<uuid:transaction_id>")
@auth_required()
def get_transaction(transaction_id: uuid.UUID):
    transaction = TransactionService().get(g.current_user, transaction_id)
    return success(serialize_transaction(transaction))


@transactions.patch("/<uuid:transaction_id>")
@auth_required()
def update_transaction(transaction_id: uuid.UUID):
    values = TransactionUpdateSchema().load(request.get_json(silent=True) or {})
    transaction = TransactionService().update(g.current_user, transaction_id, values)
    return success(serialize_transaction(transaction))


@transactions.delete("/<uuid:transaction_id>")
@auth_required()
def delete_transaction(transaction_id: uuid.UUID):
    transaction = TransactionService().soft_delete(g.current_user, transaction_id)
    return success(serialize_transaction(transaction))


@transactions.post("/<uuid:transaction_id>/restore")
@auth_required()
def restore_transaction(transaction_id: uuid.UUID):
    transaction = TransactionService().restore(g.current_user, transaction_id)
    return success(serialize_transaction(transaction))


@transactions.get("/<uuid:transaction_id>/revisions")
@auth_required()
def transaction_revisions(transaction_id: uuid.UUID):
    transaction = TransactionService().get(g.current_user, transaction_id, track=False)
    revisions = TransactionRepository().revisions(transaction.id)
    return success(
        [
            {
                "revision": revision.revision_number,
                "action": revision.action,
                "snapshot": revision.snapshot,
                "created_at": revision.created_at.isoformat(),
            }
            for revision in revisions
        ]
    )
