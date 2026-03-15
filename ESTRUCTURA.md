# Estructura del repositorio

```
psicologia/                          # Raíz del monorepo
│
├── .env.example                     # Variables de entorno (copiar a .env)
├── .gitignore
├── docker-compose.yml               # Servicios: db, backend, frontend
├── README.md
│
├── backend/                         # Django 5 + DRF
│   ├── Dockerfile                   # Multi-stage (development / production)
│   ├── Makefile                     # run, migrate, shell, test, createsuperuser
│   ├── entrypoint.sh                # Espera a Postgres antes de arrancar
│   ├── manage.py
│   │
│   ├── config/                      # Configuración del proyecto
│   │   ├── __init__.py
│   │   ├── asgi.py
│   │   ├── urls.py
│   │   ├── wsgi.py
│   │   └── settings/
│   │       ├── __init__.py
│   │       ├── base.py              # Settings comunes, DB, JWT, CORS, allauth
│   │       ├── development.py       # DEBUG, CORS localhost:3000
│   │       └── production.py
│   │
│   ├── apps/                        # Apps Django
│   │   ├── __init__.py
│   │   ├── users/                   # Usuario custom (role, avatar, auth_provider)
│   │   │   ├── __init__.py
│   │   │   ├── admin.py
│   │   │   ├── apps.py
│   │   │   └── models.py
│   │   ├── links/                   # TherapistPatientLink, Group (pendiente)
│   │   │   ├── __init__.py
│   │   │   ├── admin.py
│   │   │   ├── apps.py
│   │   │   └── models.py
│   │   ├── journal/                 # JournalEntry (pendiente)
│   │   │   ├── __init__.py
│   │   │   ├── admin.py
│   │   │   ├── apps.py
│   │   │   └── models.py
│   │   ├── summaries/               # Summary, SummaryEntry (pendiente)
│   │   │   ├── __init__.py
│   │   │   ├── admin.py
│   │   │   ├── apps.py
│   │   │   └── models.py
│   │   ├── tasks/                   # Task, TaskProgress (pendiente)
│   │   │   ├── __init__.py
│   │   │   ├── admin.py
│   │   │   ├── apps.py
│   │   │   └── models.py
│   │   ├── chat/                    # ChatMessage, feature flag (pendiente)
│   │   │   ├── __init__.py
│   │   │   ├── admin.py
│   │   │   ├── apps.py
│   │   │   └── models.py
│   │   └── notifications/           # SessionAlert, preferencias (pendiente)
│   │       ├── __init__.py
│   │       ├── admin.py
│   │       ├── apps.py
│   │       └── models.py
│   │
│   ├── requirements/
│   │   ├── base.txt
│   │   ├── development.txt         # + django-debug-toolbar
│   │   └── production.txt
│   │
│   └── templates/
│       └── .gitkeep
│
├── frontend/                        # React + Vite
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── src/
│       ├── App.jsx
│       ├── main.jsx
│       └── index.css
│
└── shared/                          # Utilidades compartidas (vacío por ahora)
    └── .gitkeep
```

## Resumen por carpeta

| Carpeta      | Contenido |
|-------------|-----------|
| **Raíz**    | Config del monorepo: Docker, env, README. |
| **backend/** | Django: config, 7 apps (users con modelo User; resto con apps.py y placeholders), requirements, Dockerfile, entrypoint, Makefile. |
| **frontend/** | App React con Vite: entrada HTML, React en `src/`. |
| **shared/** | Reservada para código compartido; solo `.gitkeep`. |
