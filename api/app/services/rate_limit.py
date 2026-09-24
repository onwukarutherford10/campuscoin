from datetime import timedelta

from flask import current_app
from sqlalchemy import select

from app.extensions import db
from app.models import RateLimitRecord
from app.utils.time import as_utc, utcnow


class RateLimitExceeded(Exception):
    pass


def check_rate_limit(action: str, subject_key: str) -> None:
    now = utcnow()
    window = timedelta(seconds=current_app.config["RATE_LIMIT_WINDOW_SECONDS"])
    cutoff = now - window
    record = db.session.scalar(
        select(RateLimitRecord)
        .where(
            RateLimitRecord.action == action,
            RateLimitRecord.subject_key == subject_key.lower(),
            RateLimitRecord.window_started_at >= cutoff,
        )
        .order_by(RateLimitRecord.window_started_at.desc())
        .with_for_update()
    )
    if record is None or as_utc(record.window_started_at) < cutoff:
        db.session.add(
            RateLimitRecord(
                action=action, subject_key=subject_key.lower(), window_started_at=now, attempts=1
            )
        )
        db.session.commit()
        return
    if record.attempts >= current_app.config["RATE_LIMIT_MAX_ATTEMPTS"]:
        raise RateLimitExceeded
    record.attempts += 1
    db.session.commit()
