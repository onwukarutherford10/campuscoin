# CampusCoin frontend

## Local setup

Install Node dependencies with `npm ci`, then start the API using the instructions in [`api/README.md`](api/README.md). Run migrations and `flask --app wsgi:app seed-categories` before using an API test account. With the API on port 5000, run `npm run dev`. Vite proxies `/api` to `http://localhost:5000`, so browser requests, cookies, and CSRF use one origin during local development. If port 5000 is occupied, start Flask on another port and set `CAMPUSCOIN_API_PROXY_TARGET=http://localhost:<port>` when starting Vite. The API's `FRONTEND_ORIGINS` defaults to `http://localhost:5173` for direct cross-origin development requests.

The frontend defaults to `VITE_DATA_MODE=live`. Set `VITE_DATA_MODE=mock` only when intentionally viewing the local demo. Set `VITE_API_BASE_URL` to the versioned API root if it differs from `/api/v1`.

Signup verification and password recovery send six-digit codes through Gmail SMTP. Configure `SMTP_USERNAME`, `SMTP_APP_PASSWORD`, and `SMTP_FROM` in `api/.env`. The Gmail account needs 2-Step Verification and an app password. Do not use the regular Gmail password. The API can seed a private evaluation student with `seed-evaluation`. Signed-in screens provide breadcrumbs and a persistent dark-mode toggle in Settings.

Transaction category suggestions now use local word matching against existing income and expense categories, plus account-specific corrections. No AI service is called. Reports can be downloaded as branded PDF or PNG exports. The notification bell opens a dropdown of budget alerts.

The separate administrator panel is available directly at `/admin`. Seed an administrator with the backend `seed-admin` command, then sign in there; student credentials cannot access it. The panel uses the live API even when the student demo is in mock mode. It includes usage counts, most-used categories, account controls, system category management, and announcement/tip-template publishing. See the [OpenAPI specification](api/openapi.yaml) for endpoint documentation.

For an existing administrator whose password is unknown, open `/admin`, choose **Forgot password?**, and enter the address configured as `ADMIN_EMAIL` in `api/.env`. Verify the six-digit code delivered to that mailbox first; the new-password form appears only after verification. After reset, the form returns to `/admin` for sign-in. Configure working `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_APP_PASSWORD`, and `SMTP_FROM` in `api/.env` first. The code expires after 10 minutes; requests have a resend cooldown. The existing password cannot be read from the database, and rerunning `seed-admin` does not replace it. Keep SMTP credentials and reset codes private; never commit `.env`.

## Deployment

Serve `/api/v1` through the same HTTPS origin as the frontend, or use HTTPS subdomains that are same-site and explicitly listed in `FRONTEND_ORIGINS`. Credentialed cross-origin requests require the exact frontend origin, not `*`. Auth cookies are `Secure`, `HttpOnly`, and `SameSite=Lax` in production. Configure the frontend host's reverse proxy to forward `/api/v1` to Flask; Vite's development proxy does not run in production. Set production API and data mode values in the deployment environment when live screens are ready.

Run `npm run build`, `npm run lint`, and `npm run test:api-client` to verify the frontend foundation.

## Installation

Install Node.js, Python 3.11+, and Homebrew MySQL. Start MySQL with `brew services start mysql` and verify it with `mysqladmin ping`. Create the `campuscoin` and `campuscoin_test` databases with utf8mb4 and separate least-privilege users as described in the [backend setup guide](api/README.md).

From `api/`, run:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -e '.[dev]'
cp .env.example .env
python -c 'import secrets; print(secrets.token_urlsafe(64))' # SECRET_KEY
```

In the ignored `api/.env`, set `SECRET_KEY` and `DATABASE_URL=mysql+pymysql://campuscoin_app:<url-encoded-password>@localhost:3306/campuscoin?charset=utf8mb4`. Then run:

```bash
flask --app wsgi:app db upgrade
flask --app wsgi:app seed-categories
ADMIN_EMAIL='<private-admin-email>' ADMIN_PASSWORD='<unique-password-12+-chars>' flask --app wsgi:app seed-admin
EVAL_STUDENT_EMAIL='<private-student-email>' EVAL_STUDENT_PASSWORD='<different-password-12+-chars>' flask --app wsgi:app seed-evaluation
flask --app wsgi:app run --port 5000
```

The seed commands do not overwrite existing passwords. Keep evaluation credentials and `.env` out of Git; share credentials privately if needed. From the repository root, run `npm ci` and `npm run dev`. The tracked `.env.development` selects the live API, and Vite proxies `/api` to Flask on port 5000. Check `curl http://localhost:5000/health` and `curl http://localhost:5000/ready`. Run backend tests with `cd api && .venv/bin/pytest`; run frontend checks with `npm run build`.

For Aiven MySQL deployment, configure its connection URL and project CA in the hosting provider, then run the same migrations and seeds there. The free service suits this academic project and small demonstrations, not high-traffic production. See the backend guide for MySQL creation, backup/restore, Aiven TLS, and test-database safety. Stored MySQL `DATETIME(6)` values are normalized to UTC and returned with `+00:00`; money uses `DECIMAL` and two-decimal API strings.

## AI-use acknowledgement

OpenAI Codex assisted with code and documentation changes for this project, including the administrative content and statistics implementation. The developer remains responsible for reviewing the work, running tests, and checking security and correctness. Disclose any additional AI tools actually used before submission.

Current transaction-category suggestions use deterministic matching of existing categories, related words, and per-user correction memory. They do not send transaction descriptions to an AI provider. Any future external AI feature must require explicit student consent, minimize submitted data, enforce quotas, and keep financial calculations deterministic.
