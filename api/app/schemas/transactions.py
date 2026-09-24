from marshmallow import Schema, fields, validate


class TransactionSchema(Schema):
    category_id = fields.UUID(required=True)
    transaction_type = fields.String(required=True, validate=validate.OneOf(["income", "expense"]))
    amount = fields.Decimal(
        required=True, as_string=True, places=2, validate=validate.Range(min=0.01)
    )
    description = fields.String(required=True, validate=validate.Length(min=1, max=255))
    merchant = fields.String(allow_none=True, validate=validate.Length(max=160))
    occurred_at = fields.DateTime(required=True, format="iso")


class TransactionUpdateSchema(Schema):
    category_id = fields.UUID()
    transaction_type = fields.String(validate=validate.OneOf(["income", "expense"]))
    amount = fields.Decimal(as_string=True, places=2, validate=validate.Range(min=0.01))
    description = fields.String(validate=validate.Length(min=1, max=255))
    merchant = fields.String(allow_none=True, validate=validate.Length(max=160))
    occurred_at = fields.DateTime(format="iso")


class RecurringRuleSchema(Schema):
    category_id = fields.UUID(required=True)
    transaction_type = fields.String(required=True, validate=validate.OneOf(["income", "expense"]))
    amount = fields.Decimal(
        required=True, as_string=True, places=2, validate=validate.Range(min=0.01)
    )
    description = fields.String(required=True, validate=validate.Length(min=1, max=255))
    merchant = fields.String(allow_none=True, validate=validate.Length(max=160))
    frequency = fields.String(
        required=True, validate=validate.OneOf(["daily", "weekly", "monthly"])
    )
    interval = fields.Integer(load_default=1, validate=validate.Range(min=1, max=365))
    next_due_at = fields.DateTime(required=True, format="iso")
    ends_at = fields.DateTime(allow_none=True, format="iso")


class RecurringRuleUpdateSchema(Schema):
    category_id = fields.UUID()
    transaction_type = fields.String(validate=validate.OneOf(["income", "expense"]))
    amount = fields.Decimal(as_string=True, places=2, validate=validate.Range(min=0.01))
    description = fields.String(validate=validate.Length(min=1, max=255))
    merchant = fields.String(allow_none=True, validate=validate.Length(max=160))
    frequency = fields.String(validate=validate.OneOf(["daily", "weekly", "monthly"]))
    interval = fields.Integer(validate=validate.Range(min=1, max=365))
    next_due_at = fields.DateTime(format="iso")
    ends_at = fields.DateTime(allow_none=True, format="iso")
    is_active = fields.Boolean()
