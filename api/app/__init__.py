from __future__ import annotations

from flask import Flask

from app.api import api_v1
from app.api.errors import register_error_handlers
from app.api.health import health
from app.config import CONFIGS
from app.extensions import cors, csrf, db, migrate
from app.logging import configure_logging
from app.utils.security import init_api_security


def create_app(config_name: str | None = None, overrides: dict | None = None) -> Flask:
    app = Flask(__name__, instance_relative_config=True)
    profile = config_name or __import__("os").environ.get("APP_ENV", "development")
    config_class = CONFIGS.get(profile)
    if config_class is None:
        raise ValueError(f"Unknown APP_ENV profile: {profile}")

    app.config.from_object(config_class)
    if overrides:
        app.config.update(overrides)
    config_class.validate(app.config)

    configure_logging(app.config["LOG_LEVEL"])
    db.init_app(app)
    migrate.init_app(app, db)
    csrf.init_app(app)
    csrf.exempt(api_v1)
    cors.init_app(
        app,
        resources={r"/api/*": {"origins": app.config["FRONTEND_ORIGINS"]}},
        supports_credentials=True,
    )

    app.register_blueprint(health)
    app.register_blueprint(api_v1, url_prefix="/api/v1")
    init_api_security(app, api_v1)
    register_error_handlers(app)

    from app.commands.seed import register_commands

    register_commands(app)

    # Ensure model metadata is registered for Flask-Migrate.
    from app import models  # noqa: F401

    return app
