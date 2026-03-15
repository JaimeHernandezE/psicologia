# Monorepo Psicología

Estructura:

- **backend/** — Django 5 + DRF + PostgreSQL
- **frontend/** — React + Vite
- **shared/** — utilidades compartidas

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
