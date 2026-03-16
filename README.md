# Monorepo Psicología

Estructura:

- **backend/** — Django 5 + DRF + PostgreSQL (TimescaleDB)
- **frontend/** — React + Vite
- **shared/** — utilidades compartidas

### Base de datos (TimescaleDB)

La base de datos usa **PostgreSQL con extensión TimescaleDB** (imagen `timescale/timescaledb:latest-pg16`). La app `analytics` guarda métricas en hypertables; las migraciones ya contemplan los requisitos de TimescaleDB (clave primaria y índices únicos que incluyen la columna de partición por tiempo). En un **despliegue nuevo** (DB vacía), `docker compose up` + `migrate` es suficiente y no requiere pasos extra.

**Si en algún entorno la migración `analytics.0002_convert_to_hypertables` falló a medias:** revertir y volver a aplicar:

```bash
docker compose exec backend python manage.py migrate analytics 0001_initial
docker compose exec backend python manage.py migrate
```

Para despliegue en otros entornos, variables de entorno y checklist de producción, ver **[DEPLOYMENT.md](DEPLOYMENT.md)**.

## Levantar el proyecto por primera vez (Docker)

Desde la **raíz del monorepo**:

```bash
# 1. Copiar variables de entorno
cp .env.example .env
# Editar .env y asegurar SECRET_KEY y DB_PASSWORD (ej. DB_PASSWORD=postgres)

# 2. Levantar todos los servicios (db, backend, frontend)
docker compose up --build

# 3. En otra terminal: migrar y crear superusuario
docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py createsuperuser
```

- **Backend (API):** http://localhost:8000  
- **Admin Django:** http://localhost:8000/admin/  
- **Frontend:** http://localhost:3000 (redirige al dev server Vite en el contenedor)

## Desarrollo local sin Docker (solo backend)

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate   # Windows
# source .venv/bin/activate  # Linux/macOS
pip install -r requirements/development.txt
cp ../.env.example ../.env
# Crear backend/.env o exportar variables (DB_HOST=127.0.0.1 si Postgres local)
python manage.py migrate
python manage.py runserver
```

O con Make: `make migrate` y `make run` (desde `backend/`).
