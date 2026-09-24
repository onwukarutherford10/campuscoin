from __future__ import annotations

import hashlib
import secrets
import uuid
from dataclasses import dataclass

import jwt
from flask import current_app
from werkzeug.security import check_password_hash, generate_password_hash

from app.extensions import db
from app.models import AuthSession, PasswordResetToken, User, UserRole
from app.repositories.auth import AuthRepository
from app.repositories.users import UserRepository
from app.services.audit import record_audit
from app.utils.time import as_utc, utcnow


class AuthError(Exception):
    def __init__(self, code: str, message: str, status: int = 401):
        self.code = code
        self.message = message
        self.status = status


@dataclass
class TokenPair:
    access: str
    refresh: str
    csrf: str


def _digest(value: str) -> str:
    return hashlib.sha256(value.encode()).hexdigest()


class AuthService:
    def __init__(
        self,
        users: UserRepository | None = None,
        auth: AuthRepository | None = None,
    ):
        self.users = users or UserRepository()
        self.auth = auth or AuthRepository()

    def register(self, email: str, password: str, name: str) -> User:
        normalized = email.strip().lower()
        if self.users.by_email(normalized):
            raise AuthError("email_in_use", "An account already exists for this email", 409)
        user = self.users.add(
            User(
                email=normalized,
                password_hash=generate_password_hash(password),
                name=name.strip(),
            )
        )
        db.session.flush()
        record_audit("auth.register", actor_id=user.id, target_user_id=user.id)
        db.session.commit()
        return user

    def authenticate(self, email: str, password: str, *, require_admin: bool = False) -> User:
        user = self.users.by_email(email.strip().lower())
        if user is None or not check_password_hash(user.password_hash, password):
            raise AuthError("invalid_credentials", "Invalid email or password")
        if not user.is_active:
            raise AuthError("account_disabled", "This account is disabled", 403)
        if require_admin and user.role != UserRole.ADMIN:
            raise AuthError("admin_required", "Administrator access required", 403)
        return user

    def issue_tokens(
        self, user: User, *, ip_address: str | None, user_agent: str | None
    ) -> TokenPair:
        now = utcnow()
        refresh_secret = secrets.token_urlsafe(48)
        session = self.auth.add_session(
            AuthSession(
                user_id=user.id,
                refresh_token_hash="pending",
                expires_at=now + current_app.config["REFRESH_TOKEN_TTL"],
                ip_address=ip_address,
                user_agent=(user_agent or "")[:255] or None,
            )
        )
        db.session.flush()
        refresh = f"{session.id}.{refresh_secret}"
        session.refresh_token_hash = _digest(refresh)
        access = self._access_token(user.id, session.id)
        csrf = secrets.token_urlsafe(32)
        record_audit("auth.login", actor_id=user.id, target_user_id=user.id)
        db.session.commit()
        return TokenPair(access, refresh, csrf)

    def rotate(self, raw_refresh: str) -> tuple[User, TokenPair]:
        session, user = self._valid_refresh(raw_refresh)
        now = utcnow()
        refresh_secret = secrets.token_urlsafe(48)
        refresh = f"{session.id}.{refresh_secret}"
        session.refresh_token_hash = _digest(refresh)
        session.last_used_at = now
        csrf = secrets.token_urlsafe(32)
        record_audit("auth.refresh", actor_id=user.id, target_user_id=user.id)
        db.session.commit()
        return user, TokenPair(self._access_token(user.id, session.id), refresh, csrf)

    def revoke(self, session: AuthSession, actor: User) -> None:
        session.revoked_at = utcnow()
        record_audit("auth.logout", actor_id=actor.id, target_user_id=actor.id)
        db.session.commit()

    def create_password_reset(self, email: str, *, actor_id: uuid.UUID | None = None) -> str | None:
        user = self.users.by_email(email.strip().lower())
        if user is None or not user.is_active:
            return None
        token = secrets.token_urlsafe(48)
        self.auth.add_reset(
            PasswordResetToken(
                user_id=user.id,
                token_hash=_digest(token),
                expires_at=utcnow() + current_app.config["PASSWORD_RESET_TTL"],
            )
        )
        record_audit("auth.password_reset_requested", actor_id=actor_id, target_user_id=user.id)
        db.session.commit()
        return token

    def reset_password(self, token: str, password: str) -> User:
        reset = self.auth.reset_by_hash(_digest(token))
        if reset is None or reset.used_at is not None or as_utc(reset.expires_at) <= utcnow():
            raise AuthError("invalid_reset_token", "Reset token is invalid or expired", 400)
        user = self.users.get(reset.user_id)
        if user is None or not user.is_active:
            raise AuthError("invalid_reset_token", "Reset token is invalid or expired", 400)
        user.password_hash = generate_password_hash(password)
        reset.used_at = utcnow()
        self.auth.revoke_user_sessions(user.id)
        record_audit("auth.password_reset", actor_id=user.id, target_user_id=user.id)
        db.session.commit()
        return user

    def resolve_access(self, token: str) -> tuple[User, AuthSession]:
        try:
            claims = jwt.decode(
                token,
                current_app.config["SECRET_KEY"],
                algorithms=["HS256"],
                options={"require": ["exp", "iat", "sub", "sid", "type"]},
            )
            if claims["type"] != "access":
                raise jwt.InvalidTokenError
            user_id = uuid.UUID(claims["sub"])
            session_id = uuid.UUID(claims["sid"])
        except (jwt.InvalidTokenError, ValueError, KeyError) as exc:
            raise AuthError("invalid_access_token", "Authentication is required") from exc
        session = self.auth.get_session(session_id)
        user = self.users.get(user_id)
        if user is not None and not user.is_active:
            raise AuthError("account_disabled", "This account is disabled", 403)
        if (
            session is None
            or user is None
            or session.user_id != user.id
            or session.revoked_at is not None
            or as_utc(session.expires_at) <= utcnow()
        ):
            raise AuthError("invalid_access_token", "Authentication is required")
        return user, session

    def _valid_refresh(self, raw_refresh: str) -> tuple[AuthSession, User]:
        try:
            session_id = uuid.UUID(raw_refresh.split(".", 1)[0])
        except (ValueError, IndexError) as exc:
            raise AuthError("invalid_refresh_token", "Refresh token is invalid") from exc
        session = self.auth.get_session(session_id)
        if (
            session is None
            or session.revoked_at is not None
            or as_utc(session.expires_at) <= utcnow()
            or not secrets.compare_digest(session.refresh_token_hash, _digest(raw_refresh))
        ):
            raise AuthError("invalid_refresh_token", "Refresh token is invalid")
        user = self.users.get(session.user_id)
        if user is None or not user.is_active:
            raise AuthError("account_disabled", "This account is disabled", 403)
        return session, user

    @staticmethod
    def _access_token(user_id: uuid.UUID, session_id: uuid.UUID) -> str:
        now = utcnow()
        return jwt.encode(
            {
                "sub": str(user_id),
                "sid": str(session_id),
                "type": "access",
                "iat": now,
                "exp": now + current_app.config["ACCESS_TOKEN_TTL"],
            },
            current_app.config["SECRET_KEY"],
            algorithm="HS256",
        )
