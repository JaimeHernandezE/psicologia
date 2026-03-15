# Multi-stage: development y production
# Build con: docker build -f backend/Dockerfile --target development backend/
# o: docker build -f backend/Dockerfile --target production backend/

FROM python:3.12-slim as base
WORKDIR /app

# Dependencias del sistema para psycopg2
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Dependencias Python
COPY backend/requirements/base.txt requirements/base.txt
RUN pip install --no-cache-dir -r requirements/base.txt

# ========== Development ==========
FROM base as development
COPY backend/requirements/development.txt requirements/development.txt
RUN pip install --no-cache-dir -r requirements/development.txt
COPY backend/ .
# En desarrollo el código se monta como volumen; entrypoint espera postgres y ejecuta el comando
COPY backend/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]

# ========== Production ==========
FROM base as production
COPY backend/requirements/production.txt requirements/production.txt
RUN pip install --no-cache-dir -r requirements/production.txt
COPY backend/ .
COPY backend/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]
CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000"]
