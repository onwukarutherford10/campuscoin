from decimal import Decimal

from sqlalchemy import delete, select

from app.extensions import db
from app.models import (
    Category,
    CategoryType,
    OnboardingCategoryPreference,
    OnboardingPreferenceKind,
    User,
)
from app.services.audit import record_audit
from app.utils.time import utcnow


class ProfileError(Exception):
    def __init__(self, code: str, message: str, status: int = 400):
        self.code = code
        self.message = message
        self.status = status


def _preference_ids(user: User, kind: str) -> list[str]:
    return [
        str(category_id)
        for category_id in db.session.scalars(
            select(OnboardingCategoryPreference.category_id).where(
                OnboardingCategoryPreference.user_id == user.id,
                OnboardingCategoryPreference.kind == kind,
            )
        )
    ]


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
        "onboarding_completed": user.onboarding_completed_at is not None,
        "income_source_category_ids": _preference_ids(user, OnboardingPreferenceKind.INCOME_SOURCE),
        "spending_category_ids": _preference_ids(user, OnboardingPreferenceKind.SPENDING_AREA),
    }
    if include_email:
        data["email"] = user.email
    return data


def update_profile(user: User, changes: dict) -> User:
    income_ids = changes.pop("income_source_category_ids", None)
    spending_ids = changes.pop("spending_category_ids", None)
    complete = changes.pop("onboarding_completed", False)
    for field, value in changes.items():
        setattr(user, field, value.strip() if isinstance(value, str) else value)
    if income_ids is not None:
        _replace_preferences(
            user, income_ids, OnboardingPreferenceKind.INCOME_SOURCE, CategoryType.INCOME
        )
    if spending_ids is not None:
        _replace_preferences(
            user, spending_ids, OnboardingPreferenceKind.SPENDING_AREA, CategoryType.EXPENSE
        )
    if complete:
        db.session.flush()
        if (
            not user.name.strip()
            or not user.academic_year
            or user.allowance_baseline <= Decimal("0")
            or not _preference_ids(user, OnboardingPreferenceKind.INCOME_SOURCE)
            or not _preference_ids(user, OnboardingPreferenceKind.SPENDING_AREA)
        ):
            raise ProfileError(
                "onboarding_incomplete", "Complete all required onboarding steps before finishing"
            )
        user.onboarding_completed_at = user.onboarding_completed_at or utcnow()
    record_audit("user.profile_updated", actor_id=user.id, target_user_id=user.id)
    db.session.commit()
    return user


def _replace_preferences(user: User, category_ids: list, kind: str, category_type: str) -> None:
    unique_ids = list(dict.fromkeys(category_ids))
    categories = list(db.session.scalars(select(Category).where(Category.id.in_(unique_ids))))
    valid = {
        category.id
        for category in categories
        if category.is_active
        and category.category_type == category_type
        and (category.owner_id is None or category.owner_id == user.id)
    }
    if len(valid) != len(unique_ids):
        raise ProfileError(
            "invalid_onboarding_category",
            f"Choose active {category_type} categories available to your account",
        )
    db.session.execute(
        delete(OnboardingCategoryPreference).where(
            OnboardingCategoryPreference.user_id == user.id,
            OnboardingCategoryPreference.kind == kind,
        )
    )
    for category_id in unique_ids:
        db.session.add(
            OnboardingCategoryPreference(user_id=user.id, category_id=category_id, kind=kind)
        )
    db.session.flush()
