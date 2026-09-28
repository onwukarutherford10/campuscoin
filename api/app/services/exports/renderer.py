"""Branded, deterministic report exports using the same ledger snapshot."""

import io
from datetime import datetime
from decimal import Decimal
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont
from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas

INK = "#151816"
GREEN = "#269953"
MINT = "#A8EDBE"
MUTED = "#637168"
PALE = "#EAF7EF"
LINE = "#E3E9E5"


def _money(value, currency):
    amount = Decimal(str(value)).quantize(Decimal("0.01"))
    return f"{currency} {amount:,.2f}"


def _period(report):
    start = datetime.fromisoformat(report["from"]).strftime("%d %b %Y")
    end = datetime.fromisoformat(report["to"]).strftime("%d %b %Y")
    return f"{start} - {end}"


def _categories(report):
    return list(report["categories"])


def render_report(report, format):
    if format == "pdf":
        return _pdf(report)
    if format == "png":
        return _png(report)
    raise ValueError("Unsupported export format")


def _pdf(report):
    output = io.BytesIO()
    page = canvas.Canvas(output, pagesize=A4)
    width, height = A4
    left, right = 44, width - 44
    y = height
    page_number = 1

    def footer():
        page.setStrokeColor(HexColor(LINE))
        page.line(left, 39, right, 39)
        page.setFont("Helvetica", 8)
        page.setFillColor(HexColor(MUTED))
        page.drawString(left, 25, "Campus Coin  /  Personal finance report")
        page.drawRightString(right, 25, f"Page {page_number}")

    def next_page():
        nonlocal y, page_number
        footer()
        page.showPage()
        page_number += 1
        y = height - 58
        page.setFillColor(HexColor("#FFFFFF"))
        page.rect(0, 0, width, height, fill=1, stroke=0)

    page.setFillColor(HexColor("#FFFFFF"))
    page.rect(0, 0, width, height, fill=1, stroke=0)
    page.setFillColor(HexColor(INK))
    page.rect(0, height - 183, width, 183, fill=1, stroke=0)
    page.setFillColor(HexColor(MINT))
    page.setFont("Helvetica-Bold", 12)
    page.drawString(left, height - 49, "CAMPUS COIN")
    page.setFillColor(HexColor("#FFFFFF"))
    page.setFont("Helvetica-Bold", 27)
    page.drawString(left, height - 95, "Your money, clearly.")
    page.setFont("Helvetica", 11)
    page.setFillColor(HexColor("#D4DED7"))
    page.drawString(left, height - 123, _period(report))
    page.drawString(left, height - 145, f"{report['period'].replace('_', ' ').title()} report")
    page.drawRightString(right, height - 145, f"{report['transaction_count']} transactions")
    y = height - 211

    stats = [
        ("INCOME", report["income"]),
        ("EXPENSES", report["expenses"]),
        ("NET BALANCE", report["balance"]),
    ]
    gap = 10
    card_width = (right - left - 2 * gap) / 3
    for index, (label, amount) in enumerate(stats):
        x = left + index * (card_width + gap)
        page.setFillColor(HexColor(PALE if index == 2 else "#F5F7F5"))
        page.roundRect(x, y - 77, card_width, 77, 11, fill=1, stroke=0)
        page.setFillColor(HexColor(MUTED))
        page.setFont("Helvetica-Bold", 8)
        page.drawString(x + 13, y - 23, label)
        page.setFillColor(HexColor(GREEN if index == 2 else INK))
        page.setFont("Helvetica-Bold", 14)
        page.drawString(x + 13, y - 50, _money(amount, report["currency"]))
    y -= 113

    def section(title):
        nonlocal y
        if y < 100:
            next_page()
        page.setFillColor(HexColor(INK))
        page.setFont("Helvetica-Bold", 15)
        page.drawString(left, y, title)
        y -= 22

    section("Category breakdown")
    categories = _categories(report)
    if not categories:
        page.setFillColor(HexColor(MUTED))
        page.setFont("Helvetica", 10)
        page.drawString(left, y - 12, "No activity in this period.")
        y -= 42
    else:
        largest = max(Decimal(item["amount"]) for item in categories)
        for item in categories:
            if y < 94:
                next_page()
            amount = Decimal(item["amount"])
            label = f"{item['type'].title()}  /  {item['name']}"
            page.setFont("Helvetica", 10)
            page.setFillColor(HexColor(INK))
            page.drawString(left, y, label[:56])
            page.setFont("Helvetica-Bold", 10)
            page.drawRightString(right, y, _money(amount, report["currency"]))
            page.setFillColor(HexColor(LINE))
            page.roundRect(left, y - 12, right - left, 4, 2, fill=1, stroke=0)
            page.setFillColor(HexColor(GREEN))
            page.roundRect(
                left, y - 12, float(amount / largest) * (right - left), 4, 2, fill=1, stroke=0
            )
            y -= 34

    y -= 16
    section("Recent activity")
    activity = report.get("recent_activity", [])
    if not activity:
        page.setFont("Helvetica", 10)
        page.setFillColor(HexColor(MUTED))
        page.drawString(left, y - 10, "No transactions to show.")
    for item in activity:
        if y < 75:
            next_page()
        day = datetime.fromisoformat(item["occurred_at"]).strftime("%d %b")
        page.setFont("Helvetica", 9)
        page.setFillColor(HexColor(MUTED))
        page.drawString(left, y, day)
        page.setFillColor(HexColor(INK))
        page.drawString(left + 59, y, item["description"][:58])
        page.setFont("Helvetica-Bold", 9)
        page.drawRightString(right, y, _money(item["amount"], report["currency"]))
        page.setStrokeColor(HexColor(LINE))
        page.line(left, y - 10, right, y - 10)
        y -= 29
    footer()
    page.save()
    return output.getvalue()


