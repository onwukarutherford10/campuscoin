from tests.integration.test_auth import post, register
from tests.integration.test_transactions import make_category

CSV = """date,amount,description,type,category,merchant
2026-09-20T12:00:00+01:00,12.50,Lunch,expense,Food,Cafe
2026-09-21T12:00:00+01:00,-3.00,Bad row,expense,Food,Cafe
2026-09-20T12:00:00+01:00,12.50,Lunch,expense,Food,Cafe
"""


def test_csv_preview_errors_duplicates_and_idempotent_confirmation(client):
    register(client)
    make_category(client)
    preview = post(
        client,
        "/api/v1/transactions/imports/preview",
        {"filename": "ledger.csv", "csv": CSV},
    )
    assert preview.status_code == 201
    data = preview.get_json()["data"]
    assert data["row_count"] == 3
    assert data["valid_count"] == 2
    assert data["duplicate_count"] == 1
    assert data["error_count"] == 1
    assert client.get(data["errors_url"]).mimetype == "text/csv"

    confirmed = post(client, f"/api/v1/transactions/imports/{data['import_id']}/confirm")
    assert confirmed.get_json()["data"]["imported"] == 1
    repeated = post(client, f"/api/v1/transactions/imports/{data['import_id']}/confirm")
    assert repeated.get_json()["data"]["already_confirmed"] is True
    assert client.get("/api/v1/transactions").get_json()["meta"]["total"] == 1

    next_preview = post(
        client,
        "/api/v1/transactions/imports/preview",
        {"csv": CSV.splitlines()[0] + "\n" + CSV.splitlines()[1]},
    )
    assert next_preview.get_json()["data"]["duplicate_count"] == 1


def test_large_csv_import_returns_owned_job(app):
    client = app.test_client()
    other = app.test_client()
    register(client, "importer@example.com")
    register(other, "other-importer@example.com")
    make_category(client)
    app.config["CSV_SYNC_ROW_LIMIT"] = 1
    content = """date,amount,description,type,category
2026-09-20T12:00:00+01:00,10,One,expense,Food
2026-09-21T12:00:00+01:00,11,Two,expense,Food
"""
    preview = post(client, "/api/v1/transactions/imports/preview", {"csv": content})
    import_id = preview.get_json()["data"]["import_id"]
    response = post(client, f"/api/v1/transactions/imports/{import_id}/confirm")
    assert response.status_code == 202
    job = response.get_json()["data"]
    assert client.get(job["status_url"]).status_code == 200
    assert other.get(job["status_url"]).status_code == 404
