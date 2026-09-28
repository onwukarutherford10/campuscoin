from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from marshmallow import Schema, ValidationError, fields, validate


def validate_timezone(value: str) -> None:
    try:
        ZoneInfo(value)
    except (ZoneInfoNotFoundError, ValueError) as exc:
        raise ValidationError("Enter a valid IANA timezone") from exc


class ProfileUpdateSchema(Schema):
    name = fields.String(validate=validate.Length(min=1, max=120))
    academic_year = fields.String(allow_none=True, validate=validate.Length(max=40))
    allowance_baseline = fields.Decimal(as_string=True, places=2, validate=validate.Range(min=0))
    savings_goal = fields.Decimal(as_string=True, places=2, validate=validate.Range(min=0))
    currency = fields.String(validate=validate.Regexp(r"^[A-Z]{3}$"))
    timezone = fields.String(validate=[validate.Length(min=1, max=64), validate_timezone])
    ai_consent = fields.Boolean()
    income_source_category_ids = fields.List(fields.UUID())
    spending_category_ids = fields.List(fields.UUID())
    onboarding_completed = fields.Boolean()
