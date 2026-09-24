from tests.integration.test_auth import post, register
from tests.integration.test_transactions import make_category


def test_recurring_materialization_is_idempotent_and_lazy(client):
    register(client)
    category_id = make_category(client)
    created = post(
        client,
        "/api/v1/recurring-transactions",
        {
            "category_id": category_id,
            "transaction_type": "expense",
            "amount": "100.00",
            "description": "Daily meal plan",
            "frequency": "daily",
            "interval": 1,
            "next_due_at": "2026-09-22T09:00:00+00:00",
            "ends_at": "2026-09-24T09:00:00+00:00",
        },
    )
    assert created.status_code == 201
    rule_id = created.get_json()["data"]["id"]
    assert len(client.get("/api/v1/recurring-transactions").get_json()["data"]) == 1

    first = client.get("/api/v1/transactions")
    assert first.get_json()["meta"]["total"] == 3
    second = client.get("/api/v1/transactions")
    assert second.get_json()["meta"]["total"] == 3
    assert {item["source"] for item in second.get_json()["data"]} == {"recurring"}

    token = client.get_cookie("campuscoin_csrf").value
    changed = client.patch(
        f"/api/v1/recurring-transactions/{rule_id}",
        json={"description": "Meal subscription"},
        headers={"X-CSRF-Token": token},
    )
    assert changed.status_code == 200
    assert (
        client.delete(
            f"/api/v1/recurring-transactions/{rule_id}",
            headers={"X-CSRF-Token": token},
        ).status_code
        == 200
    )


def test_recurring_cli_is_repeat_safe(app):
    client = app.test_client()
    register(client)
    category_id = make_category(client)
    post(
        client,
        "/api/v1/recurring-transactions",
        {
            "category_id": category_id,
            "transaction_type": "expense",
            "amount": "8",
            "description": "Weekly",
            "frequency": "weekly",
            "next_due_at": "2026-09-01T00:00:00+00:00",
            "ends_at": "2026-09-15T00:00:00+00:00",
        },
    )
    runner = app.test_cli_runner()
    assert "3 created" in runner.invoke(args=["materialize-recurring"]).output
    assert "0 created" in runner.invoke(args=["materialize-recurring"]).output
