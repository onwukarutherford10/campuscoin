import pytest

from app import create_app


def test_unknown_profile_is_rejected():
    with pytest.raises(ValueError, match="Unknown APP_ENV"):
        create_app("missing")


def test_production_rejects_default_secret():
    with pytest.raises(RuntimeError, match="SECRET_KEY"):
        create_app(
            "production",
            {"SQLALCHEMY_DATABASE_URI": "postgresql+psycopg://localhost/campuscoin"},
        )
