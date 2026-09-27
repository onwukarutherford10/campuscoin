from flask import Blueprint, current_app, g, request

from app.api.responses import failure, success
from app.schemas.auth import (
    ForgotPasswordSchema,
    LoginSchema,
    RegistrationSchema,
    ResetPasswordSchema,
    VerifyEmailSchema,
)
from app.services.auth import AuthService, TokenPair
from app.services.email.sender import EmailDeliveryError, send_email
from app.services.email.verification import send_verification_code, verify_email_code
from app.services.rate_limit import check_rate_limit
from app.utils.security import auth_required

auth = Blueprint("auth", __name__)


def _set_auth_cookies(response, tokens: TokenPair) -> None:
    settings = {
        "secure": current_app.config["COOKIE_SECURE"],
        "samesite": current_app.config["COOKIE_SAMESITE"],
        "path": "/",
    }
    response.set_cookie(
        current_app.config["ACCESS_COOKIE_NAME"],
        tokens.access,
        httponly=True,
        max_age=int(current_app.config["ACCESS_TOKEN_TTL"].total_seconds()),
        **settings,
    )
    response.set_cookie(
        current_app.config["REFRESH_COOKIE_NAME"],
        tokens.refresh,
        httponly=True,
        max_age=int(current_app.config["REFRESH_TOKEN_TTL"].total_seconds()),
        **settings,
    )
    response.set_cookie(
        current_app.config["CSRF_COOKIE_NAME"],
        tokens.csrf,
        httponly=False,
        max_age=int(current_app.config["REFRESH_TOKEN_TTL"].total_seconds()),
        **settings,
    )


def _clear_auth_cookies(response) -> None:
    for name in (
        current_app.config["ACCESS_COOKIE_NAME"],
        current_app.config["REFRESH_COOKIE_NAME"],
        current_app.config["CSRF_COOKIE_NAME"],
    ):
        response.delete_cookie(name, path="/")


@auth.get("/csrf")
def csrf_token():
    import secrets

    token = secrets.token_urlsafe(32)
    response, status = success({"csrf_token": token})
    response.set_cookie(
        current_app.config["CSRF_COOKIE_NAME"],
        token,
        httponly=False,
        secure=current_app.config["COOKIE_SECURE"],
        samesite=current_app.config["COOKIE_SAMESITE"],
        path="/",
    )
    return response, status


@auth.post("/register")
def register():
    payload = RegistrationSchema().load(request.get_json(silent=True) or {})
    check_rate_limit("register", request.remote_addr or "unknown")
    service = AuthService()
    user = service.register(**payload)
    tokens = service.issue_tokens(
        user, ip_address=request.remote_addr, user_agent=request.headers.get("User-Agent")
    )
    verification_sent = False
    if current_app.config["EMAIL_VERIFICATION_REQUIRED"]:
        try:
            send_verification_code(user)
            verification_sent = True
        except EmailDeliveryError:
            current_app.logger.warning("Verification email could not be delivered")
    response, status = success(
        {**_user_summary(user), "verification_sent": verification_sent}, status=201
    )
    _set_auth_cookies(response, tokens)
    return response, status


@auth.post("/login")
def login():
    payload = LoginSchema().load(request.get_json(silent=True) or {})
    check_rate_limit("login", f"{request.remote_addr}:{payload['email'].lower()}")
    service = AuthService()
    user = service.authenticate(**payload)
    tokens = service.issue_tokens(
        user, ip_address=request.remote_addr, user_agent=request.headers.get("User-Agent")
    )
    response, status = success(_user_summary(user))
    _set_auth_cookies(response, tokens)
    return response, status


@auth.post("/refresh")
def refresh():
    raw_refresh = request.cookies.get(current_app.config["REFRESH_COOKIE_NAME"], "")
    user, tokens = AuthService().rotate(raw_refresh)
    response, status = success(_user_summary(user))
    _set_auth_cookies(response, tokens)
    return response, status


@auth.post("/logout")
@auth_required(allow_unverified=True)
def logout():
    from flask import g

    AuthService().revoke(g.auth_session, g.current_user)
    response, status = success({"logged_out": True})
    _clear_auth_cookies(response)
    return response, status


@auth.post("/password/forgot")
def forgot_password():
    payload = ForgotPasswordSchema().load(request.get_json(silent=True) or {})
    check_rate_limit("forgot_password", f"{request.remote_addr}:{payload['email'].lower()}")
    token = AuthService().create_password_reset(payload["email"])
    if token:
        link = f"{current_app.config['FRONTEND_BASE_URL'].rstrip('/')}/resetpassword?token={token}"
        try:
            send_email(
                payload["email"],
                "Reset your CampusCoin password",
                f"Use this link to reset your password: {link}\n"
                "If you did not request this, ignore this message.",
            )
        except EmailDeliveryError:
            current_app.logger.warning("Password reset email could not be delivered")
    meta = {"reset_token": token} if current_app.testing and token else None
    return success(
        {"message": "If the account exists, password reset instructions have been issued."},
        meta=meta,
    )


@auth.post("/password/reset")
def reset_password():
    payload = ResetPasswordSchema().load(request.get_json(silent=True) or {})
    check_rate_limit("reset_password", request.remote_addr or "unknown")
    AuthService().reset_password(**payload)
    return success({"password_reset": True})


@auth.post("/email/resend")
@auth_required(allow_unverified=True)
def resend_email_code():
    check_rate_limit("email_resend", f"{g.current_user.id}:{request.remote_addr}")
    try:
        send_verification_code(g.current_user)
    except EmailDeliveryError as exc:
        return failure("email_unavailable", str(exc), status=503)
    return success({"verification_sent": True})


@auth.post("/email/verify")
@auth_required(allow_unverified=True)
def verify_email():
    check_rate_limit("email_verify", str(g.current_user.id))
    values = VerifyEmailSchema().load(request.get_json(silent=True) or {})
    verify_email_code(g.current_user, values["code"])
    return success(_user_summary(g.current_user))


def _user_summary(user) -> dict:
    return {
        "id": str(user.id),
        "email": user.email,
        "name": user.name,
        "role": user.role,
        "email_verified": user.email_verified_at is not None,
    }
