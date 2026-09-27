from __future__ import annotations

import smtplib
from email.message import EmailMessage

from flask import current_app


class EmailDeliveryError(Exception):
    pass


def send_email(to: str, subject: str, body: str) -> None:
    if current_app.testing:
        current_app.extensions.setdefault("mail_outbox", []).append(
            {"to": to, "subject": subject, "body": body}
        )
        return

    config = current_app.config
    username = config["SMTP_USERNAME"]
    password = config["SMTP_APP_PASSWORD"]
    if not username or not password:
        raise EmailDeliveryError("Email delivery is not configured")

    message = EmailMessage()
    message["From"] = config["SMTP_FROM"] or username
    message["To"] = to
    message["Subject"] = subject
    message.set_content(body)
    try:
        with smtplib.SMTP_SSL(config["SMTP_HOST"], config["SMTP_PORT"], timeout=10) as smtp:
            smtp.login(username, password)
            smtp.send_message(message)
    except (OSError, smtplib.SMTPException) as exc:
        raise EmailDeliveryError("Email delivery is temporarily unavailable") from exc
