# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Mental health therapy continuity app ("Psicología App") with two user roles: **therapist** and **patient**. Built as a Django REST API backend + React SPA frontend, orchestrated via Docker Compose.

## Development Commands

### Docker (recommended — full stack)
```bash
docker compose up --build        # Start all services (PostgreSQL, backend, frontend)
docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py createsuperuser
```

### Backend (local, without Docker)
```bash
cd backend
pip install -r requirements/development.txt
python manage.py runserver       # Dev server at localhost:8000
python manage.py test            # Run all tests
python manage.py test apps.users # Run tests for a single app
make migrate                     # makemigrations + migrate
make shell                       # Django shell
```

### Frontend (local)
```bash
cd frontend
npm install
npm run dev      # Vite dev server at localhost:5173 (but Docker maps to :3000)
npm run build    # Production build → dist/
```

## Architecture

### Backend (`backend/`)
- **Framework:** Django 5 + Django REST Framework
- **Settings:** Split by environment — `config/settings/{base,development,production}.py`. Set via `DJANGO_SETTINGS_MODULE`.
- **Apps** in `backend/apps/`:
  - `users` — Custom User model (email auth, role: patient/therapist, Google OAuth)
  - `links` — TherapistPatientLink relationships + invitation flow
  - `journal` — Patient journal entries
  - `summaries` — Therapy session summaries (calls Anthropic Claude API)
  - `tasks` — Task assignment & progress tracking
  - `chat` — Chat messages (feature-flagged via `CHAT_ENABLED` env var)
  - `notifications` — Session alerts & notification preferences
  - `core` — Shared permissions and utilities
- **Auth:** JWT via `djangorestframework-simplejwt` (15-min access, 7-day refresh) + Google OAuth via `django-allauth`
- **API Docs:** drf-spectacular at `/api/docs/` (debug mode only)

### Frontend (`frontend/src/`)
- **Framework:** React 18 + Vite 6
- **Routing:** React Router v6 with a `ProtectedRoute` HOC that gates by auth status and user role
- **Server state:** TanStack Query (React Query) — all API calls go through hooks using this
- **Client state:** Zustand (`stores/authStore`) for auth tokens and user info
- **HTTP:** Axios client in `api/client.js` with base URL from `VITE_API_URL`
- **Styling:** SCSS modules; global variables/mixins in `styles/abstracts/`
- **Validation:** Zod for form schemas

### Service Ports
| Service | Port |
|---------|------|
| Frontend | 3000 (Docker) / 5173 (Vite direct) |
| Backend | 8000 |
| PostgreSQL | 5432 |

## Environment Variables

Copy `.env.example` to `.env`. Key variables:

```
DJANGO_SETTINGS_MODULE=config.settings.development
SECRET_KEY=...
DB_NAME=psicologia / DB_USER / DB_PASSWORD / DB_HOST / DB_PORT
ANTHROPIC_API_KEY=...               # Required for summaries feature
ANTHROPIC_SUMMARY_MODEL=claude-sonnet-4-20250514
GOOGLE_CLIENT_ID= / GOOGLE_CLIENT_SECRET=  # Optional, for OAuth
CHAT_ENABLED=False                  # Feature flag
VITE_API_URL=http://localhost:8000  # Frontend → backend URL
```

## Key Patterns

- **Role-based access:** User role (`patient` / `therapist`) controls both backend permissions (via `core` app) and frontend routing/pages.
- **AI integration:** The `summaries` app calls the Anthropic API; model is configurable via `ANTHROPIC_SUMMARY_MODEL`.
- **Feature flags:** `CHAT_ENABLED` env var gates the chat feature end-to-end.
- **Invitation flow:** Therapists invite patients via the `links` app; patients accept from their `InvitationsPage`.
- **Language/Locale:** Django configured for Spanish (`es-es`) and `Europe/Madrid` timezone.
