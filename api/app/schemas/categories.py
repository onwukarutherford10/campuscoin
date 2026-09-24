from marshmallow import Schema, fields, validate


class CategorySchema(Schema):
    name = fields.String(required=True, validate=validate.Length(min=1, max=80))
    category_type = fields.String(required=True, validate=validate.OneOf(["income", "expense"]))
    color = fields.String(allow_none=True, validate=validate.Regexp(r"^#[0-9A-Fa-f]{6}$"))
    icon = fields.String(allow_none=True, validate=validate.Length(max=50))


class CategoryUpdateSchema(Schema):
    name = fields.String(validate=validate.Length(min=1, max=80))
    color = fields.String(allow_none=True, validate=validate.Regexp(r"^#[0-9A-Fa-f]{6}$"))
    icon = fields.String(allow_none=True, validate=validate.Length(max=50))
