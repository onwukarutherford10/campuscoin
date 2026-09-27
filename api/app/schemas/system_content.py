from marshmallow import Schema, fields, validate


class SystemContentCreateSchema(Schema):
    kind = fields.String(required=True, validate=validate.OneOf(["announcement", "tip_template"]))
    title = fields.String(required=True, validate=validate.Length(min=1, max=100))
    body = fields.String(required=True, validate=validate.Length(min=1, max=2000))
    is_active = fields.Boolean(load_default=True)


class SystemContentUpdateSchema(Schema):
    title = fields.String(validate=validate.Length(min=1, max=100))
    body = fields.String(validate=validate.Length(min=1, max=2000))
    is_active = fields.Boolean()
