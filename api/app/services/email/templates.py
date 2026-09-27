"""Accessible, email-client-safe Campus Coin one-time-code messages."""

# ruff: noqa: E501 -- Keep table-based email HTML readable in source.

from html import escape


def otp_message(kind: str, code: str, minutes: int) -> tuple[str, str, str]:
    if kind == "verify":
        subject = "Verify your Campus Coin email"
        heading = "One last step."
        intro = "Use this code to verify your email and finish setting up Campus Coin."
        note = "If you did not create a Campus Coin account, you can ignore this email."
    elif kind == "reset":
        subject = "Reset your Campus Coin password"
        heading = "Let's get you back in."
        intro = "Enter this code on the password reset page to choose a new password."
        note = "If you did not request a password reset, ignore this email. Your password has not changed."
    else:
        raise ValueError("Unknown OTP email kind")

    plain = (
        f"Campus Coin — {heading}\n\n{intro}\n\n"
        f"Your one-time code: {code}\n\n"
        f"This code expires in {minutes} minutes and can only be used once.\n"
        f"{note}\n\nSmart spending, student style.\n"
    )
    html = f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark"><title>{escape(subject)}</title>
<style>@media (prefers-color-scheme:dark) {{ body {{ background:#101411 !important; }}
.card {{ background:#1c2420 !important; color:#f0f5f1 !important; }}
.muted {{ color:#b8c8bc !important; }} .code {{ background:#163c27 !important; color:#b5f2c8 !important; }} }}</style>
</head><body style="margin:0;padding:32px 12px;background:#f4f5f4;font-family:Arial,Helvetica,sans-serif;color:#141615;">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr><td align="center">
<table role="presentation" class="card" cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;background:#ffffff;border-radius:20px;color:#141615;">
<tr><td style="height:6px;background:#269953;border-radius:20px 20px 0 0;"></td></tr>
<tr><td style="padding:30px 32px 8px;"><span style="font-size:18px;font-weight:800;letter-spacing:-0.5px;">Campus <span style="color:#269953;">Coin</span></span></td></tr>
<tr><td style="padding:14px 32px 0;"><h1 style="font-size:26px;line-height:1.2;letter-spacing:-0.6px;margin:0;">{escape(heading)}</h1></td></tr>
<tr><td class="muted" style="padding:14px 32px 0;color:#56625a;font-size:15px;line-height:1.6;">{escape(intro)}</td></tr>
<tr><td style="padding:26px 32px 0;"><div class="code" style="border-radius:14px;background:#e7f7ee;color:#1c703e;padding:20px;text-align:center;font-size:32px;font-weight:800;letter-spacing:9px;font-variant-numeric:tabular-nums;">{escape(code)}</div></td></tr>
<tr><td class="muted" style="padding:17px 32px 0;color:#56625a;font-size:13px;line-height:1.6;">Expires in {minutes} minutes · One use only</td></tr>
<tr><td class="muted" style="padding:23px 32px 30px;color:#56625a;font-size:13px;line-height:1.6;">{escape(note)}</td></tr>
<tr><td style="padding:18px 32px;border-top:1px solid #e4e9e5;color:#718076;font-size:12px;">Smart spending, student style. <strong>Campus Coin</strong></td></tr>
</table></td></tr></table></body></html>"""
    return subject, plain, html
