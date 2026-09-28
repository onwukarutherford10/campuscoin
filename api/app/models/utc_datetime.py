from datetime import UTC

from sqlalchemy import DateTime
from sqlalchemy.dialects.mysql import DATETIME
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.sql.functions import FunctionElement
from sqlalchemy.types import TypeDecorator


class UTCNow(FunctionElement):
    inherit_cache = True


@compiles(UTCNow)
def compile_utc_now(_element, _compiler, **_kwargs):
    return "CURRENT_TIMESTAMP"


@compiles(UTCNow, "mysql")
def compile_mysql_utc_now(_element, _compiler, **_kwargs):
    return "CURRENT_TIMESTAMP(6)"


class UTCDateTime(TypeDecorator):
    """Store UTC without an offset and return aware UTC datetimes."""

    impl = DateTime
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == "mysql":
            return dialect.type_descriptor(DATETIME(fsp=6))
        return dialect.type_descriptor(DateTime())

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        if value.tzinfo is None or value.utcoffset() is None:
            raise ValueError("UTCDateTime requires a timezone-aware datetime")
        return value.astimezone(UTC).replace(tzinfo=None)

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        return value.replace(tzinfo=UTC) if value.tzinfo is None else value.astimezone(UTC)
