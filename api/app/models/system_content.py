from __future__ import annotations

import uuid

from sqlalchemy import Boolean, CheckConstraint, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.extensions import db
from app.models.base import TimestampMixin, UUIDPrimaryKeyMixin, VersionMixin


class SystemContent(UUIDPrimaryKeyMixin, TimestampMixin, VersionMixin, db.Model):
    __tablename__ = "system_content"
    __table_args__ = (
        CheckConstraint(
            "kind IN ('announcement', 'tip_template')", name="valid_system_content_kind"
        ),
    )

    kind: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(100), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_by: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
