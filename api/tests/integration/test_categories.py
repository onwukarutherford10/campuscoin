from tests.integration.test_auth import admin_login, csrf, make_admin, post, register


def test_categories_are_tenant_isolated_and_system_categories_are_protected(app):
    first = app.test_client()
    second = app.test_client()
    register(first, "first@example.com")
    register(second, "second@example.com")

    created = post(
        first,
        "/api/v1/categories",
        {"name": "Coffee", "category_type": "expense", "color": "#123ABC"},
    )
    assert created.status_code == 201
    category_id = created.get_json()["data"]["id"]
    assert len(first.get("/api/v1/categories").get_json()["data"]) == 1
    assert second.get("/api/v1/categories").get_json()["data"] == []

    token = csrf(second)
    cross_user = second.patch(
        f"/api/v1/categories/{category_id}",
        json={"name": "Stolen"},
        headers={"X-CSRF-Token": token},
    )
    assert cross_user.status_code == 404

    token = first.get_cookie("campuscoin_csrf").value
    changed = first.patch(
        f"/api/v1/categories/{category_id}",
        json={"name": "Café"},
        headers={"X-CSRF-Token": token},
    )
    assert changed.status_code == 200
    assert post(first, f"/api/v1/categories/{category_id}", token=token).status_code == 405
    deleted = first.delete(f"/api/v1/categories/{category_id}", headers={"X-CSRF-Token": token})
    assert deleted.status_code == 200
    assert first.get("/api/v1/categories").get_json()["data"][0]["is_active"] is False


def test_admin_manages_system_categories(app):
    client = app.test_client()
    make_admin(app)
    admin_login(client)
    created = post(
        client,
        "/api/v1/admin/categories",
        {"name": "Tuition", "category_type": "expense", "icon": "book"},
    )
    assert created.status_code == 201
    category_id = created.get_json()["data"]["id"]
    assert created.get_json()["data"]["is_system"] is True
    token = client.get_cookie("campuscoin_csrf").value
    updated = client.patch(
        f"/api/v1/admin/categories/{category_id}",
        json={"color": "#FFFFFF"},
        headers={"X-CSRF-Token": token},
    )
    assert updated.status_code == 200
    assert (
        client.delete(
            f"/api/v1/admin/categories/{category_id}",
            headers={"X-CSRF-Token": token},
        ).status_code
        == 200
    )
