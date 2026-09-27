import re
from datetime import timedelta

from app.extensions import db
from app.models import PasswordResetToken
from app.utils.time import utcnow
from tests.integration.test_auth import post, register


def test_otp_emails_have_branded_html_and_plain_fallback(client):
    client.application.config["EMAIL_VERIFICATION_REQUIRED"] = True
    register(client)
    verification = client.application.extensions["mail_outbox"][0]
    assert "Campus Coin" in verification["subject"]
    assert "one-time code" in verification["body"]
    assert "Campus Coin" in verification["html"]
    assert "#269953" in verification["html"]

    response = post(client, "/api/v1/auth/password/forgot", {"email": "student@example.com"})
    assert response.status_code == 200
    code = response.get_json()["meta"]["reset_code"]
    assert re.fullmatch(r"[0-9]{6}", code)
    reset_mail = client.application.extensions["mail_outbox"][-1]
    assert code in reset_mail["body"] and code in reset_mail["html"]
    assert "reset" in reset_mail["subject"].lower()
    assert "<table" in reset_mail["html"]
    assert "token=" not in reset_mail["body"]
    assert "http://" not in reset_mail["body"]
    assert "https://" not in reset_mail["body"]
    assert "http://" not in reset_mail["html"]
    assert "https://" not in reset_mail["html"]
    with client.application.app_context():
        record = db.session.query(PasswordResetToken).first()
        assert code not in record.token_hash


def test_reset_code_retries_cooldown_and_account_enumeration(client):
    register(client)
    first = post(client, "/api/v1/auth/password/forgot", {"email": "student@example.com"})
    code = first.get_json()["meta"]["reset_code"]
    outbox_count = len(client.application.extensions["mail_outbox"])
    repeated = post(client, "/api/v1/auth/password/forgot", {"email": "student@example.com"})
    assert repeated.status_code == 200
    assert "reset_code" not in repeated.get_json()["meta"]
    assert len(client.application.extensions["mail_outbox"]) == outbox_count
    missing = post(client, "/api/v1/auth/password/forgot", {"email": "missing@example.com"})
    assert missing.status_code == 200
    assert missing.get_json()["data"] == first.get_json()["data"]

    for _ in range(client.application.config["PASSWORD_RESET_CODE_MAX_ATTEMPTS"]):
        assert (
            post(
                client,
                "/api/v1/auth/password/reset",
                {
                    "email": "student@example.com",
                    "code": "999999" if code != "999999" else "888888",
                    "password": "new-secure-password",
                },
            ).status_code
            == 400
        )
    locked = post(
        client,
        "/api/v1/auth/password/reset",
        {
            "email": "student@example.com",
            "code": code,
            "password": "new-secure-password",
        },
    )
    assert locked.status_code == 429


def test_reset_code_expiry_and_resend_invalidate_old_code(client, monkeypatch):
    codes = iter((123456, 654321))
    monkeypatch.setattr("app.services.auth.secrets.randbelow", lambda _limit: next(codes))
    register(client)
    first = post(client, "/api/v1/auth/password/forgot", {"email": "student@example.com"})
    first_code = first.get_json()["meta"]["reset_code"]
    client.application.config["PASSWORD_RESET_RESEND_COOLDOWN"] = timedelta(0)
    second = post(client, "/api/v1/auth/password/forgot", {"email": "student@example.com"})
    second_code = second.get_json()["meta"]["reset_code"]
    assert (
        post(
            client,
            "/api/v1/auth/password/reset",
            {
                "email": "student@example.com",
                "code": first_code,
                "password": "new-secure-password",
            },
        ).status_code
        == 400
    )
    with client.application.app_context():
        latest = (
            db.session.query(PasswordResetToken)
            .filter(PasswordResetToken.used_at.is_(None))
            .first()
        )
        latest.expires_at = utcnow() - timedelta(seconds=1)
        db.session.commit()
    assert (
        post(
            client,
            "/api/v1/auth/password/reset",
            {
                "email": "student@example.com",
                "code": second_code,
                "password": "new-secure-password",
            },
        ).status_code
        == 400
    )
