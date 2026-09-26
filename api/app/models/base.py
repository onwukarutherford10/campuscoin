from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import Integer, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.models.utc_datetime import UTCDateTime, UTCNow


class UUIDPrimaryKeyMixin:
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        UTCDateTime(), nullable=False, server_default=UTCNow()
    )
    updated_at: Mapped[datetime] = mapped_column(
        UTCDateTime(),
        nullable=False,
        server_default=UTCNow(),
        onupdate=UTCNow(),
    )


class VersionMixin:
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)

    __mapper_args__ = {"version_id_col": version}
