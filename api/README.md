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

To recover an existing administrator account, configure `SMTP_HOST`, `SMTP_PORT`,
`SMTP_USERNAME`, `SMTP_APP_PASSWORD`, and `SMTP_FROM` in the ignored `.env` file and confirm
that the `ADMIN_EMAIL` mailbox can receive mail. For Gmail SMTP, use 2-Step Verification and
an app password, not the account password. Start Flask and the frontend, open `/admin`, choose
**Forgot password?**, enter `ADMIN_EMAIL`, then verify the emailed six-digit code. Only after
verification does the new-password form appear. It returns to `/admin` for sign-in. Codes expire after 10 minutes; repeat
requests have a cooldown. Admin recovery always calls the live API, even when the student demo
uses mock mode. Passwords cannot be retrieved from database hashes. Never print or commit
SMTP credentials, codes, or `.env`.

If a reset email still contains a link, restart the running Flask process after pulling the
OTP implementation. A Flask process started before the code change keeps serving the old
handler. The current email contains a branded six-digit code, not a reset link.

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
`errors_url`. Large imports return an owned database job. Run
`flask --app wsgi:app process-csv-imports` continuously or on a frequent scheduler so queued
imports are completed, then poll their `/api/v1/jobs/{id}` status URL.

All application datetimes are normalized to UTC before storage in MySQL `DATETIME(6)` and
returned with `+00:00`. Monetary values use `NUMERIC`/`DECIMAL` and Python `Decimal`; APIs expose
two-decimal strings. In tests, password reset codes appear in response metadata; production
never exposes them.

### Gmail email delivery

Account verification and password recovery each send a six-digit, single-use code in branded
HTML and plain-text email. `POST /api/v1/auth/password/forgot` accepts an email and gives the
same response for known and unknown accounts. The reset screen sends `email`, `code`, and
`password` to `POST /api/v1/auth/password/reset`. Codes expire after 10 minutes by default,
have five attempts, and are subject to a 30-second resend cooldown and endpoint rate limits.
Successful reset revokes existing sessions. Legacy tokenized resets remain accepted for
already-issued tokens. Configure `SMTP_USERNAME`, `SMTP_APP_PASSWORD`, and `SMTP_FROM`;
production startup rejects missing mail credentials. Use a dedicated
Gmail or Google Workspace account with 2-Step Verification and a Gmail app password. Do not put
the normal Google account password in the environment. The default connection is
`smtp.gmail.com:465` over TLS.

Authenticated but unverified students can call `POST /api/v1/auth/email/resend` and
`POST /api/v1/auth/email/verify`. Other protected student endpoints return
`email_verification_required` until verification succeeds. Existing accounts are marked verified
when the verification migration is applied.

Run `flask --app wsgi:app db upgrade` to add the MySQL reset-attempt column. The dashboard
has accessible breadcrumbs and a persistent light/dark switch; neither changes financial data.

## Budgets, dashboard, tips, reports, and exports (Phase 4)

Monthly expense budgets live at `GET/POST /api/v1/budgets` and
`GET/DELETE /api/v1/budgets/{id}`. A POST with the same category/year/month updates the
existing budget. The amount must be positive with two decimal places; `near_limit_percent`
defaults to 80. Consumption includes only non-deleted expense transactions within the
student's timezone-local calendar month. Crossing a threshold creates an idempotent alert.
List, read, and dismiss alerts at `/api/v1/notifications` and
`/api/v1/notifications/{id}/read|dismiss`.

`GET /api/v1/dashboard` consolidates month-to-date balance, income, expenses, top
categories, budget progress, deterministic tips, alerts, and recent transactions.
`GET /api/v1/tips` lists budget, previous-month trend, and recurring-charge suggestions;
`POST /api/v1/tips/{key}/pin|bookmark|dismiss` saves per-student preferences. Estimated
savings are advisory and use exact decimal arithmetic, not AI.

`GET /api/v1/reports` accepts `period=daily|weekly|monthly|six_months|range|category|income_source`.
Monthly and six-month periods accept `year` and `month`; range, category, and income-source
periods require timezone-aware ISO-8601 `start` and `end`. `category_id` and
`type=income|expense` optionally narrow any period. Totals exclude soft-deleted transactions;
`income_source` includes income only.
`POST /api/v1/reports/exports` accepts the same filters plus `format=pdf|png`. Reports
with at most `REPORT_SYNC_TRANSACTION_LIMIT` transactions (default 500) return the file
directly. Larger exports return a `202` database job. Run
`flask --app wsgi:app process-report-exports` manually or on a scheduler, poll
`GET /api/v1/jobs/{id}`, then follow its `download_url`. Export contents are user-scoped.
`GET /api/v1/admin/usage` returns aggregate counts only.

## Optional category suggestions (Phase 5)

The Settings switch saves `ai_consent` through `PATCH /api/v1/users/me` and is off by
default. A student requests a suggestion explicitly; suggestions never create or edit a
transaction. `POST /api/v1/categories/suggest` accepts `transaction_type`, `description`,
and optional `merchant`; `/suggest/batch` accepts up to 20 such objects. The response
contains `category_id` (or `null` for manual selection), `confidence`, `source`, and a
short rationale. `POST /api/v1/categories/suggest/feedback` accepts those input fields,
the final `category_id`, and optional `suggested_category_id` after the user saves.
Corrections are account-specific and override rules. Rules run before Luna; opt-out,
missing API credentials, outages, or quotas leave manual entry available.

Set `OPENAI_API_KEY` only on the backend to enable external calls. `AI_CATEGORIZATION_MODEL`
defaults to `gpt-6-luna`. `AI_DAILY_QUOTA`, `AI_MONTHLY_QUOTA`, and
`AI_MONTHLY_SPEND_CEILING_USD` limit calls; `AI_RESERVED_COST_USD` conservatively reserves
budget per call. Tune the reservation to exceed expected cost per request. Description
and merchant are shortened and common identifiers redacted before submission; only
hashes, category IDs, token counts, and quota records are persisted. The provider call
uses strict JSON Schema restricted to active category IDs and `store=false`. No raw
transaction description or provider response is logged. Disable the switch to stop all
external submissions immediately; local rules and correction memory remain available.

After deployment, run `flask --app wsgi:app db upgrade` to add the MySQL InnoDB/utf8mb4
tables for corrections, cache, and quota accounting. Never expose the API key in Vite
environment variables or browser code.

## Backup and restore

Back up the local development database before migrations. Restore only to the intended local
database after verifying its name:

```bash
mysqldump -u campuscoin_app -p -h localhost --single-transaction campuscoin > campuscoin-backup.sql
mysql -u campuscoin_app -p -h localhost campuscoin < campuscoin-backup.sql
```

Use the hosting provider's managed backup and restore procedure for Aiven. Check migrations
against a disposable copy before restoring or downgrading any deployed database.
