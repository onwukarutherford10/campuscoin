from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import ForeignKey, Integer, Numeric, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.extensions import db
from app.models.base import TimestampMixin, UUIDPrimaryKeyMixin
from app.models.utc_datetime import UTCDateTime


class CategoryCorrection(UUIDPrimaryKeyMixin, TimestampMixin, db.Model):
    __tablename__ = "category_corrections"
    __table_args__ = (UniqueConstraint("owner_id", "transaction_type", "text_hash"),)

    owner_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    transaction_type: Mapped[str] = mapped_column(String(20), nullable=False)
    text_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    category_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("categories.id", ondelete="CASCADE"), nullable=False
    )
    accepted_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    corrected_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)


class CategorySuggestionCache(UUIDPrimaryKeyMixin, TimestampMixin, db.Model):
    __tablename__ = "category_suggestion_cache"
    __table_args__ = (UniqueConstraint("owner_id", "transaction_type", "text_hash"),)

    owner_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    transaction_type: Mapped[str] = mapped_column(String(20), nullable=False)
    text_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    category_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("categories.id", ondelete="CASCADE"), nullable=False
    )
    confidence: Mapped[str] = mapped_column(String(12), nullable=False)
    rationale: Mapped[str] = mapped_column(String(160), nullable=False)


class AISuggestionUsage(UUIDPrimaryKeyMixin, db.Model):
    __tablename__ = "ai_suggestion_usage"

    owner_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    created_at: Mapped[datetime] = mapped_column(UTCDateTime(), nullable=False)
    reserved_cost_usd: Mapped[Decimal] = mapped_column(Numeric(10, 6), nullable=False)
    input_tokens: Mapped[int | None] = mapped_column(Integer)
    output_tokens: Mapped[int | None] = mapped_column(Integer)
    outcome: Mapped[str] = mapped_column(String(20), nullable=False, default="reserved")
