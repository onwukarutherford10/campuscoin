from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy.dialects import mysql, sqlite

from app.models.utc_datetime import UTCDateTime


def test_aware_datetime_normalizes_and_reloads_utc():
    column_type = UTCDateTime()
    incoming = datetime(2026, 9, 20, 12, tzinfo=timezone(timedelta(hours=1)))
    stored = column_type.process_bind_param(incoming, mysql.dialect())
    assert stored == datetime(2026, 9, 20, 11)
    assert column_type.process_result_value(stored, mysql.dialect()).isoformat() == (
        "2026-09-20T11:00:00+00:00"
    )
    assert str(column_type.load_dialect_impl(mysql.dialect())) == "DATETIME"
    assert column_type.load_dialect_impl(sqlite.dialect()) is not None


def test_naive_datetime_rejected():
    with pytest.raises(ValueError, match="timezone-aware"):
        UTCDateTime().process_bind_param(datetime(2026, 9, 20), mysql.dialect())
