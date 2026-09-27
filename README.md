# CampusCoin frontend

## Local setup

Install Node dependencies with `npm ci`, then start the API using the instructions in [`api/README.md`](api/README.md). Run migrations and `flask --app wsgi:app seed-categories` before using an API test account. With the API on port 5000, run `npm run dev`. Vite proxies `/api` to `http://localhost:5000`, so browser requests, cookies, and CSRF use one origin during local development. If port 5000 is occupied, start Flask on another port and set `CAMPUSCOIN_API_PROXY_TARGET=http://localhost:<port>` when starting Vite. The API's `FRONTEND_ORIGINS` defaults to `http://localhost:5173` for direct cross-origin development requests.

The frontend defaults to `VITE_DATA_MODE=live`. Identity screens use the API; financial and onboarding screens show a protected availability page until their rollout phases are complete. Set `VITE_DATA_MODE=mock` only when intentionally viewing the local demo. Set `VITE_API_BASE_URL` to the versioned API root if it differs from `/api/v1`.

Signup verification and password recovery send six-digit codes through Gmail SMTP. Configure `SMTP_USERNAME`, `SMTP_APP_PASSWORD`, and `SMTP_FROM` in `api/.env`. The Gmail account needs 2-Step Verification and an app password. Do not use the regular Gmail password. The API seeds categories, not student accounts. Signed-in screens provide breadcrumbs and a persistent dark-mode toggle in Settings.

The separate administrator panel is available directly at `/admin`. Seed an administrator with the backend `seed-admin` command, then sign in there; student credentials cannot access it. The panel uses the live API even when the student demo is in mock mode. It includes usage counts, account controls, and system category management. Announcement/tip-template management and most-used-category statistics await backend APIs.

For an existing administrator whose password is unknown, open `/admin`, choose **Forgot password?**, and enter the address configured as `ADMIN_EMAIL` in `api/.env`. Verify the six-digit code delivered to that mailbox first; the new-password form appears only after verification. After reset, the form returns to `/admin` for sign-in. Configure working `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_APP_PASSWORD`, and `SMTP_FROM` in `api/.env` first. The code expires after 10 minutes; requests have a resend cooldown. The existing password cannot be read from the database, and rerunning `seed-admin` does not replace it. Keep SMTP credentials and reset codes private; never commit `.env`.

## Deployment

Serve `/api/v1` through the same HTTPS origin as the frontend, or use HTTPS subdomains that are same-site and explicitly listed in `FRONTEND_ORIGINS`. Credentialed cross-origin requests require the exact frontend origin, not `*`. Auth cookies are `Secure`, `HttpOnly`, and `SameSite=Lax` in production. Configure the frontend host's reverse proxy to forward `/api/v1` to Flask; Vite's development proxy does not run in production. Set production API and data mode values in the deployment environment when live screens are ready.

Run `npm run build`, `npm run lint`, and `npm run test:api-client` to verify the frontend foundation.
