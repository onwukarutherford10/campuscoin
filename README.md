# CampusCoin frontend

## Local setup

Install Node dependencies with `npm ci`, then start the API using the instructions in [`api/README.md`](api/README.md). Run migrations and `flask --app wsgi:app seed-categories` before using an API test account. With the API on port 5000, run `npm run dev`. Vite proxies `/api` to `http://localhost:5000`, so browser requests, cookies, and CSRF use one origin during local development. If port 5000 is occupied, start Flask on another port and set `CAMPUSCOIN_API_PROXY_TARGET=http://localhost:<port>` when starting Vite. The API's `FRONTEND_ORIGINS` defaults to `http://localhost:5173` for direct cross-origin development requests.

The frontend defaults to `VITE_DATA_MODE=mock` in `.env.development` and `.env.production`. The current screens still use local demo data. Setting `VITE_DATA_MODE=live` blocks those screens until they have been migrated, so API failures cannot silently show local financial data. Phase 0 provides the shared client and data contracts; later phases will enable each screen. Set `VITE_API_BASE_URL` to the versioned API root if it differs from `/api/v1`.

For a local test account, use the API's `/api/v1/auth/csrf` and `/api/v1/auth/register` endpoints or wait for the Phase 1 signup integration. The API seeds categories, not student accounts. Never use the demo account data as server data.

## Deployment

Serve `/api/v1` through the same HTTPS origin as the frontend, or use HTTPS subdomains that are same-site and explicitly listed in `FRONTEND_ORIGINS`. Credentialed cross-origin requests require the exact frontend origin, not `*`. Auth cookies are `Secure`, `HttpOnly`, and `SameSite=Lax` in production. Configure the frontend host's reverse proxy to forward `/api/v1` to Flask; Vite's development proxy does not run in production. Set production API and data mode values in the deployment environment when live screens are ready.

Run `npm run build`, `npm run lint`, and `npm run test:api-client` to verify the frontend foundation.
