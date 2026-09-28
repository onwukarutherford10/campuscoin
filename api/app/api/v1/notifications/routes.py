import uuid

from flask import Blueprint, g

from app.api.responses import success
from app.extensions import db
from app.repositories.planning import PlanningRepository
from app.services.planning import PlanningService
from app.services.transactions import LedgerError
from app.utils.security import auth_required
from app.utils.time import utcnow

notifications = Blueprint("notifications", __name__)


@notifications.get("")
@auth_required()
def list_notifications():
    return success(
        [
            PlanningService.serialize_notification(n)
            for n in PlanningRepository().notifications(g.current_user.id)
        ]
    )


def _update(notification_id, field):
    item = PlanningRepository().notification(g.current_user.id, notification_id)
    if item is None:
        raise LedgerError("not_found", "Notification not found", 404)
    if getattr(item, field) is None:
        setattr(item, field, utcnow())
        db.session.commit()
    return success(PlanningService.serialize_notification(item))


@notifications.post("/<uuid:notification_id>/read")
@auth_required()
def read_notification(notification_id: uuid.UUID):
    return _update(notification_id, "read_at")


@notifications.post("/<uuid:notification_id>/dismiss")
@auth_required()
def dismiss_notification(notification_id: uuid.UUID):
    return _update(notification_id, "dismissed_at")
