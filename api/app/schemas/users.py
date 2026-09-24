from marshmallow import Schema, fields, validate


class ProfileUpdateSchema(Schema):
    name = fields.String(validate=validate.Length(min=1, max=120))
    academic_year = fields.String(allow_none=True, validate=validate.Length(max=40))
    allowance_baseline = fields.Decimal(as_string=True, places=2, validate=validate.Range(min=0))
    savings_goal = fields.Decimal(as_string=True, places=2, validate=validate.Range(min=0))
    currency = fields.String(validate=validate.Regexp(r"^[A-Z]{3}$"))
    timezone = fields.String(validate=validate.Length(min=1, max=64))
    ai_consent = fields.Boolean()
