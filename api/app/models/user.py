from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal
from enum import StrEnum

from sqlalchemy import Boolean, CheckConstraint, ForeignKey, Numeric, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.extensions import db
from app.models.base import TimestampMixin, UUIDPrimaryKeyMixin, VersionMixin
from app.models.utc_datetime import UTCDateTime


class UserRole(StrEnum):
    STUDENT = "student"
    ADMIN = "admin"


class OnboardingPreferenceKind(StrEnum):
    INCOME_SOURCE = "income_source"
    SPENDING_AREA = "spending_area"


class User(UUIDPrimaryKeyMixin, TimestampMixin, VersionMixin, db.Model):
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(320), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    academic_year: Mapped[str | None] = mapped_column(String(40))
    allowance_baseline: Mapped[Decimal] = mapped_column(
        Numeric(14, 2), nullable=False, default=Decimal("0.00")
    )
    savings_goal: Mapped[Decimal] = mapped_column(
        Numeric(14, 2), nullable=False, default=Decimal("0.00")
    )
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="NGN")
    timezone: Mapped[str] = mapped_column(String(64), nullable=False, default="Africa/Lagos")
    ai_consent: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    role: Mapped[str] = mapped_column(String(20), nullable=False, default=UserRole.STUDENT)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    email_verified_at: Mapped[datetime | None] = mapped_column(UTCDateTime())
    onboarding_completed_at: Mapped[datetime | None] = mapped_column(UTCDateTime())

    sessions = relationship("AuthSession", back_populates="user", cascade="all, delete-orphan")
    categories = relationship("Category", back_populates="owner")
    onboarding_preferences = relationship(
        "OnboardingCategoryPreference", cascade="all, delete-orphan"
    )


class OnboardingCategoryPreference(UUIDPrimaryKeyMixin, TimestampMixin, db.Model):
    __tablename__ = "onboarding_category_preferences"
    __table_args__ = (
        CheckConstraint(
            "kind IN ('income_source', 'spending_area')", name="valid_onboarding_preference_kind"
        ),
        UniqueConstraint("user_id", "category_id", "kind", name="uq_onboarding_user_category_kind"),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    category_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("categories.id", ondelete="CASCADE"), nullable=False, index=True
    )
    kind: Mapped[str] = mapped_column(String(30), nullable=False)

    category = relationship("Category")
