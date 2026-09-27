from __future__ import annotations

import hashlib
import hmac
import secrets

from flask import current_app
from sqlalchemy import select

from app.extensions import db
from app.models import EmailVerificationCode
from app.services.auth import AuthError
from app.services.email.sender import send_email
from app.utils.time import as_utc, utcnow


def _hash_code(user_id, code: str) -> str:
    key = current_app.config["SECRET_KEY"].encode()
    return hmac.new(key, f"{user_id}:{code}".encode(), hashlib.sha256).hexdigest()


def _latest(user_id):
    return db.session.scalar(
        select(EmailVerificationCode)
        .where(EmailVerificationCode.user_id == user_id, EmailVerificationCode.used_at.is_(None))
        .order_by(EmailVerificationCode.created_at.desc(), EmailVerificationCode.id.desc())
        .limit(1)
    )


def send_verification_code(user) -> None:
    if user.email_verified_at is not None:
        raise AuthError("email_already_verified", "Email is already verified", 409)
    now = utcnow()
    previous = _latest(user.id)
    if previous and as_utc(previous.created_at) + current_app.config["EMAIL_RESEND_COOLDOWN"] > now:
        raise AuthError("resend_too_soon", "Please wait before requesting another code", 429)
    code = f"{secrets.randbelow(1_000_000):06d}"
    record = EmailVerificationCode(
        user_id=user.id,
        code_hash=_hash_code(user.id, code),
        expires_at=now + current_app.config["EMAIL_CODE_TTL"],
        attempts=0,
    )
    db.session.add(record)
    db.session.flush()
    try:
        send_email(
            user.email,
            "Your CampusCoin verification code",
            f"Your CampusCoin verification code is {code}. It expires in "
            f"{int(current_app.config['EMAIL_CODE_TTL'].total_seconds() // 60)} minutes.\n"
            "If you did not create this account, ignore this message.",
        )
    except Exception:
        db.session.rollback()
        raise
    if previous:
        previous.used_at = now
    db.session.commit()


def verify_email_code(user, code: str) -> None:
    if user.email_verified_at is not None:
        return
    record = _latest(user.id)
    now = utcnow()
    if record is None or as_utc(record.expires_at) <= now:
        raise AuthError("invalid_verification_code", "Code is invalid or expired", 400)
    if record.attempts >= current_app.config["EMAIL_CODE_MAX_ATTEMPTS"]:
        raise AuthError("verification_locked", "Request a new verification code", 429)
    if not secrets.compare_digest(record.code_hash, _hash_code(user.id, code)):
        record.attempts += 1
        db.session.commit()
        raise AuthError("invalid_verification_code", "Code is invalid or expired", 400)
    record.used_at = now
    user.email_verified_at = now
    db.session.commit()
