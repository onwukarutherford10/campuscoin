from flask import Flask
from marshmallow import ValidationError
from werkzeug.exceptions import HTTPException

from app.api.responses import failure


def register_error_handlers(app: Flask) -> None:
    @app.errorhandler(ValidationError)
    def validation_error(error: ValidationError):
        return failure("validation_error", "Request validation failed", fields=error.messages)

    @app.errorhandler(HTTPException)
    def http_error(error: HTTPException):
        return failure(
            error.name.lower().replace(" ", "_"), error.description, status=error.code or 500
        )

    @app.errorhandler(Exception)
    def unexpected_error(error: Exception):
        app.logger.exception("Unhandled request error", exc_info=error)
        return failure("internal_error", "An unexpected error occurred", status=500)