def _png(report):
    categories = _categories(report)
    activity = report.get("recent_activity", [])
    width = 1200
    height = 690 + max(1, len(categories)) * 57 + max(1, len(activity)) * 48
    image = Image.new("RGB", (width, height), "#FFFFFF")
    draw = ImageDraw.Draw(image)
    font_path = next(
        (
            str(path)
            for path in (
                Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"),
                Path("/System/Library/Fonts/Supplemental/Arial.ttf"),
            )
            if path.exists()
        ),
        None,
    )
    bold_path = next(
        (
            str(path)
            for path in (
                Path("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"),
                Path("/System/Library/Fonts/Supplemental/Arial Bold.ttf"),
            )
            if path.exists()
        ),
        None,
    )

    def font(size, bold=False):
        path = (bold_path if bold else font_path) or font_path
        if path is None:
            return ImageFont.load_default(size=size)
        try:
            return ImageFont.truetype(path, size)
        except OSError:
            return ImageFont.load_default(size=size)

    def right_text(x, y, value, *, size=23, color=INK, bold=False):
        face = font(size, bold)
        box = draw.textbbox((0, 0), value, font=face)
        draw.text((x - (box[2] - box[0]), y), value, fill=color, font=face)

    draw.rectangle((0, 0, width, 260), fill=INK)
    draw.text((58, 45), "CAMPUS COIN", fill=MINT, font=font(24, True))
    draw.text((58, 104), "Your money, clearly.", fill="white", font=font(50, True))
    draw.text((58, 185), _period(report), fill="#D4DED7", font=font(24))
    right_text(1142, 191, f"{report['transaction_count']} transactions", size=20, color="#D4DED7")
    for index, (label, value) in enumerate(
        (
            ("INCOME", report["income"]),
            ("EXPENSES", report["expenses"]),
            ("NET BALANCE", report["balance"]),
        )
    ):
        x = 58 + index * 367
        draw.rounded_rectangle(
            (x, 292, x + 345, 414), radius=16, fill=PALE if index == 2 else "#F5F7F5"
        )
        draw.text((x + 22, 318), label, fill=MUTED, font=font(17, True))
        draw.text(
            (x + 22, 357),
            _money(value, report["currency"]),
            fill=GREEN if index == 2 else INK,
            font=font(27, True),
        )

    y = 467
    draw.text((58, y), "Category breakdown", fill=INK, font=font(30, True))
    y += 62
    largest = max((Decimal(item["amount"]) for item in categories), default=Decimal("1"))
    if not categories:
        draw.text((58, y), "No activity in this period.", fill=MUTED, font=font(21))
        y += 57
    for item in categories:
        label = f"{item['type'].title()} / {item['name']}"
        draw.text((58, y), label[:54], fill=INK, font=font(21))
        right_text(1142, y, _money(item["amount"], report["currency"]), size=21, bold=True)
        draw.rounded_rectangle((58, y + 35, 1142, y + 42), radius=3, fill=LINE)
        bar = int(Decimal(item["amount"]) / largest * Decimal("1084"))
        draw.rounded_rectangle((58, y + 35, 58 + max(bar, 7), y + 42), radius=3, fill=GREEN)
        y += 57
    y += 32
    draw.text((58, y), "Recent activity", fill=INK, font=font(30, True))
    y += 54
    if not activity:
        draw.text((58, y), "No transactions to show.", fill=MUTED, font=font(21))
    for item in activity:
        day = datetime.fromisoformat(item["occurred_at"]).strftime("%d %b")
        draw.text((58, y), day, fill=MUTED, font=font(20))
        draw.text((180, y), item["description"][:58], fill=INK, font=font(20))
        right_text(1142, y, _money(item["amount"], report["currency"]), size=20, bold=True)
        draw.line((58, y + 34, 1142, y + 34), fill=LINE, width=1)
        y += 48
    draw.line((58, height - 65, 1142, height - 65), fill=LINE, width=1)
    draw.text(
        (58, height - 49), "Campus Coin  /  Personal finance report", fill=MUTED, font=font(17)
    )
    output = io.BytesIO()
    image.save(output, format="PNG")
    return output.getvalue()
