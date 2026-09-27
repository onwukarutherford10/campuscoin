from app.extensions import db
from app.models import Category, User


def test_seed_commands_are_idempotent(app):
    runner = app.test_cli_runner()
    assert runner.invoke(args=["seed-categories"]).exit_code == 0
    assert runner.invoke(args=["seed-categories"]).output.endswith("(0 created).\n")
    with app.app_context():
        assert db.session.query(Category).filter_by(owner_id=None).count() == 15

    args = [
        "seed-admin",
        "--email",
        "root@example.com",
        "--password",
        "administrator-123",
    ]
    assert runner.invoke(args=args).exit_code == 0
    assert runner.invoke(args=args).exit_code == 0
    with app.app_context():
        assert db.session.query(User).filter_by(email="root@example.com").count() == 1


def test_csv_import_worker_command_is_available(app):
    result = app.test_cli_runner().invoke(args=["process-csv-imports", "--limit", "1"])
    assert result.exit_code == 0
    assert result.output == "Processed 0 CSV imports\n"
