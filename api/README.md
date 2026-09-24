# CampusCoin API

The backend is an independently installable Flask application. PostgreSQL is required outside
tests; Redis and Celery are not required.

## Local setup

1. Create a PostgreSQL database and user named `campuscoin` (or choose your own names).
2. From this directory, create a virtual environment and install the project:

   ```bash
   python3.11 -m venv .venv
   source .venv/bin/activate
   pip install -e '.[dev]'
   cp .env.example .env
   ```

3. Edit `.env`, then initialize and serve the API:

   ```bash
   flask --app wsgi:app db upgrade
   flask --app wsgi:app run --port 5000
   ```

`GET /health` checks the process. `GET /ready` additionally checks the database. Versioned
resources live below `/api/v1` and consistently return either `{ "data": ..., "meta": ... }`
or `{ "error": { "code": ..., "message": ..., "fields": ... } }`.

## Quality checks

```bash
ruff check .
ruff format --check .
pytest
```

Tests default to an isolated in-memory database. Set `TEST_DATABASE_URL` to a disposable
PostgreSQL database to exercise the same dialect as production. Never point it at development
or production data.

## Configuration

- `APP_ENV`: `development`, `testing`, or `production`.
- `DATABASE_URL`: SQLAlchemy PostgreSQL URL, preferably using the `psycopg` driver.
- `SECRET_KEY`: required to be at least 32 characters in production.
- `FRONTEND_ORIGINS`: comma-separated credentialed CORS allowlist.
- `COOKIE_SECURE`: set automatically in production; use `false` only for local HTTP.
- `LOG_LEVEL`: structured JSON log level.

All timestamps are timezone-aware and stored in UTC by PostgreSQL. Monetary columns introduced
in later phases must use SQL `NUMERIC` and Python `Decimal`, never floating point.

## Migrations

Commit a migration whenever model metadata changes. Upgrade before starting a new application
release and back up PostgreSQL first in production. Downgrades should be tested against a copy,
not live data.
