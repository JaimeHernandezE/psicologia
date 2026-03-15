#!/usr/bin/env python3
"""Espera a que PostgreSQL esté listo y luego ejecuta el comando."""
import os
import sys
import time


def wait_for_postgres():
    import psycopg2
    dbname = os.environ.get("DB_NAME", "psicologia")
    user = os.environ.get("DB_USER", "postgres")
    password = os.environ.get("DB_PASSWORD", "")
    host = os.environ.get("DB_HOST", "db")
    port = os.environ.get("DB_PORT", "5432")
    print(f"Waiting for PostgreSQL at {host}:{port}...")
    while True:
        try:
            conn = psycopg2.connect(
                dbname=dbname,
                user=user,
                password=password,
                host=host,
                port=port,
                connect_timeout=2,
            )
            conn.close()
            print("PostgreSQL is ready.")
            return
        except Exception:
            time.sleep(2)


if __name__ == "__main__":
    wait_for_postgres()
    os.execvp(sys.argv[1], sys.argv[1:])
