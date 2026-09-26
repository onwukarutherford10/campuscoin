import re
import uuid
from datetime import timedelta

from werkzeug.security import generate_password_hash

from app.extensions import db
from app.models import AuditLog, AuthSession, User, UserRole


def csrf(client) -> str:
    return client.get("/api/v1/auth/csrf").get_json()["data"]["csrf_token"]


def post(client, url: str, payload: dict | None = None, token: str | None = None):
    token = token or csrf(client)
    return client.post(url, json=payload or {}, headers={"X-CSRF-Token": token})


def register(client, email: str = "student@example.com"):
    return post(
        client,
        "/api/v1/auth/register",
        {"email": email, "password": "correct-horse-123", "name": "Ada Student"},
    )


def test_csrf_is_required_for_state_changes(client):
    response = client.post("/api/v1/auth/login", json={})
    assert response.status_code == 403
    assert response.get_json()["error"]["code"] == "csrf_failed"


def test_custom_csrf_check_handles_mutations_when_flask_wtf_is_enabled(client):
    client.application.config["WTF_CSRF_ENABLED"] = True
    token = csrf(client)
    response = client.post(
        "/api/v1/auth/register",
        json={"email": "csrf@example.com", "password": "correct-horse-123", "name": "CSRF Student"},
        headers={"X-CSRF-Token": token},
    )
    assert response.status_code == 201
    assert client.get("/api/v1/users/me").status_code == 200


def test_credentialed_cors_allows_configured_frontend_origin(client):
    origin = "http://localhost:5173"
    response = client.get("/api/v1/auth/csrf", headers={"Origin": origin})
    assert response.headers["Access-Control-Allow-Origin"] == origin
    assert response.headers["Access-Control-Allow-Credentials"] == "true"

    preflight = client.options(
        "/api/v1/auth/register",
        headers={
            "Origin": origin,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "Content-Type,X-CSRF-Token",
        },
    )
    assert preflight.status_code == 200
    assert "X-CSRF-Token" in preflight.headers["Access-Control-Allow-Headers"]


def test_registration_profile_and_logout_flow(client, app):
    response = register(client)
    assert response.status_code == 201
    assert response.get_json()["data"]["email"] == "student@example.com"
    assert client.get_cookie("campuscoin_access").http_only is True
    assert client.get_cookie("campuscoin_refresh").http_only is True
    assert client.get_cookie("campuscoin_csrf").http_only is False

    profile = client.get("/api/v1/users/me")
    assert profile.status_code == 200
    token = client.get_cookie("campuscoin_csrf").value
    updated = client.patch(
        "/api/v1/users/me",
        json={
            "academic_year": "Year 3",
            "allowance_baseline": "25000.50",
            "savings_goal": "5000",
            "currency": "NGN",
            "timezone": "Africa/Lagos",
            "ai_consent": True,
        },
        headers={"X-CSRF-Token": token},
    )
    assert updated.status_code == 200
    assert updated.get_json()["data"]["allowance_baseline"] == "25000.50"
    assert updated.get_json()["data"]["ai_consent"] is True

    logged_out = post(client, "/api/v1/auth/logout", token=token)
    assert logged_out.status_code == 200
    assert client.get("/api/v1/users/me").status_code == 401
    with app.app_context():
        assert db.session.query(AuditLog).count() >= 3


def test_email_verification_code_is_emailed_and_required(client):
    client.application.config.update(
        EMAIL_VERIFICATION_REQUIRED=True,
        EMAIL_RESEND_COOLDOWN=timedelta(seconds=0),
    )
    response = register(client, "verify@example.com")
    assert response.status_code == 201
    assert response.get_json()["data"]["email_verified"] is False
    assert response.get_json()["data"]["verification_sent"] is True

    outbox = client.application.extensions["mail_outbox"]
    assert outbox[-1]["to"] == "verify@example.com"
    code = re.search(r"\b(\d{6})\b", outbox[-1]["body"]).group(1)

    blocked = client.get("/api/v1/categories")
    assert blocked.status_code == 403
    assert blocked.get_json()["error"]["code"] == "email_verification_required"
    assert client.get("/api/v1/users/me").status_code == 200

    wrong = post(client, "/api/v1/auth/email/verify", {"code": "000000"})
    assert wrong.status_code == 400
    verified = post(client, "/api/v1/auth/email/verify", {"code": code})
    assert verified.status_code == 200
    assert verified.get_json()["data"]["email_verified"] is True
    assert client.get("/api/v1/categories").status_code == 200


