from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from enum import StrEnum

from sqlalchemy import Boolean, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.extensions import db
from app.models.base import TimestampMixin, UUIDPrimaryKeyMixin, VersionMixin
from app.models.utc_datetime import UTCDateTime


class UserRole(StrEnum):
    STUDENT = "student"
    ADMIN = "admin"


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

    sessions = relationship("AuthSession", back_populates="user", cascade="all, delete-orphan")
    categories = relationship("Category", back_populates="owner")
