from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal
from enum import StrEnum
from typing import Any

from sqlalchemy import (
    JSON,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.extensions import db
from app.models.base import TimestampMixin, UUIDPrimaryKeyMixin, VersionMixin
from app.models.utc_datetime import UTCDateTime, UTCNow


class TransactionType(StrEnum):
    INCOME = "income"
    EXPENSE = "expense"


class RevisionAction(StrEnum):
    CREATED = "created"
    UPDATED = "updated"
    DELETED = "deleted"
    RESTORED = "restored"


class Transaction(UUIDPrimaryKeyMixin, TimestampMixin, VersionMixin, db.Model):
    __tablename__ = "transactions"
    __table_args__ = (
        Index("ix_transactions_owner_occurred", "owner_id", "occurred_at"),
        UniqueConstraint(
            "recurring_rule_id", "scheduled_for", name="uq_transaction_recurring_scheduled"
        ),
    )

    owner_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    category_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("categories.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    transaction_type: Mapped[str] = mapped_column(String(20), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    description: Mapped[str] = mapped_column(String(255), nullable=False)
    merchant: Mapped[str | None] = mapped_column(String(160))
    occurred_at: Mapped[datetime] = mapped_column(UTCDateTime(), nullable=False)
    deleted_at: Mapped[datetime | None] = mapped_column(UTCDateTime(), index=True)
    source: Mapped[str] = mapped_column(String(30), nullable=False, default="manual")
    import_fingerprint: Mapped[str | None] = mapped_column(String(64), index=True)
    recurring_rule_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("recurring_rules.id", ondelete="SET NULL"), index=True
    )
    scheduled_for: Mapped[datetime | None] = mapped_column(UTCDateTime())

    category = relationship("Category")
    revisions = relationship(
        "TransactionRevision",
        back_populates="transaction",
        cascade="all, delete-orphan",
        order_by="TransactionRevision.revision_number",
    )


class TransactionRevision(UUIDPrimaryKeyMixin, db.Model):
    __tablename__ = "transaction_revisions"
    __table_args__ = (
        UniqueConstraint(
            "transaction_id", "revision_number", name="uq_transaction_revision_number"
        ),
    )

    transaction_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("transactions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    actor_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    revision_number: Mapped[int] = mapped_column(Integer, nullable=False)
    action: Mapped[str] = mapped_column(String(20), nullable=False)
    snapshot: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        UTCDateTime(), nullable=False, server_default=UTCNow()
    )

    transaction = relationship("Transaction", back_populates="revisions")


class TransactionActivity(UUIDPrimaryKeyMixin, db.Model):
    __tablename__ = "transaction_activities"
    __table_args__ = (
        UniqueConstraint("user_id", "transaction_id", name="uq_transaction_activity_user_tx"),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    transaction_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("transactions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    last_viewed_at: Mapped[datetime | None] = mapped_column(UTCDateTime())
    last_edited_at: Mapped[datetime | None] = mapped_column(UTCDateTime())


class CSVImport(UUIDPrimaryKeyMixin, TimestampMixin, db.Model):
    __tablename__ = "csv_imports"

    owner_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="previewed")
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    mapping: Mapped[dict[str, str]] = mapped_column(JSON, nullable=False)
    rows: Mapped[list[dict[str, Any]]] = mapped_column(JSON, nullable=False)
    row_count: Mapped[int] = mapped_column(Integer, nullable=False)
    valid_count: Mapped[int] = mapped_column(Integer, nullable=False)
    duplicate_count: Mapped[int] = mapped_column(Integer, nullable=False)
    error_count: Mapped[int] = mapped_column(Integer, nullable=False)
    error_csv: Mapped[str | None] = mapped_column(Text)
    expires_at: Mapped[datetime] = mapped_column(UTCDateTime(), nullable=False)
    confirmed_at: Mapped[datetime | None] = mapped_column(UTCDateTime())
    imported_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    job_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("jobs.id", ondelete="SET NULL"))
