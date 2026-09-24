from __future__ import annotations

import uuid
from enum import StrEnum

from sqlalchemy import Boolean, CheckConstraint, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.extensions import db
from app.models.base import TimestampMixin, UUIDPrimaryKeyMixin, VersionMixin


class CategoryType(StrEnum):
    INCOME = "income"
    EXPENSE = "expense"


class Category(UUIDPrimaryKeyMixin, TimestampMixin, VersionMixin, db.Model):
    __tablename__ = "categories"
    __table_args__ = (
        CheckConstraint("category_type IN ('income', 'expense')", name="valid_category_type"),
        UniqueConstraint("owner_id", "name", "category_type", name="uq_category_owner_name_type"),
    )

    owner_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(80), nullable=False)
    category_type: Mapped[str] = mapped_column(String(20), nullable=False)
    color: Mapped[str | None] = mapped_column(String(7))
    icon: Mapped[str | None] = mapped_column(String(50))
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    owner = relationship("User", back_populates="categories")

    @property
    def is_system(self) -> bool:
        return self.owner_id is None
