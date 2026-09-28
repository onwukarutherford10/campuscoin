from marshmallow import Schema, fields, validate


class SuggestionSchema(Schema):
    transaction_type = fields.String(required=True, validate=validate.OneOf(["income", "expense"]))
    description = fields.String(required=True, validate=validate.Length(min=1, max=255))
    merchant = fields.String(load_default="", validate=validate.Length(max=160))


class BatchSuggestionSchema(Schema):
    items = fields.List(
        fields.Nested(SuggestionSchema), required=True, validate=validate.Length(min=1, max=20)
    )


class SuggestionFeedbackSchema(SuggestionSchema):
    category_id = fields.UUID(required=True)
    suggested_category_id = fields.UUID(load_default=None, allow_none=True)
