#!/bin/sh
set -e

# Esperar a que PostgreSQL esté listo
export PGHOST="${DB_HOST:-db}"
export PGPORT="${DB_PORT:-5432}"
export PGUSER="${DB_USER:-postgres}"
export PGPASSWORD="${DB_PASSWORD:-}"

echo "Waiting for PostgreSQL at $PGHOST:$PGPORT..."
until python -c "
import os
import sys
try:
    import psycopg2
    conn = psycopg2.connect(
        dbname=os.environ.get('DB_NAME', 'psicologia'),
        user=os.environ.get('DB_USER', 'postgres'),
        password=os.environ.get('DB_PASSWORD', ''),
        host=os.environ.get('DB_HOST', 'db'),
        port=os.environ.get('DB_PORT', '5432'),
        connect_timeout=2,
    )
    conn.close()
    sys.exit(0)
except Exception:
    sys.exit(1)
" 2>/dev/null; do
  sleep 2
done
echo "PostgreSQL is ready."

exec "$@"
