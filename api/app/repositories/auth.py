import uuid

from sqlalchemy import select, update

from app.extensions import db
from app.models import AuthSession, PasswordResetToken
from app.utils.time import utcnow


class AuthRepository:
    def get_session(self, session_id: uuid.UUID) -> AuthSession | None:
        return db.session.get(AuthSession, session_id)

    def add_session(self, session: AuthSession) -> AuthSession:
        db.session.add(session)
        return session

    def revoke_user_sessions(self, user_id: uuid.UUID) -> None:
        db.session.execute(
            update(AuthSession)
            .where(AuthSession.user_id == user_id, AuthSession.revoked_at.is_(None))
            .values(revoked_at=utcnow())
        )

    def add_reset(self, token: PasswordResetToken) -> PasswordResetToken:
        db.session.add(token)
        return token

    def reset_by_hash(self, token_hash: str) -> PasswordResetToken | None:
        return db.session.scalar(
            select(PasswordResetToken).where(PasswordResetToken.token_hash == token_hash)
        )
