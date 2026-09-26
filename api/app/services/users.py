from app.extensions import db
from app.models import User
from app.services.audit import record_audit


def serialize_user(user: User, *, include_email: bool = True) -> dict:
    data = {
        "id": str(user.id),
        "name": user.name,
        "academic_year": user.academic_year,
        "allowance_baseline": str(user.allowance_baseline),
        "savings_goal": str(user.savings_goal),
        "currency": user.currency,
        "timezone": user.timezone,
        "ai_consent": user.ai_consent,
        "role": user.role,
        "is_active": user.is_active,
        "email_verified": user.email_verified_at is not None,
    }
    if include_email:
        data["email"] = user.email
    return data


def update_profile(user: User, changes: dict) -> User:
    for field, value in changes.items():
        setattr(user, field, value.strip() if isinstance(value, str) else value)
    record_audit("user.profile_updated", actor_id=user.id, target_user_id=user.id)
    db.session.commit()
    return user
