import json
from urllib.error import HTTPError

import pytest

from app.services.email.sender import EmailDeliveryError, send_email


class FakeResponse:
    status = 200

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return False


def test_brevo_request_contains_plain_and_html_messages(app, monkeypatch):
    captured = {}

    def fake_urlopen(request, timeout):
        captured["request"] = request
        captured["timeout"] = timeout
        return FakeResponse()

    monkeypatch.setattr("app.services.email.sender.urlopen", fake_urlopen)
    app.config.update(
        TESTING=False,
        BREVO_API_KEY="xkeysib-test-key",
        EMAIL_FROM_ADDRESS="hello@example.com",
        EMAIL_FROM_NAME="Campus Coin",
    )

    with app.app_context():
        send_email("student@example.com", "Your code", "Code: 123456", html="<b>123456</b>")

    request = captured["request"]
    payload = json.loads(request.data)
    assert request.full_url == "https://api.brevo.com/v3/smtp/email"
    assert request.get_header("Api-key") == "xkeysib-test-key"
    assert captured["timeout"] == 10
    assert payload == {
        "sender": {"name": "Campus Coin", "email": "hello@example.com"},
        "to": [{"email": "student@example.com"}],
        "subject": "Your code",
        "textContent": "Code: 123456",
        "htmlContent": "<b>123456</b>",
    }


def test_brevo_http_failure_is_reported_as_delivery_error(app, monkeypatch):
    def fail_request(_request, *, timeout):
        assert timeout == 10
        raise HTTPError("https://api.brevo.com/v3/smtp/email", 400, "invalid sender", {}, None)

    monkeypatch.setattr("app.services.email.sender.urlopen", fail_request)
    app.config.update(
        TESTING=False,
        BREVO_API_KEY="xkeysib-test-key",
        EMAIL_FROM_ADDRESS="bad@example.com",
    )

    with app.app_context(), pytest.raises(EmailDeliveryError, match="temporarily unavailable"):
        send_email("student@example.com", "Your code", "Code: 123456")
