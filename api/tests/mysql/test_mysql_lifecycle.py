"""Destructive integration checks are restricted to a verified test database."""

import uuid
from datetime import UTC, timedelta
from decimal import Decimal

import pytest
from flask_migrate import downgrade, upgrade
from sqlalchemy import inspect, select, text
from sqlalchemy.engine import make_url
from sqlalchemy.exc import IntegrityError
from werkzeug.security import generate_password_hash

from app import create_app
from app.extensions import db
from app.models import AuthSession, Category, RateLimitRecord, Transaction, User
from app.services.rate_limit import check_rate_limit
from app.utils.time import utcnow
from tests.integration.test_auth import post, register


@pytest.fixture(scope="module")
def mysql_app():
    app = create_app("testing")
    url = make_url(app.config["SQLALCHEMY_DATABASE_URI"])
    if url.get_backend_name() != "mysql":
        pytest.skip("TEST_DATABASE_URL must point to MySQL")
    if "test" not in (url.database or "").lower() or url.host not in {
        "localhost",
        "127.0.0.1",
        "::1",
    }:
        raise RuntimeError("Refusing destructive setup outside a local test database")
    with app.app_context():
        db.metadata.drop_all(bind=db.engine)
        with db.engine.begin() as connection:
            connection.execute(text("DROP TABLE IF EXISTS alembic_version"))
        upgrade()
        assert "transactions" in inspect(db.engine).get_table_names()
        downgrade(revision="base")
        upgrade()
        yield app
        db.session.remove()
        db.metadata.drop_all(bind=db.engine)
        with db.engine.begin() as connection:
            connection.execute(text("DROP TABLE IF EXISTS alembic_version"))


def test_mysql_uuid_decimal_json_datetime_search_and_tenancy(mysql_app):
    first = mysql_app.test_client()
    second = mysql_app.test_client()
    register(first, "mysql-first@example.com")
    register(second, "mysql-second@example.com")
    category = post(
        first,
        "/api/v1/categories",
        {"name": "Food", "category_type": "expense"},
    ).get_json()["data"]["id"]
    created = post(
        first,
        "/api/v1/transactions",
        {
            "category_id": category,
            "transaction_type": "expense",
            "amount": "12.34",
            "description": "Campus Cafe",
            "occurred_at": "2026-09-20T12:00:00+01:00",
        },
    )
    assert created.status_code == 201
    transaction_id = created.get_json()["data"]["id"]
    assert created.get_json()["data"]["occurred_at"] == "2026-09-20T11:00:00+00:00"
    assert first.get("/api/v1/transactions?q=CAFE").get_json()["meta"]["total"] == 1
    assert second.get(f"/api/v1/transactions/{transaction_id}").status_code == 404
    with mysql_app.app_context():
        transaction = db.session.get(Transaction, uuid.UUID(transaction_id))
        assert transaction.amount == Decimal("12.34")
        assert transaction.occurred_at.tzinfo == UTC
        assert transaction.revisions[0].snapshot["amount"] == "12.34"
        assert transaction.owner_id == transaction.revisions[0].actor_id
        columns = inspect(db.engine).get_columns("transactions")
        id_type = next(column["type"] for column in columns if column["name"] == "id")
        owner_type = next(column["type"] for column in columns if column["name"] == "owner_id")
        assert str(id_type) == str(owner_type)


def test_mysql_locking_import_and_foreign_keys(mysql_app):
    client = mysql_app.test_client()
    register(client, "mysql-importer@example.com")
    category = post(
        client,
        "/api/v1/categories",
        {"name": "Meals", "category_type": "expense"},
    ).get_json()["data"]["id"]
    content = (
        "date,amount,description,type,category\n"
        "2026-09-20T12:00:00+00:00,3.25,Lunch,expense,Meals\n"
    )
    preview = post(client, "/api/v1/transactions/imports/preview", {"csv": content})
    import_id = preview.get_json()["data"]["import_id"]
    first = post(client, f"/api/v1/transactions/imports/{import_id}/confirm")
    again = post(client, f"/api/v1/transactions/imports/{import_id}/confirm")
    assert first.get_json()["data"]["imported"] == 1
    assert again.get_json()["data"]["already_confirmed"] is True
    with mysql_app.app_context():
        with mysql_app.test_request_context():
            check_rate_limit("mysql_probe", "probe")
            check_rate_limit("mysql_probe", "probe")
        record = db.session.scalar(
            select(RateLimitRecord).where(RateLimitRecord.action == "mysql_probe")
        )
        assert record.attempts == 2
        user = db.session.scalar(select(User).where(User.email == "mysql-importer@example.com"))
        category_model = db.session.get(Category, uuid.UUID(category))
        with pytest.raises(IntegrityError):
            db.session.delete(category_model)
            db.session.commit()
        db.session.rollback()
        db.session.execute(select(User).where(User.id == user.id).with_for_update())
        db.session.rollback()


def test_mysql_recurrence_unique_and_session_cascade(mysql_app):
    client = mysql_app.test_client()
    register(client, "mysql-recurring@example.com")
    category = post(
        client,
        "/api/v1/categories",
        {"name": "Transport", "category_type": "expense"},
    ).get_json()["data"]["id"]
    rule = post(
        client,
        "/api/v1/recurring-transactions",
        {
            "category_id": category,
            "transaction_type": "expense",
            "amount": "4.10",
            "description": "Bus",
            "frequency": "daily",
            "next_due_at": (utcnow() - timedelta(days=1)).isoformat(),
            "ends_at": (utcnow() - timedelta(days=1)).isoformat(),
        },
    )
    assert rule.status_code == 201
    assert client.get("/api/v1/transactions").get_json()["meta"]["total"] == 1
    assert client.get("/api/v1/transactions").get_json()["meta"]["total"] == 1
    with mysql_app.app_context():
        cascade_user = User(
            email="mysql-cascade@example.com",
            password_hash=generate_password_hash("long-test-password"),
            name="Cascade",
        )
        db.session.add(cascade_user)
        db.session.flush()
        session = AuthSession(
            user_id=cascade_user.id,
            refresh_token_hash="a" * 64,
            expires_at=utcnow() + timedelta(days=1),
        )
        db.session.add(session)
        db.session.commit()
        session_id = session.id
        user_id = cascade_user.id
        db.session.execute(text("DELETE FROM users WHERE id = :id"), {"id": user_id.hex})
        db.session.commit()
        db.session.expire_all()
        assert db.session.get(AuthSession, session_id) is None
