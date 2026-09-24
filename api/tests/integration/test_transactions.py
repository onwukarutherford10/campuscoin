from tests.integration.test_auth import csrf, post, register


def make_category(client, name="Food", category_type="expense"):
    response = post(
        client,
        "/api/v1/categories",
        {"name": name, "category_type": category_type},
    )
    assert response.status_code == 201
    return response.get_json()["data"]["id"]


def make_transaction(client, category_id, **overrides):
    payload = {
        "category_id": category_id,
        "transaction_type": "expense",
        "amount": "25.50",
        "description": "Lunch",
        "merchant": "Campus Cafe",
        "occurred_at": "2026-09-20T12:00:00+01:00",
    }
    payload.update(overrides)
    return post(client, "/api/v1/transactions", payload)


def test_transaction_crud_history_filters_and_recent_activity(app):
    client = app.test_client()
    register(client)
    category_id = make_category(client)
    created = make_transaction(client, category_id)
    assert created.status_code == 201
    transaction_id = created.get_json()["data"]["id"]
    assert created.get_json()["data"]["amount"] == "25.50"

    fetched = client.get(f"/api/v1/transactions/{transaction_id}")
    assert fetched.status_code == 200
    token = client.get_cookie("campuscoin_csrf").value
    changed = client.patch(
        f"/api/v1/transactions/{transaction_id}",
        json={"amount": "30.00", "description": "Dinner"},
        headers={"X-CSRF-Token": token},
    )
    assert changed.status_code == 200
    assert changed.get_json()["data"]["version"] == 2

    listing = client.get(
        "/api/v1/transactions?type=expense&q=Dinner&from=2026-09-01T00:00:00%2B01:00"
    )
    assert listing.status_code == 200
    assert listing.get_json()["meta"]["total"] == 1
    assert client.get("/api/v1/transactions?type=income").get_json()["meta"]["total"] == 0

    recent = client.get("/api/v1/transactions/recent").get_json()["data"]
    assert recent[0]["last_viewed_at"] is not None
    assert recent[0]["last_edited_at"] is not None

    deleted = client.delete(
        f"/api/v1/transactions/{transaction_id}", headers={"X-CSRF-Token": token}
    )
    assert deleted.status_code == 200
    assert client.get("/api/v1/transactions").get_json()["meta"]["total"] == 0
    assert client.get("/api/v1/transactions?include_deleted=true").get_json()["meta"]["total"] == 1

    restored = post(client, f"/api/v1/transactions/{transaction_id}/restore", token=token)
    assert restored.status_code == 200
    revisions = client.get(f"/api/v1/transactions/{transaction_id}/revisions").get_json()["data"]
    assert [revision["action"] for revision in revisions] == [
        "created",
        "updated",
        "deleted",
        "restored",
    ]
    assert revisions[0]["snapshot"]["amount"] == "25.50"


def test_transaction_rules_and_tenant_isolation(app):
    first = app.test_client()
    second = app.test_client()
    register(first, "first-tx@example.com")
    register(second, "second-tx@example.com")
    expense = make_category(first)
    income = make_category(first, "Allowance", "income")

    mismatch = make_transaction(first, income)
    assert mismatch.status_code == 400
    assert mismatch.get_json()["error"]["code"] == "category_type_mismatch"
    assert make_transaction(first, expense, amount="0").status_code == 400
    created = make_transaction(first, expense)
    transaction_id = created.get_json()["data"]["id"]
    assert second.get(f"/api/v1/transactions/{transaction_id}").status_code == 404

    second_token = csrf(second)
    response = second.patch(
        f"/api/v1/transactions/{transaction_id}",
        json={"description": "Not mine"},
        headers={"X-CSRF-Token": second_token},
    )
    assert response.status_code == 404


def test_pagination(client):
    register(client)
    category_id = make_category(client)
    for index in range(3):
        make_transaction(
            client,
            category_id,
            description=f"Item {index}",
            occurred_at=f"2026-09-{20 + index}T12:00:00+01:00",
        )
    response = client.get("/api/v1/transactions?page=2&per_page=2")
    assert response.get_json()["meta"] == {"page": 2, "per_page": 2, "total": 3}
    assert len(response.get_json()["data"]) == 1
