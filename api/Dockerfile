# CampusCoin API production image.
# Build context is the api/ directory (see dockerContext in render.yaml).
FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PORT=8000

WORKDIR /srv/api

# Copy metadata first so dependency layers stay cached across code changes.
COPY pyproject.toml ./
COPY app ./app
COPY migrations ./migrations
COPY alembic.ini wsgi.py openapi.yaml ./

# gunicorn comes from pyproject dependencies; .env is deliberately not baked
# in (secrets arrive as environment variables from the host).
RUN pip install --no-cache-dir . \
    && useradd --create-home --uid 10001 --shell /usr/sbin/nologin appuser \
    && mkdir -p /srv/api/instance \
    && chown -R appuser:appuser /srv/api

USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD python -c "import os,urllib.request;urllib.request.urlopen('http://127.0.0.1:%s/health' % os.environ.get('PORT','8000'), timeout=4)"

# Hosts such as Render inject $PORT. Migrations and the idempotent category seed
# run at boot because Render's pre-deploy command is paid-only on the free plan;
# both are no-ops once the schema is current. Override the Docker Command in the
# host's settings to skip them (e.g. `gunicorn ... wsgi:app`).
CMD ["sh", "-c", "flask --app wsgi:app db upgrade && flask --app wsgi:app seed-categories && exec gunicorn --bind 0.0.0.0:${PORT:-8000} --workers 2 --threads 4 --timeout 120 --access-logfile - wsgi:app"]
