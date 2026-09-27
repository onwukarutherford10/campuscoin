import io

from PIL import Image

from app.services.exports.renderer import render_report


def sample_report(category_count=2):
    return {
        "period": "monthly",
        "from": "2026-09-01T00:00:00+00:00",
        "to": "2026-10-01T00:00:00+00:00",
        "currency": "NGN",
        "income": "125000.00",
        "expenses": "46250.50",
        "balance": "78749.50",
        "transaction_count": 3,
        "categories": [
            {"type": "expense", "name": f"Category {index}", "amount": "250.50"}
            for index in range(category_count)
        ],
        "recent_activity": [
            {
                "occurred_at": "2026-09-20T11:00:00+00:00",
                "description": "Campus lunch",
                "amount": "250.50",
            }
        ],
    }


def test_pdf_and_image_render_from_same_report():
    report = sample_report()
    pdf = render_report(report, "pdf")
    png = render_report(report, "png")
    assert pdf.startswith(b"%PDF") and len(pdf) > 2000
    with Image.open(io.BytesIO(png)) as image:
        assert image.format == "PNG"
        assert image.width == 1200
        assert image.height >= 800
        assert image.getpixel((0, 0)) == (21, 24, 22)


def test_long_category_list_expands_exports():
    short = sample_report(1)
    long = sample_report(35)
    assert len(render_report(long, "pdf")) > len(render_report(short, "pdf"))
    with Image.open(io.BytesIO(render_report(long, "png"))) as image:
        assert image.height > 2000
