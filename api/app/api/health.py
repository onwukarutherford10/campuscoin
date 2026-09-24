from flask import Blueprint
from sqlalchemy import text

from app.api.responses import failure, success
from app.extensions import db

health = Blueprint("health", __name__)


@health.get("/health")
def healthcheck():
    return success({"status": "healthy"})


@health.get("/ready")
def readiness():
    try:
        db.session.execute(text("SELECT 1"))
    except Exception:
        db.session.rollback()
        return failure("not_ready", "Database is unavailable", status=503)
    return success({"status": "ready", "checks": {"database": "ok"}})
