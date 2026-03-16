# Guía de despliegue

Este documento describe cómo desplegar el monorepo en distintos entornos (desarrollo, staging, producción) y cómo evitar problemas con la base de datos TimescaleDB.

---

## Requisitos

- **Docker** y **Docker Compose** (recomendado para entornos consistentes).
- **Base de datos:** PostgreSQL con extensión **TimescaleDB**. El proyecto usa la imagen `timescale/timescaledb:latest-pg16`; no uses PostgreSQL estándar sin la extensión si usas la app `analytics`.

---

## Variables de entorno

Copia `.env.example` a `.env` en la **raíz del monorepo** y ajusta los valores.

### Imprescindibles en cualquier entorno

| Variable        | Descripción                          | Ejemplo (desarrollo)   |
|----------------|--------------------------------------|-------------------------|
| `SECRET_KEY`   | Clave secreta de Django              | Cadena larga y aleatoria |
| `DB_PASSWORD`  | Contraseña de PostgreSQL             | `postgres` (cambiar en prod) |
| `DB_NAME`      | Nombre de la base de datos           | `psicologia`            |
| `DB_USER`      | Usuario de la base de datos          | `postgres`              |
| `DB_HOST`      | Host de la BD (Docker: `db`)         | `db` o `127.0.0.1`      |
| `DB_PORT`      | Puerto de PostgreSQL                 | `5432`                  |

### Entorno de desarrollo (Docker)

- `DJANGO_SETTINGS_MODULE=config.settings.development`
- `DEBUG=True`
- `ALLOWED_HOSTS=localhost,127.0.0.1`
- Docker Compose ya fija `DB_HOST=db` para el servicio backend.

### Staging / Producción

- `DEBUG=False`
- `SECRET_KEY` único y seguro (no reutilizar el de desarrollo).
- `ALLOWED_HOSTS` con el dominio/host del backend (ej. `api.tudominio.com,backend.tudominio.com`).
- `CORS_ALLOWED_ORIGINS` con la URL del frontend (ej. `https://app.tudominio.com`).
- `DB_PASSWORD` fuerte y `DB_HOST` apuntando al servidor de base de datos (TimescaleDB).
- Opcional: `ACCOUNT_EMAIL_VERIFICATION=mandatory` si usas correo para registro.

### APIs externas (opcional)

- `ANTHROPIC_API_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` según funcionalidades que actives.

---

## Despliegue con Docker (recomendado)

Desde la **raíz del monorepo**:

```bash
cp .env.example .env
# Editar .env (SECRET_KEY, DB_PASSWORD, y en producción: DEBUG, ALLOWED_HOSTS, CORS)

docker compose up --build -d
docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py createsuperuser
```

- **Backend:** http://localhost:8000  
- **Admin:** http://localhost:8000/admin/  
- **Frontend:** http://localhost:3000  

### Desplegar en otro ambiente (nueva máquina / staging / producción)

1. Clonar el repo y tener el **mismo código** (incluidas las migraciones actualizadas).
2. Crear `.env` en la raíz con los valores del entorno (ver sección de variables).
3. Levantar y migrar:

   ```bash
   docker compose up --build -d
   docker compose exec backend python manage.py migrate
   docker compose exec backend python manage.py createsuperuser
   ```

Con una **base de datos nueva**, las migraciones se aplican en orden (0001, 0002, …). No hace falta ningún paso extra para TimescaleDB; la migración `analytics.0002_convert_to_hypertables` ya está preparada para crear las hypertables correctamente.

---

## Base de datos: TimescaleDB y migraciones

- La app **analytics** guarda métricas en **hypertables** de TimescaleDB.
- La migración `0002_convert_to_hypertables` convierte las tablas creadas en `0001_initial` en hypertables (clave primaria e índices únicos incluyen la columna de tiempo, como exige TimescaleDB).

### Si la migración `analytics.0002_convert_to_hypertables` falló a medias

En un entorno donde esa migración falló a mitad (por ejemplo, por una versión antigua de la migración), puedes revertir y volver a aplicar:

```bash
docker compose exec backend python manage.py migrate analytics 0001_initial
docker compose exec backend python manage.py migrate
```

En **despliegues nuevos** (DB vacía) no deberías necesitar esto si usas el código actual.

---

## Desarrollo local sin Docker (solo backend)

Con PostgreSQL + TimescaleDB instalado localmente (o un contenedor solo de DB):

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate   # Windows
pip install -r requirements/development.txt
# .env en la raíz con DB_HOST=127.0.0.1 (o el host de tu BD)
python manage.py migrate
python manage.py runserver
```

Desde `backend/` también puedes usar: `make migrate` y `make run`.

---

## Checklist para staging/producción

- [ ] `DEBUG=False`
- [ ] `SECRET_KEY` nuevo y seguro
- [ ] `ALLOWED_HOSTS` con el dominio del backend
- [ ] `CORS_ALLOWED_ORIGINS` con la URL del frontend
- [ ] `DB_PASSWORD` fuerte; BD accesible desde el backend (TimescaleDB)
- [ ] Migraciones aplicadas (`migrate`)
- [ ] Superusuario creado si aplica
- [ ] Frontend construido para producción (`npm run build`) y servido (ej. Nginx) apuntando a la API correcta (`VITE_API_URL` o equivalente en build)

---

Para levantar el proyecto por primera vez en desarrollo, ver también el [README](README.md).

---

### Nota para más adelante: configuración de usuario

Cuando se construya la **página de configuración de usuario**, el selector de **formato de fecha** ya estará preparado: el modelo `PatientProfile` y `TherapistProfile` tienen el campo `date_format` (opciones: dd/mm/aaaa, mm/dd/aaaa, aaaa-mm-dd), el serializer lo expone en el perfil y el login/me devuelven `user.profile.date_format`. El store de auth persiste `user` (con `profile`) y el helper `src/utils/dates.js` usa `useAuthStore.getState().user?.profile?.date_format` en `formatDate()`. Solo faltará añadir la UI del selector en la página de configuración.
