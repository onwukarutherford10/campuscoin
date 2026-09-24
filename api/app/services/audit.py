import uuid
from typing import Any

from flask import has_request_context, request

from app.extensions import db
from app.models import AuditLog


def record_audit(
    action: str,
    *,
    actor_id: uuid.UUID | None = None,
    target_user_id: uuid.UUID | None = None,
    details: dict[str, Any] | None = None,
) -> AuditLog:
    entry = AuditLog(
        actor_id=actor_id,
        target_user_id=target_user_id,
        action=action,
        ip_address=request.remote_addr if has_request_context() else None,
        details=details or {},
    )
    db.session.add(entry)
    return entry