def test_email_verification_resend_invalidates_previous_code(client, monkeypatch):
    codes = iter([123456, 654321])
    monkeypatch.setattr(
        "app.services.email.verification.secrets.randbelow", lambda _limit: next(codes)
    )
    client.application.config.update(
        EMAIL_VERIFICATION_REQUIRED=True,
        EMAIL_RESEND_COOLDOWN=timedelta(seconds=0),
    )
    register(client, "resend@example.com")
    first = re.search(
        r"\b(\d{6})\b", client.application.extensions["mail_outbox"][-1]["body"]
    ).group(1)
    resent = post(client, "/api/v1/auth/email/resend")
    assert resent.status_code == 200
    second = re.search(
        r"\b(\d{6})\b", client.application.extensions["mail_outbox"][-1]["body"]
    ).group(1)
    assert post(client, "/api/v1/auth/email/verify", {"code": first}).status_code == 400
    assert post(client, "/api/v1/auth/email/verify", {"code": second}).status_code == 200


def test_login_rotation_and_reuse_rejection(client):
    register(client)
    post(client, "/api/v1/auth/logout", token=client.get_cookie("campuscoin_csrf").value)

    bad = post(
        client,
        "/api/v1/auth/login",
        {"email": "student@example.com", "password": "wrong"},
    )
    assert bad.status_code == 401

    login = post(
        client,
        "/api/v1/auth/login",
        {"email": "student@example.com", "password": "correct-horse-123"},
    )
    assert login.status_code == 200
    old_refresh = client.get_cookie("campuscoin_refresh").value
    token = client.get_cookie("campuscoin_csrf").value
    refreshed = post(client, "/api/v1/auth/refresh", token=token)
    assert refreshed.status_code == 200
    assert client.get_cookie("campuscoin_refresh").value != old_refresh

    client.set_cookie("campuscoin_refresh", old_refresh)
    reused = post(
        client,
        "/api/v1/auth/refresh",
        token=client.get_cookie("campuscoin_csrf").value,
    )
    assert reused.status_code == 401
    assert reused.get_json()["error"]["code"] == "invalid_refresh_token"


def test_password_reset_is_single_use_and_revokes_sessions(client):
    register(client)
    response = post(client, "/api/v1/auth/password/forgot", {"email": "student@example.com"})
    token = response.get_json()["meta"]["reset_token"]
    reset = post(
        client,
        "/api/v1/auth/password/reset",
        {"token": token, "password": "new-secure-password"},
    )
    assert reset.status_code == 200
    assert client.get("/api/v1/users/me").status_code == 401
    reused = post(
        client,
        "/api/v1/auth/password/reset",
        {"token": token, "password": "another-password"},
    )
    assert reused.status_code == 400

    logged_in = post(
        client,
        "/api/v1/auth/login",
        {"email": "student@example.com", "password": "new-secure-password"},
    )
    assert logged_in.status_code == 200


def test_admin_login_rejects_student(client):
    register(client)
    response = post(
        client,
        "/api/v1/admin/login",
        {"email": "student@example.com", "password": "correct-horse-123"},
    )
    assert response.status_code == 403


def make_admin(app, email="admin@example.com"):
    with app.app_context():
        admin = User(
            email=email,
            password_hash=generate_password_hash("administrator-123"),
            name="Admin",
            role=UserRole.ADMIN,
        )
        db.session.add(admin)
        db.session.commit()
        return str(admin.id)


def admin_login(client):
    return post(
        client,
        "/api/v1/admin/login",
        {"email": "admin@example.com", "password": "administrator-123"},
    )


def test_admin_can_view_disable_and_immediately_revoke_user(app):
    student_client = app.test_client()
    admin_client = app.test_client()
    register(student_client)
    make_admin(app)
    assert admin_login(admin_client).status_code == 200

    users = admin_client.get("/api/v1/admin/users")
    student = next(item for item in users.get_json()["data"] if item["role"] == "student")
    assert admin_client.get(f"/api/v1/admin/users/{student['id']}").status_code == 200
    disabled = post(admin_client, f"/api/v1/admin/users/{student['id']}/disable")
    assert disabled.status_code == 200
    assert student_client.get("/api/v1/users/me").status_code == 403

    with app.app_context():
        sessions = db.session.query(AuthSession).filter_by(user_id=uuid.UUID(student["id"])).all()
        assert sessions and all(session.revoked_at is not None for session in sessions)
