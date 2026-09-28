from __future__ import annotations

import json
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from flask import current_app


class EmailDeliveryError(Exception):
    pass


def send_email(to: str, subject: str, body: str, *, html: str | None = None) -> None:
    if current_app.testing:
        current_app.extensions.setdefault("mail_outbox", []).append(
            {"to": to, "subject": subject, "body": body, "html": html}
        )
        return

    config = current_app.config
    api_key = config["BREVO_API_KEY"]
    from_address = config["EMAIL_FROM_ADDRESS"]
    if not api_key or not from_address:
        raise EmailDeliveryError("Email delivery is not configured")

    payload = {
        "sender": {"name": config["EMAIL_FROM_NAME"], "email": from_address},
        "to": [{"email": to}],
        "subject": subject,
        "textContent": body,
    }
    if html:
        payload["htmlContent"] = html
    request = Request(
        "https://api.brevo.com/v3/smtp/email",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "api-key": api_key,
            "Accept": "application/json",
            "Content-Type": "application/json",
            "User-Agent": "CampusCoin/1.0",
        },
        method="POST",
    )
    try:
        with urlopen(request, timeout=10) as response:
            if not 200 <= response.status < 300:
                raise EmailDeliveryError("Email delivery is temporarily unavailable")
    except (HTTPError, URLError, OSError, TimeoutError) as exc:
        raise EmailDeliveryError("Email delivery is temporarily unavailable") from exc
