from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import func, select

from app.extensions import db
from app.models import (
    AISuggestionUsage,
    Category,
    CategoryCorrection,
    CategorySuggestionCache,
    User,
)


class SuggestionRepository:
    def categories(self, user_id: uuid.UUID, transaction_type: str) -> list[Category]:
        return list(
            db.session.scalars(
                select(Category)
                .where(
                    Category.category_type == transaction_type,
                    Category.is_active.is_(True),
                    (Category.owner_id == user_id) | Category.owner_id.is_(None),
                )
                .order_by(Category.name)
            )
        )

    def correction(self, user_id: uuid.UUID, transaction_type: str, text_hash: str):
        return db.session.scalar(
            select(CategoryCorrection).where(
                CategoryCorrection.owner_id == user_id,
                CategoryCorrection.transaction_type == transaction_type,
                CategoryCorrection.text_hash == text_hash,
            )
        )

    def cached(self, user_id: uuid.UUID, transaction_type: str, text_hash: str):
        return db.session.scalar(
            select(CategorySuggestionCache).where(
                CategorySuggestionCache.owner_id == user_id,
                CategorySuggestionCache.transaction_type == transaction_type,
                CategorySuggestionCache.text_hash == text_hash,
            )
        )

    def lock_user(self, user_id: uuid.UUID):
        return db.session.scalar(select(User).where(User.id == user_id).with_for_update())

    def usage(self, user_id: uuid.UUID, since: datetime) -> tuple[int, Decimal]:
        count, spent = db.session.execute(
            select(
                func.count(AISuggestionUsage.id),
                func.coalesce(func.sum(AISuggestionUsage.reserved_cost_usd), 0),
            ).where(AISuggestionUsage.owner_id == user_id, AISuggestionUsage.created_at >= since)
        ).one()
        return count, Decimal(spent)
