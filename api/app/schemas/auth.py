from marshmallow import Schema, fields, validate


class RegistrationSchema(Schema):
    email = fields.Email(required=True)
    password = fields.String(required=True, validate=validate.Length(min=10, max=128))
    name = fields.String(required=True, validate=validate.Length(min=1, max=120))


class LoginSchema(Schema):
    email = fields.Email(required=True)
    password = fields.String(required=True, validate=validate.Length(min=1, max=128))


class ForgotPasswordSchema(Schema):
    email = fields.Email(required=True)


class ResetPasswordSchema(Schema):
    token = fields.String()
    email = fields.Email()
    code = fields.String(validate=validate.Regexp(r"^[0-9]{6}$"))
    password = fields.String(required=True, validate=validate.Length(min=10, max=128))


class VerifyResetCodeSchema(Schema):
    email = fields.Email(required=True)
    code = fields.String(required=True, validate=validate.Regexp(r"^[0-9]{6}$"))


class VerifyEmailSchema(Schema):
    code = fields.String(required=True, validate=validate.Regexp(r"^[0-9]{6}$"))
