# CampusCoin frontend

## Local setup

Install Node dependencies with `npm ci`, then start the API using the instructions in [`api/README.md`](api/README.md). Run migrations and `flask --app wsgi:app seed-categories` before using an API test account. With the API on port 5000, run `npm run dev`. Vite proxies `/api` to `http://localhost:5000`, so browser requests, cookies, and CSRF use one origin during local development. If port 5000 is occupied, start Flask on another port and set `CAMPUSCOIN_API_PROXY_TARGET=http://localhost:<port>` when starting Vite. The API's `FRONTEND_ORIGINS` defaults to `http://localhost:5173` for direct cross-origin development requests.

The frontend defaults to `VITE_DATA_MODE=live`. Identity screens use the API; financial and onboarding screens show a protected availability page until their rollout phases are complete. Set `VITE_DATA_MODE=mock` only when intentionally viewing the local demo. Set `VITE_API_BASE_URL` to the versioned API root if it differs from `/api/v1`.

Signup sends a six-digit verification code through Gmail SMTP. Configure `SMTP_USERNAME`, `SMTP_APP_PASSWORD`, and `SMTP_FROM` in `api/.env`. The Gmail account needs 2-Step Verification and an app password. Do not use the regular Gmail password. The API seeds categories, not student accounts.

## Deployment

Serve `/api/v1` through the same HTTPS origin as the frontend, or use HTTPS subdomains that are same-site and explicitly listed in `FRONTEND_ORIGINS`. Credentialed cross-origin requests require the exact frontend origin, not `*`. Auth cookies are `Secure`, `HttpOnly`, and `SameSite=Lax` in production. Configure the frontend host's reverse proxy to forward `/api/v1` to Flask; Vite's development proxy does not run in production. Set production API and data mode values in the deployment environment when live screens are ready.

Run `npm run build`, `npm run lint`, and `npm run test:api-client` to verify the frontend foundation.
