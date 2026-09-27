from tests.integration.test_auth import admin_login, csrf, make_admin, post, register
from tests.integration.test_transactions import make_category, make_transaction


def test_evaluation_student_seed_is_idempotent(app):
    runner = app.test_cli_runner()
    arguments = ["--email", "eval-student@example.edu", "--password", "evaluation-pass-123"]
    first = runner.invoke(args=["seed-evaluation", *arguments])
    second = runner.invoke(args=["seed-evaluation", *arguments])
    assert first.exit_code == second.exit_code == 0
    assert "created" in first.output
    assert "already exists" in second.output
    assert "evaluation-pass-123" not in first.output + second.output


def test_admin_content_and_aggregate_usage(app):
    student = app.test_client()
    admin = app.test_client()
    register(student, "content-student@example.com")
    category_id = make_category(student)
    assert make_transaction(student, category_id).status_code == 201
    assert student.get("/api/v1/admin/content").status_code == 403
    make_admin(app)
    assert admin_login(admin).status_code == 200
    usage = admin.get("/api/v1/admin/usage").get_json()["data"]
    assert usage["transactions"] == 1
    assert usage["total_transactions_logged"] == 1
    assert usage["most_used_categories"][0]["transactions"] == 1
    assert usage["most_used_categories"][0]["id"] == category_id
    created = post(
        admin,
        "/api/v1/admin/content",
        {"kind": "announcement", "title": "Campus update", "body": "Stay on budget"},
    )
    assert created.status_code == 201, created.get_json()
    content_id = created.get_json()["data"]["id"]
    assert len(student.get("/api/v1/notifications").get_json()["data"]) == 1
    assert len(student.get("/api/v1/notifications").get_json()["data"]) == 1
    assert (
        admin.patch(
            f"/api/v1/admin/content/{content_id}",
            json={"title": "Updated"},
            headers={"X-CSRF-Token": csrf(admin)},
        ).status_code
        == 200
    )
    assert (
        post(
            admin,
            "/api/v1/admin/content",
            {"kind": "tip_template", "title": "Save", "body": "Try meal planning"},
        ).status_code
        == 201
    )
    assert any(
        t["key"].startswith("template:") for t in student.get("/api/v1/tips").get_json()["data"]
    )
    assert (
        admin.delete(
            f"/api/v1/admin/content/{content_id}", headers={"X-CSRF-Token": csrf(admin)}
        ).status_code
        == 200
    )
