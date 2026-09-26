import pytest
from sqlalchemy.engine import make_url

from app import create_app
from app.extensions import db


@pytest.fixture()
def app():
    application = create_app("testing")
    url = make_url(application.config["SQLALCHEMY_DATABASE_URI"])
    if url.get_backend_name() == "mysql" and (
        "test" not in (url.database or "").lower()
        or url.host not in {"localhost", "127.0.0.1", "::1"}
    ):
        raise RuntimeError("MySQL test setup requires a local test database")
    with application.app_context():
        db.create_all()
    yield application
    with application.app_context():
        db.session.remove()
        db.drop_all()
        db.engine.dispose()


@pytest.fixture()
def client(app):
    return app.test_client()
