from __future__ import annotations

import os
from typing import Any


def _as_bool(value: str | bool) -> bool:
    return value if isinstance(value, bool) else value.lower() in {"1", "true", "yes", "on"}


class BaseConfig:
    SECRET_KEY = os.getenv("SECRET_KEY", "development-only-change-me")
    SQLALCHEMY_DATABASE_URI = os.getenv(
        "DATABASE_URL", "postgresql+psycopg://campuscoin:campuscoin@localhost:5432/campuscoin"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {"pool_pre_ping": True}
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

    @classmethod
    def validate(cls, config: dict[str, Any]) -> None:
        if not config["SQLALCHEMY_DATABASE_URI"]:
            raise RuntimeError("DATABASE_URL must be configured")


class DevelopmentConfig(BaseConfig):
    DEBUG = True


class TestingConfig(BaseConfig):
    TESTING = True
    WTF_CSRF_ENABLED = False
    SQLALCHEMY_DATABASE_URI = os.getenv("TEST_DATABASE_URL", "sqlite+pysqlite:///:memory:")
    SQLALCHEMY_ENGINE_OPTIONS = {}


class ProductionConfig(BaseConfig):
    SESSION_COOKIE_SECURE = True

    @classmethod
    def validate(cls, config: dict[str, Any]) -> None:
        super().validate(config)
        if config["SECRET_KEY"] == "development-only-change-me" or len(config["SECRET_KEY"]) < 32:
            raise RuntimeError("Production SECRET_KEY must be at least 32 characters")
        if not config["SQLALCHEMY_DATABASE_URI"].startswith(("postgresql://", "postgresql+")):
            raise RuntimeError("Production requires PostgreSQL")


CONFIGS = {
    "development": DevelopmentConfig,
    "testing": TestingConfig,
    "production": ProductionConfig,
}
