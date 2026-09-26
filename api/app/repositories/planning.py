from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import func, select

from app.extensions import db
from app.models import Budget, Category, Notification, TipState, Transaction


class PlanningRepository:
    def budget(self, owner_id: uuid.UUID, budget_id: uuid.UUID):
        return db.session.scalar(
            select(Budget).where(Budget.id == budget_id, Budget.owner_id == owner_id)
        )

    def budgets(self, owner_id: uuid.UUID, year: int, month: int):
        return db.session.scalars(
            select(Budget).where(
                Budget.owner_id == owner_id, Budget.year == year, Budget.month == month
            )
        ).all()

    def spending(self, owner_id: uuid.UUID, start: datetime, end: datetime):
        rows = db.session.execute(
            select(Transaction.category_id, func.sum(Transaction.amount))
            .where(
                Transaction.owner_id == owner_id,
                Transaction.deleted_at.is_(None),
                Transaction.transaction_type == "expense",
                Transaction.occurred_at >= start,
                Transaction.occurred_at < end,
            )
            .group_by(Transaction.category_id)
        )
        return dict(rows.all())

    def transactions(self, owner_id: uuid.UUID, start: datetime, end: datetime):
        return db.session.scalars(
            select(Transaction)
            .where(
                Transaction.owner_id == owner_id,
                Transaction.deleted_at.is_(None),
                Transaction.occurred_at >= start,
                Transaction.occurred_at < end,
            )
            .order_by(Transaction.occurred_at.desc(), Transaction.id)
        ).all()

    def category(self, category_id: uuid.UUID):
        return db.session.get(Category, category_id)

    def notification(self, owner_id: uuid.UUID, notification_id: uuid.UUID):
        return db.session.scalar(
            select(Notification).where(
                Notification.id == notification_id, Notification.owner_id == owner_id
            )
        )

    def notifications(self, owner_id: uuid.UUID):
        return db.session.scalars(
            select(Notification)
            .where(Notification.owner_id == owner_id, Notification.dismissed_at.is_(None))
            .order_by(Notification.created_at.desc())
        ).all()

    def tip_state(self, owner_id: uuid.UUID, key: str):
        return db.session.scalar(
            select(TipState).where(TipState.owner_id == owner_id, TipState.tip_key == key)
        )
