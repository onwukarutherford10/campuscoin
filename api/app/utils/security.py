from __future__ import annotations

import secrets
from functools import wraps

from flask import Blueprint, current_app, g, request

from app.api.responses import failure
from app.services.auth import AuthError, AuthService


def init_api_security(app, api_blueprint: Blueprint) -> None:
    @app.before_request
    def verify_csrf():
        if (
            request.blueprint is None
            or not request.blueprint.startswith(api_blueprint.name)
            or request.method not in {"POST", "PUT", "PATCH", "DELETE"}
        ):
            return None
        cookie_token = request.cookies.get(current_app.config["CSRF_COOKIE_NAME"], "")
        header_token = request.headers.get("X-CSRF-Token", "")
        if not cookie_token or not secrets.compare_digest(cookie_token, header_token):
            return failure("csrf_failed", "CSRF token is missing or invalid", status=403)
        return None


def auth_required(*, admin: bool = False, allow_unverified: bool = False):
    def decorator(view):
        @wraps(view)
        def wrapped(*args, **kwargs):
            token = request.cookies.get(current_app.config["ACCESS_COOKIE_NAME"])
            if not token:
                return failure("authentication_required", "Authentication is required", status=401)
            try:
                user, session = AuthService().resolve_access(token)
            except AuthError as error:
                return failure(error.code, error.message, status=error.status)
            if admin and user.role != "admin":
                return failure("admin_required", "Administrator access required", status=403)
            if (
                current_app.config["EMAIL_VERIFICATION_REQUIRED"]
                and not allow_unverified
                and user.role != "admin"
                and user.email_verified_at is None
            ):
                return failure(
                    "email_verification_required", "Verify your email to continue", status=403
                )
            g.current_user = user
            g.auth_session = session
            return view(*args, **kwargs)

        return wrapped

    return decorator
