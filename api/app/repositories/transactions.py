import uuid
from datetime import datetime

from sqlalchemy import func, or_, select

from app.extensions import db
from app.models import Transaction, TransactionActivity, TransactionRevision


class TransactionRepository:
    def get_owned(self, transaction_id: uuid.UUID, owner_id: uuid.UUID) -> Transaction | None:
        return db.session.scalar(
            select(Transaction).where(
                Transaction.id == transaction_id, Transaction.owner_id == owner_id
            )
        )

    def list_owned(
        self,
        owner_id: uuid.UUID,
        *,
        page: int,
        per_page: int,
        category_id: uuid.UUID | None = None,
        transaction_type: str | None = None,
        date_from: datetime | None = None,
        date_to: datetime | None = None,
        query: str | None = None,
        include_deleted: bool = False,
    ) -> tuple[list[Transaction], int]:
        conditions = [Transaction.owner_id == owner_id]
        if not include_deleted:
            conditions.append(Transaction.deleted_at.is_(None))
        if category_id:
            conditions.append(Transaction.category_id == category_id)
        if transaction_type:
            conditions.append(Transaction.transaction_type == transaction_type)
        if date_from:
            conditions.append(Transaction.occurred_at >= date_from)
        if date_to:
            conditions.append(Transaction.occurred_at <= date_to)
        if query:
            pattern = f"%{query.strip()}%"
            conditions.append(
                or_(
                    func.lower(Transaction.description).like(pattern.lower()),
                    func.lower(Transaction.merchant).like(pattern.lower()),
                )
            )
        total = db.session.scalar(select(func.count()).select_from(Transaction).where(*conditions))
        statement = (
            select(Transaction)
            .where(*conditions)
            .order_by(Transaction.occurred_at.desc(), Transaction.id.desc())
            .offset((page - 1) * per_page)
            .limit(per_page)
        )
        return list(db.session.scalars(statement)), int(total or 0)

    def add(self, transaction: Transaction) -> Transaction:
        db.session.add(transaction)
        return transaction

    def revisions(self, transaction_id: uuid.UUID) -> list[TransactionRevision]:
        return list(
            db.session.scalars(
                select(TransactionRevision)
                .where(TransactionRevision.transaction_id == transaction_id)
                .order_by(TransactionRevision.revision_number)
            )
        )

    def activity(self, user_id: uuid.UUID, transaction_id: uuid.UUID) -> TransactionActivity:
        activity = db.session.scalar(
            select(TransactionActivity).where(
                TransactionActivity.user_id == user_id,
                TransactionActivity.transaction_id == transaction_id,
            )
        )
        if activity is None:
            activity = TransactionActivity(user_id=user_id, transaction_id=transaction_id)
            db.session.add(activity)
        return activity

    def recent(
        self, user_id: uuid.UUID, limit: int
    ) -> list[tuple[TransactionActivity, Transaction]]:
        statement = (
            select(TransactionActivity, Transaction)
            .join(Transaction, Transaction.id == TransactionActivity.transaction_id)
            .where(TransactionActivity.user_id == user_id)
            .order_by(
                func.coalesce(
                    TransactionActivity.last_edited_at, TransactionActivity.last_viewed_at
                ).desc()
            )
            .limit(limit)
        )
        return list(db.session.execute(statement).tuples())
