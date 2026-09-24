from __future__ import annotations

import uuid
from datetime import timedelta
from typing import Any

from dateutil.relativedelta import relativedelta
from sqlalchemy import select

from app.extensions import db
from app.models import RecurringRule, Transaction, User
from app.services.audit import record_audit
from app.services.transactions import LedgerError, TransactionService
from app.utils.time import as_utc, utcnow


class RecurrenceService:
    def create(self, user: User, values: dict[str, Any]) -> RecurringRule:
        self._validate(user, values)
        rule = RecurringRule(owner_id=user.id, **values)
        db.session.add(rule)
        db.session.flush()
        record_audit("recurrence.created", actor_id=user.id, details={"rule_id": str(rule.id)})
        db.session.commit()
        return rule

    def list_for(self, user: User) -> list[RecurringRule]:
        return list(
            db.session.scalars(
                select(RecurringRule)
                .where(RecurringRule.owner_id == user.id)
                .order_by(RecurringRule.created_at.desc())
            )
        )

    def update(self, user: User, rule_id: uuid.UUID, changes: dict) -> RecurringRule:
        rule = self._owned(user, rule_id)
        candidate = {
            field: changes.get(field, getattr(rule, field))
            for field in (
                "category_id",
                "transaction_type",
                "amount",
                "description",
                "merchant",
                "frequency",
                "interval",
            )
        }
        candidate["next_due_at"] = changes.get("next_due_at", as_utc(rule.next_due_at))
        candidate["ends_at"] = changes.get(
            "ends_at", as_utc(rule.ends_at) if rule.ends_at else None
        )
        self._validate(
            user,
            candidate,
            validate_period=bool({"next_due_at", "ends_at"} & changes.keys()),
        )
        for field, value in changes.items():
            setattr(rule, field, value.strip() if isinstance(value, str) else value)
        record_audit("recurrence.updated", actor_id=user.id, details={"rule_id": str(rule.id)})
        db.session.commit()
        return rule

    def deactivate(self, user: User, rule_id: uuid.UUID) -> None:
        rule = self._owned(user, rule_id)
        rule.is_active = False
        db.session.commit()

    def materialize_due(self, user: User, *, through=None) -> int:
        through = through or utcnow()
        rules = list(
            db.session.scalars(
                select(RecurringRule)
                .where(
                    RecurringRule.owner_id == user.id,
                    RecurringRule.is_active.is_(True),
                    RecurringRule.next_due_at <= through,
                )
                .with_for_update()
            )
        )
        created = 0
        transaction_service = TransactionService()
        for rule in rules:
            iterations = 0
            while as_utc(rule.next_due_at) <= through and iterations < 1000:
                due = as_utc(rule.next_due_at)
                if rule.ends_at and due > as_utc(rule.ends_at):
                    rule.is_active = False
                    break
                exists = db.session.scalar(
                    select(Transaction.id).where(
                        Transaction.recurring_rule_id == rule.id,
                        Transaction.scheduled_for == due,
                    )
                )
                if not exists:
                    transaction_service.create(
                        user,
                        {
                            "category_id": rule.category_id,
                            "transaction_type": rule.transaction_type,
                            "amount": rule.amount,
                            "description": rule.description,
                            "merchant": rule.merchant,
                            "occurred_at": due,
                        },
                        source="recurring",
                        recurring_rule_id=rule.id,
                        scheduled_for=due,
                        commit=False,
                    )
                    created += 1
                rule.next_due_at = self._advance(due, rule.frequency, rule.interval)
                if rule.ends_at and as_utc(rule.next_due_at) > as_utc(rule.ends_at):
                    rule.is_active = False
                iterations += 1
        db.session.commit()
        return created

    @staticmethod
    def _advance(value, frequency: str, interval: int):
        if frequency == "daily":
            return value + timedelta(days=interval)
        if frequency == "weekly":
            return value + timedelta(weeks=interval)
        return value + relativedelta(months=interval)

    @staticmethod
    def _validate(user: User, values: dict, *, validate_period: bool = True) -> None:
        TransactionService._validate(
            user.id,
            {
                "category_id": values["category_id"],
                "transaction_type": values["transaction_type"],
                "amount": values["amount"],
                "occurred_at": values["next_due_at"],
            },
        )
        if validate_period and values.get("ends_at") and values["ends_at"] < values["next_due_at"]:
            raise LedgerError("invalid_recurrence_end", "ends_at cannot precede next_due_at")

    @staticmethod
    def _owned(user: User, rule_id: uuid.UUID) -> RecurringRule:
        rule = db.session.scalar(
            select(RecurringRule).where(
                RecurringRule.id == rule_id, RecurringRule.owner_id == user.id
            )
        )
        if rule is None:
            raise LedgerError("recurring_rule_not_found", "Recurring rule not found", 404)
        return rule


def serialize_rule(rule: RecurringRule) -> dict:
    return {
        "id": str(rule.id),
        "category_id": str(rule.category_id),
        "type": rule.transaction_type,
        "amount": str(rule.amount),
        "description": rule.description,
        "merchant": rule.merchant,
        "frequency": rule.frequency,
        "interval": rule.interval,
        "next_due_at": rule.next_due_at.isoformat(),
        "ends_at": rule.ends_at.isoformat() if rule.ends_at else None,
        "is_active": rule.is_active,
    }
