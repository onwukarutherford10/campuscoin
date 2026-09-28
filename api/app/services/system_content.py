import uuid

from sqlalchemy import select, update

from app.extensions import db
from app.models import Notification, SystemContent
from app.services.audit import record_audit
from app.services.transactions import LedgerError
from app.utils.time import utcnow


def serialize_content(item):
    return {
        "id": str(item.id),
        "kind": item.kind,
        "title": item.title,
        "body": item.body,
        "is_active": item.is_active,
        "version": item.version,
        "created_at": item.created_at.isoformat(),
        "updated_at": item.updated_at.isoformat(),
    }


class SystemContentService:
    def list(self, kind=None, *, active_only=False):
        query = select(SystemContent)
        if kind:
            query = query.where(SystemContent.kind == kind)
        if active_only:
            query = query.where(SystemContent.is_active.is_(True))
        return db.session.scalars(query.order_by(SystemContent.created_at.desc())).all()

    def create(self, actor, values):
        values = {**values, "title": values["title"].strip(), "body": values["body"].strip()}
        if not values["title"] or not values["body"]:
            raise LedgerError("invalid_content", "Title and body cannot be blank")
        item = SystemContent(created_by=actor.id, **values)
        db.session.add(item)
        db.session.flush()
        record_audit(f"admin.{item.kind}_created", actor_id=actor.id)
        db.session.commit()
        return item

    def update(self, actor, item_id: uuid.UUID, values):
        item = db.session.get(SystemContent, item_id)
        if item is None:
            raise LedgerError("not_found", "Content not found", 404)
        for key, value in values.items():
            if isinstance(value, str):
                value = value.strip()
                if not value:
                    raise LedgerError("invalid_content", "Title and body cannot be blank")
            setattr(item, key, value)
        if item.kind == "announcement" and values:
            self._retire_announcement(item.id)
        record_audit(f"admin.{item.kind}_updated", actor_id=actor.id)
        db.session.commit()
        return item

    def delete(self, actor, item_id: uuid.UUID):
        item = db.session.get(SystemContent, item_id)
        if item is None:
            raise LedgerError("not_found", "Content not found", 404)
        item.is_active = False
        if item.kind == "announcement":
            self._retire_announcement(item.id)
        record_audit(f"admin.{item.kind}_deactivated", actor_id=actor.id)
        db.session.commit()

    def sync_announcements(self, user):
        """Deliver active announcements once per account through existing notifications."""
        active = self.list("announcement", active_only=True)
        for item in active:
            key = f"announcement:{item.id}:{item.version}:{user.id}"
            notification = db.session.scalar(select(Notification).where(Notification.key == key))
            message = f"{item.title}: {item.body}"[:255]
            if notification is None:
                db.session.add(
                    Notification(owner_id=user.id, key=key, kind="announcement", message=message)
                )
            elif notification.message != message:
                notification.message = message
        db.session.commit()

    @staticmethod
    def _retire_announcement(item_id):
        db.session.execute(
            update(Notification)
            .where(Notification.kind == "announcement")
            .where(Notification.key.like(f"announcement:{item_id}:%"))
            .where(Notification.dismissed_at.is_(None))
            .values(dismissed_at=utcnow())
        )
