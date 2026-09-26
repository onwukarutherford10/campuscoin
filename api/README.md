# CampusCoin API

This independently installable Flask backend uses MySQL with InnoDB and utf8mb4. SQLite is
available only for quick dialect-neutral tests. The API is versioned under `/api/v1` and returns
`{"data": ..., "meta": ...}` on success or `{"error": {"code": ..., "message": ..., "fields": ...}}`
on failure. `GET /health` checks the process; `GET /ready` also checks its database connection.

## Local Homebrew MySQL

Install MySQL if it is absent, then start the installed release. The project does not require a
specific local MySQL release. Verification on 2026-09-26 used Homebrew MySQL client **26.7.0**
and server **26.7.0**.

```bash
brew install mysql
brew services start mysql
mysqladmin ping
mysql --version
mysql -N -e 'SELECT VERSION(), @@version_comment;'
mysql -u root -p
```

Create separate databases and least-privilege local users. Replace the sample passwords with
independently generated values. The accounts have permissions only on their respective database.

```sql
CREATE DATABASE IF NOT EXISTS campuscoin CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS campuscoin_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'campuscoin_app'@'localhost' IDENTIFIED BY 'replace-app-password';
CREATE USER IF NOT EXISTS 'campuscoin_test'@'localhost' IDENTIFIED BY 'replace-test-password';
GRANT ALL PRIVILEGES ON campuscoin.* TO 'campuscoin_app'@'localhost';
GRANT ALL PRIVILEGES ON campuscoin_test.* TO 'campuscoin_test'@'localhost';
```

Connect with `mysql -u campuscoin_app -p -h localhost campuscoin`. When done with local
development, use `brew services stop mysql`.

## Install and configure

From `api/`:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -e '.[dev]'
cp .env.example .env
python -c 'import secrets; print(secrets.token_urlsafe(64))'  # SECRET_KEY
python -c 'import secrets; print(secrets.token_urlsafe(32))'  # separate database passwords
```

Set these values in the ignored `.env` file. URL-encode special characters in passwords before
putting them in a URL, for example with
`python -c 'from urllib.parse import quote; print(quote(input("Password: "), safe=""))'`.
Do not commit `.env`.

```dotenv
SECRET_KEY=<generated-secret>
DATABASE_URL=mysql+pymysql://campuscoin_app:<encoded-password>@localhost:3306/campuscoin?charset=utf8mb4
TEST_DATABASE_URL=mysql+pymysql://campuscoin_test:<encoded-password>@localhost:3306/campuscoin_test?charset=utf8mb4
```

Apply migrations and run the idempotent seed commands:

```bash
flask --app wsgi:app db upgrade
flask --app wsgi:app seed-categories
ADMIN_PASSWORD='<separate-strong-password>' flask --app wsgi:app seed-admin
flask --app wsgi:app run --port 5000
```

Run `flask --app wsgi:app db upgrade` and `seed-categories` again to verify idempotency. An
existing administrator is preserved by `seed-admin`; it does not change that user's password.

## Tests and database safety

```bash
ruff check .
ruff format --check .
pytest
TEST_DATABASE_URL='mysql+pymysql://campuscoin_test:<encoded-password>@localhost:3306/campuscoin_test?charset=utf8mb4' pytest
```

Without `TEST_DATABASE_URL`, pytest uses isolated in-memory SQLite for fast tests. The MySQL
fixture refuses destructive setup unless the URL database name contains `test` and the host is
local. It rebuilds tables only in that database. A MySQL lifecycle test upgrades a blank database
with Alembic, downgrades to base, and upgrades again. Never point tests at `campuscoin` or Aiven.

## Aiven deployment

[Create an Aiven for MySQL service](https://aiven.io/docs/products/mysql/get-started) with the
Free plan, then create or select `campuscoin` under the service's Databases section. The free
service is suited to this academic project, demonstrations, and small workloads. In the service
Overview, obtain its host, port, username, password, and project CA certificate. Query the
selected service with `SELECT VERSION()` and compare that result with the local server version.
Use a supported Aiven MySQL version; the backend uses broadly supported InnoDB, utf8mb4,
`DATETIME(6)`, JSON, `CHAR(32)` UUIDs, and standard foreign keys.

URL-encode the Aiven password as shown above. Configure these values in the Flask hosting
provider's secret settings, never in source control:

```dotenv
APP_ENV=production
SECRET_KEY=<generated-production-secret>
DATABASE_URL=mysql+pymysql://<aiven-user>:<encoded-password>@<aiven-host>:<aiven-port>/campuscoin?charset=utf8mb4
MYSQL_SSL_CA=/absolute/path/to/aiven-project-ca.pem
ADMIN_EMAIL=<admin-email>
```

Download the Aiven project CA certificate and set `MYSQL_SSL_CA` to its absolute deployed path
when using certificate verification. The PyMySQL connection verifies the CA and hostname;
certificate verification is not disabled. Keep the CA current when Aiven rotates it. From the
deployed environment, run `flask --app wsgi:app db upgrade`, `seed-categories`, and
`ADMIN_PASSWORD='<strong-password>' flask --app wsgi:app seed-admin`. Request `/ready` and
confirm it reports `database: ok`. Aiven connectivity and version must be checked using the
user's actual service credentials; no Aiven credentials are included in this repository.

## Authentication and existing API

Production access and rotating refresh credentials use `Secure`, `HttpOnly`, `SameSite=Lax`
cookies. Before a state-changing request, call `GET /api/v1/auth/csrf` and send its cookie value
in `X-CSRF-Token`. Login and refresh replace that cookie. Authentication is under `/api/v1/auth`,
the current profile under `/api/v1/users/me`, categories under `/api/v1/categories`, and admin
operations under `/api/v1/admin`.

Transaction CRUD, filters, pagination, revision history, restore, and recent activity are under
`/api/v1/transactions`. Recurring rules live at `/api/v1/recurring-transactions`; due instances
are generated on ledger reads or by `flask --app wsgi:app materialize-recurring`. CSV imports use
preview/confirm under `/api/v1/transactions/imports`; invalid rows have a downloadable
`errors_url`. Large imports return an owned database job for the later job processor.

All application datetimes are normalized to UTC before storage in MySQL `DATETIME(6)` and
returned with `+00:00`. Monetary values use `NUMERIC`/`DECIMAL` and Python `Decimal`; APIs expose
two-decimal strings. In tests, password reset tokens appear in response metadata; production
never exposes them. Email delivery is added in a later phase.

## Backup and restore

Back up the local development database before migrations. Restore only to the intended local
database after verifying its name:

```bash
mysqldump -u campuscoin_app -p -h localhost --single-transaction campuscoin > campuscoin-backup.sql
mysql -u campuscoin_app -p -h localhost campuscoin < campuscoin-backup.sql
```

Use the hosting provider's managed backup and restore procedure for Aiven. Check migrations
against a disposable copy before restoring or downgrading any deployed database.
