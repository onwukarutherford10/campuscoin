from datetime import UTC, datetime, timedelta
from urllib.parse import urlencode

from app.extensions import db
from app.models import Job, JobStatus
from app.services.reports import ReportService
from tests.integration.test_auth import csrf, post, register
from tests.integration.test_transactions import make_category, make_transaction


def test_budgets_dashboard_alerts_tips_and_tenant_isolation(app):
    first, second = app.test_client(), app.test_client()
    register(first, "phase4-first@example.com")
    register(second, "phase4-second@example.com")
    category = make_category(first)
    now = datetime.now(UTC)
    created = post(
        first,
        "/api/v1/budgets",
        {"category_id": category, "year": now.year, "month": now.month, "amount": "20.00"},
    )
    assert created.status_code == 201, created.get_json()
    budget_id = created.get_json()["data"]["id"]
    assert second.get(f"/api/v1/budgets/{budget_id}").status_code == 404
    assert (
        second.delete(
            f"/api/v1/budgets/{budget_id}", headers={"X-CSRF-Token": csrf(second)}
        ).status_code
        == 404
    )
    made = make_transaction(first, category, occurred_at=now.isoformat())
    assert made.status_code == 201
    budgets = first.get("/api/v1/budgets").get_json()["data"]
    assert budgets[0]["spent"] == "25.50"
    assert budgets[0]["status"] == "exceeded"
    dashboard = first.get("/api/v1/dashboard").get_json()["data"]
    assert dashboard["expenses"] == "25.50"
    assert dashboard["balance"] == "-25.50"
    assert dashboard["alerts"] and dashboard["tips"]
    assert len(first.get("/api/v1/notifications").get_json()["data"]) == 1
    assert len(first.get("/api/v1/budgets").get_json()["data"]) == 1
    assert len(first.get("/api/v1/notifications").get_json()["data"]) == 1
    alert = dashboard["alerts"][0]["id"]
    assert post(first, f"/api/v1/notifications/{alert}/read", {}).status_code == 200
    assert post(first, f"/api/v1/notifications/{alert}/dismiss", {}).status_code == 200
    assert second.get("/api/v1/notifications").get_json()["data"] == []
    key = dashboard["tips"][0]["key"]
    assert post(first, f"/api/v1/tips/{key}/pin", {}).get_json()["data"]["pinned"]
    assert post(first, f"/api/v1/tips/{key}/bookmark", {}).get_json()["data"]["bookmarked"]
    assert post(first, f"/api/v1/tips/{key}/dismiss", {}).get_json()["data"]["dismissed"]
    assert all(t["key"] != key for t in first.get("/api/v1/tips").get_json()["data"])
    assert (
        first.delete(
            f"/api/v1/budgets/{budget_id}", headers={"X-CSRF-Token": csrf(first)}
        ).status_code
        == 200
    )


def test_reports_and_exports_match_ledger(app):
    client = app.test_client()
    register(client, "phase4-report@example.com")
    expense = make_category(client)
    income = make_category(client, "Allowance", "income")
    start = datetime.now(UTC).replace(hour=12, minute=0, second=0, microsecond=0)
    assert make_transaction(client, expense, occurred_at=start.isoformat()).status_code == 201
    assert (
        make_transaction(
            client,
            income,
            transaction_type="income",
            amount="100.00",
            occurred_at=start.isoformat(),
        ).status_code
        == 201
    )
    query = urlencode(
        {
            "period": "range",
            "start": (start - timedelta(days=1)).isoformat(),
            "end": (start + timedelta(days=1)).isoformat(),
        }
    )
    report = client.get(f"/api/v1/reports?{query}")
    assert report.status_code == 200
    data = report.get_json()["data"]
    assert (data["income"], data["expenses"], data["balance"]) == ("100.00", "25.50", "74.50")
    assert data["transaction_count"] == 2
    assert client.get("/api/v1/reports?period=six_months").status_code == 200
    assert client.get("/api/v1/reports?period=daily").status_code == 200
    assert client.get("/api/v1/reports?period=weekly").status_code == 200
    income_query = urlencode(
        {
            "period": "income_source",
            "start": (start - timedelta(days=1)).isoformat(),
            "end": (start + timedelta(days=1)).isoformat(),
        }
    )
    assert client.get(f"/api/v1/reports?{income_query}").get_json()["data"]["income"] == "100.00"
    payload = {
        "period": "range",
        "start": (start - timedelta(days=1)).isoformat(),
        "end": (start + timedelta(days=1)).isoformat(),
    }
    pdf = post(client, "/api/v1/reports/exports", {**payload, "format": "pdf"})
    assert pdf.status_code == 200, pdf.get_json() if pdf.is_json else ""
    assert pdf.data.startswith(b"%PDF")
    png = post(client, "/api/v1/reports/exports", {**payload, "format": "png"})
    assert png.status_code == 200
    assert png.data.startswith(b"\x89PNG")
    app.config["REPORT_SYNC_TRANSACTION_LIMIT"] = 1
    queued = post(client, "/api/v1/reports/exports", {**payload, "format": "pdf"})
    assert queued.status_code == 202
    job_id = queued.get_json()["data"]["job_id"]
    repeated = post(client, "/api/v1/reports/exports", {**payload, "format": "pdf"})
    assert repeated.get_json()["data"]["job_id"] == job_id
    assert client.get(f"/api/v1/jobs/{job_id}").get_json()["data"]["status"] == "pending"
    with app.app_context():
        assert ReportService().process_pending() == 1
        assert db.session.get(Job, __import__("uuid").UUID(job_id)).status == JobStatus.SUCCEEDED
    result = client.get(f"/api/v1/jobs/{job_id}").get_json()["data"]["result"]
    assert client.get(result["download_url"]).data.startswith(b"%PDF")


def test_budget_validation_and_report_filters(client):
    register(client, "phase4-validation@example.com")
    expense = make_category(client)
    income = make_category(client, "Stipend", "income")
    for amount in ("0", "1.001", "nan"):
        assert (
            post(
                client,
                "/api/v1/budgets",
                {"category_id": expense, "year": 2026, "month": 9, "amount": amount},
            ).status_code
            == 400
        )
    assert (
        post(
            client,
            "/api/v1/budgets",
            {"category_id": income, "year": 2026, "month": 9, "amount": "10.00"},
        ).status_code
        == 400
    )
    assert client.get("/api/v1/reports?period=invalid").status_code == 400
    assert client.get("/api/v1/reports?period=range").status_code == 400
    assert client.get("/api/v1/reports?period=monthly&month=13").status_code == 400
