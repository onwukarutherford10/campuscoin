import pytest

from app import create_app


def test_unknown_profile_is_rejected():
    with pytest.raises(ValueError, match="Unknown APP_ENV"):
        create_app("missing")


def test_production_rejects_default_secret():
    with pytest.raises(RuntimeError, match="SECRET_KEY"):
        create_app(
            "production",
            {"SQLALCHEMY_DATABASE_URI": "mysql+pymysql://localhost/campuscoin"},
        )


@pytest.mark.parametrize("url", ["sqlite+pysqlite:///:memory:", "postgresql://host/db"])
def test_production_rejects_non_mysql(url):
    with pytest.raises(RuntimeError, match="MySQL"):
        create_app(
            "production",
            {
                "SECRET_KEY": "a-production-secret-that-is-long-enough",
                "SQLALCHEMY_DATABASE_URI": url,
            },
        )


def test_production_accepts_mysql():
    app = create_app(
        "production",
        {
            "SECRET_KEY": "a-production-secret-that-is-long-enough",
            "SQLALCHEMY_DATABASE_URI": "mysql+pymysql://user:password@localhost/campuscoin",
            "SMTP_USERNAME": "mailer@example.com",
            "SMTP_APP_PASSWORD": "test-app-password",
            "SMTP_FROM": "mailer@example.com",
        },
    )
    assert app.config["SQLALCHEMY_ENGINE_OPTIONS"]["pool_pre_ping"] is True
    assert app.config["COOKIE_SECURE"] is True
    assert app.config["WTF_CSRF_CHECK_DEFAULT"] is False


def test_production_requires_smtp_credentials():
    with pytest.raises(RuntimeError, match="Gmail SMTP"):
        create_app(
            "production",
            {
                "SECRET_KEY": "a-production-secret-that-is-long-enough",
                "SQLALCHEMY_DATABASE_URI": "mysql+pymysql://user:password@localhost/campuscoin",
                "SMTP_USERNAME": "",
                "SMTP_APP_PASSWORD": "",
                "SMTP_FROM": "",
            },
        )
