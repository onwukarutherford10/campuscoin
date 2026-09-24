import uuid

from sqlalchemy import select

from app.extensions import db
from app.models import User


class UserRepository:
    def get(self, user_id: uuid.UUID) -> User | None:
        return db.session.get(User, user_id)

    def by_email(self, email: str) -> User | None:
        return db.session.scalar(select(User).where(User.email == email.lower()))

    def list_all(self) -> list[User]:
        return list(db.session.scalars(select(User).order_by(User.created_at.desc())))

    def add(self, user: User) -> User:
        db.session.add(user)
        return user
