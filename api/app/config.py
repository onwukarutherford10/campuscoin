from __future__ import annotations

import os
from datetime import timedelta
from typing import Any

from sqlalchemy.engine import make_url

DEFAULT_SECRET_KEY = "development-only-change-me"


def _as_bool(value: str | bool) -> bool:
    return value if isinstance(value, bool) else value.lower() in {"1", "true", "yes", "on"}


class BaseConfig:
    SECRET_KEY = os.getenv("SECRET_KEY", DEFAULT_SECRET_KEY)
    SQLALCHEMY_DATABASE_URI = os.getenv(
        "DATABASE_URL",
        "mysql+pymysql://campuscoin_app:password@localhost:3306/campuscoin?charset=utf8mb4",
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_pre_ping": True,
        "pool_recycle": 1800,
        "connect_args": {"connect_timeout": 10, "read_timeout": 30, "write_timeout": 30},
    }
    FRONTEND_ORIGINS = [
        origin.strip()
        for origin in os.getenv("FRONTEND_ORIGINS", "http://localhost:5173").split(",")
        if origin.strip()
    ]
    LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = "Lax"
    SESSION_COOKIE_SECURE = _as_bool(os.getenv("COOKIE_SECURE", "false"))
    WTF_CSRF_TIME_LIMIT = 3600
    ACCESS_TOKEN_TTL = timedelta(minutes=int(os.getenv("ACCESS_TOKEN_MINUTES", "15")))
    REFRESH_TOKEN_TTL = timedelta(days=int(os.getenv("REFRESH_TOKEN_DAYS", "30")))
    PASSWORD_RESET_TTL = timedelta(minutes=int(os.getenv("PASSWORD_RESET_MINUTES", "30")))
    ACCESS_COOKIE_NAME = "campuscoin_access"
    REFRESH_COOKIE_NAME = "campuscoin_refresh"
    CSRF_COOKIE_NAME = "campuscoin_csrf"
    COOKIE_SECURE = SESSION_COOKIE_SECURE
    COOKIE_SAMESITE = "Lax"
    RATE_LIMIT_WINDOW_SECONDS = int(os.getenv("RATE_LIMIT_WINDOW_SECONDS", "900"))
    RATE_LIMIT_MAX_ATTEMPTS = int(os.getenv("RATE_LIMIT_MAX_ATTEMPTS", "10"))
    CSV_SYNC_ROW_LIMIT = int(os.getenv("CSV_SYNC_ROW_LIMIT", "500"))
    REPORT_SYNC_TRANSACTION_LIMIT = int(os.getenv("REPORT_SYNC_TRANSACTION_LIMIT", "500"))
    CSV_PREVIEW_TTL_HOURS = int(os.getenv("CSV_PREVIEW_TTL_HOURS", "24"))
    DEFAULT_PAGE_SIZE = int(os.getenv("DEFAULT_PAGE_SIZE", "25"))
    MAX_PAGE_SIZE = int(os.getenv("MAX_PAGE_SIZE", "100"))

    @classmethod
    def validate(cls, config: dict[str, Any]) -> None:
        if not config["SQLALCHEMY_DATABASE_URI"]:
            raise RuntimeError("DATABASE_URL must be configured")
        try:
            url = make_url(config["SQLALCHEMY_DATABASE_URI"])
        except Exception as exc:
            raise RuntimeError("DATABASE_URL is invalid") from exc
        if url.get_backend_name() != "mysql" and (
            not config.get("TESTING") or url.get_backend_name() != "sqlite"
        ):
            raise RuntimeError("MySQL is required outside fast tests")
        if url.get_backend_name() == "mysql":
            options = config["SQLALCHEMY_ENGINE_OPTIONS"]
            options.setdefault("pool_pre_ping", True)
            options.setdefault("pool_recycle", 1800)
            connect = options.setdefault("connect_args", {})
            connect.setdefault("connect_timeout", 10)
            connect.setdefault("read_timeout", 30)
            connect.setdefault("write_timeout", 30)
            ca = os.getenv("MYSQL_SSL_CA")
            if ca:
                connect["ssl"] = {"ca": ca, "check_hostname": True}


class DevelopmentConfig(BaseConfig):
    DEBUG = True


class TestingConfig(BaseConfig):
    TESTING = True
    SECRET_KEY = "testing-secret-key-is-at-least-32-characters"
    WTF_CSRF_ENABLED = False
    SQLALCHEMY_DATABASE_URI = os.getenv("TEST_DATABASE_URL", "sqlite+pysqlite:///:memory:")
    SQLALCHEMY_ENGINE_OPTIONS = {}


class ProductionConfig(BaseConfig):
    SESSION_COOKIE_SECURE = True

    @classmethod
    def validate(cls, config: dict[str, Any]) -> None:
        super().validate(config)
        if config["SECRET_KEY"] == DEFAULT_SECRET_KEY or len(config["SECRET_KEY"]) < 32:
            raise RuntimeError("Production SECRET_KEY must be at least 32 characters")
        if make_url(config["SQLALCHEMY_DATABASE_URI"]).get_backend_name() != "mysql":
            raise RuntimeError("Production requires MySQL")


CONFIGS = {
    "development": DevelopmentConfig,
    "testing": TestingConfig,
    "production": ProductionConfig,
}
