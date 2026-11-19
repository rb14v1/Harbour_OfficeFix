# OfficeFix: Office Maintenance Management System

OfficeFix is an internal web app for reporting and managing office maintenance issues. Employees submit requests. Administrators review them, assign technicians, track status, and record how each issue was resolved.

## Features

- **Dashboard:** request counts by status, high-priority unresolved requests, technician totals, recent requests, and workload per technician. All figures come from PostgreSQL.
- **Submit request:** employee name and email, issue title, category (with a description field when "Other" is chosen), office location or floor, description, and priority.
- **Maintenance requests:** searchable table with status, priority, category, and assignment filters. Admins can view and edit a request, assign or reassign a technician, change status, record resolution notes, and delete a request after confirmation.
- **Technicians:** add and edit technicians, mark them Available or Unavailable, and see active request counts. Only Available technicians can be newly assigned.

Business rules, enforced by the API and by database constraints:
- New requests start as `Open` and may be unassigned.
- Marking a request `Resolved` records a resolution date. Reopening it clears that date.
- An Unavailable technician cannot be newly assigned. Existing assignments are kept.
- Names may contain letters, spaces, hyphens, apostrophes and periods. Titles, locations and specialisations allow letters, numbers and `. , - ( ) / & ' #`. Markup, emoji and other symbols are rejected.
- Field length limits are shown on every input.

## Technology stack

| Layer | Technology |
|---|---|
| Backend | Python 3.13, Django 5.2, Django REST Framework, drf-spectacular (API docs), gunicorn |
| Database | PostgreSQL 17 (local), compatible with Azure Database for PostgreSQL |
| Frontend | React 18, Vite 6, React Router 6, Bootstrap 5, Axios |
| Deployment | Docker Compose: nginx serves the React build and proxies `/api` to the Django API |
| Tests | Django test runner (API and model tests) |

## Folder structure

```
officefix/
├── README.md
├── CLAUDE.md
├── .gitignore
├── .dockerignore
├── .env.example             root variables for docker compose (copy to .env)
├── docker-compose.yml       services: api (Django) and web (nginx + React build)
├── backend/
│   ├── Dockerfile
│   ├── manage.py
│   ├── requirements.txt
│   ├── .env.example
│   ├── config/              project settings, URLs, error handling, WSGI/ASGI
│   └── maintenance/         the app
│       ├── models.py        Technician, MaintenanceRequest (with CHECK constraints)
│       ├── validators.py    name, text and email rules
│       ├── serializers.py   request and response shapes
│       ├── services.py      business rules (assignment, status, dashboard)
│       ├── views.py         API views
│       ├── urls.py          /api/v1 routes
│       ├── migrations/      0001_initial (commit this)
│       └── tests/           test_requests, test_technicians, test_dashboard
├── frontend/
│   ├── Dockerfile           build stage (Node) and serve stage (nginx)
│   ├── nginx.conf           static files, /api proxy, SPA fallback
│   ├── package.json, package-lock.json, vite.config.js, index.html
│   ├── .env.example
│   └── src/
│       ├── main.jsx, App.jsx        router and layout
│       ├── components/              sidebar, modals, badges, forms
│       ├── pages/                   dashboard, requests, submit, technicians
│       ├── services/                api.js (all HTTP calls), validation.js, format.js
│       └── styles/custom.css
└── infra/
    └── README.md            reserved for Harbour deployment configuration
```

## Prerequisites

- **Python 3.13** (the project was built and tested with 3.13.18).
- **Node.js 22 or later** with npm. Built and tested with Node 24.
- **PostgreSQL 17**, running locally (tested with 17.12).
- **Docker Desktop** only if you want to run the containers (see "Docker"). Not required for local development.

On Windows, PowerShell may block `npm` scripts. Use `npm.cmd` in place of `npm`, for example `npm.cmd run dev`.

## 1. PostgreSQL setup

Create one application role and two databases. Run these as the `postgres` superuser:

```sql
CREATE ROLE officefix_app LOGIN PASSWORD '<choose-a-strong-password>';
CREATE DATABASE officefix OWNER officefix_app;
CREATE DATABASE officefix_test OWNER officefix_app;
```

Then, connected as `officefix_app`, create the schema the app uses in each database. The app keeps its tables in their own schema so they don't clash with any other tables in the same database:

```sql
-- in database officefix
CREATE SCHEMA IF NOT EXISTS django_app;

-- in database officefix_test
CREATE SCHEMA IF NOT EXISTS django_test;
```

The app role owns both databases, so it needs no superuser rights.

## 2. Backend setup

Run from `backend/`:

```powershell
cd backend
py -3.13 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

Create `backend/.env` from `backend/.env.example` and fill in the placeholders:

```
DJANGO_SECRET_KEY=<long random string>
DJANGO_DEBUG=True
DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1
DATABASE_URL=postgresql://officefix_app:<password>@localhost:5432/officefix
DJANGO_DB_SCHEMA=django_app
TEST_DATABASE_URL=postgresql://officefix_app:<password>@localhost:5432/officefix_test
DJANGO_TEST_SCHEMA=django_test
CORS_ORIGINS=http://localhost:5173
```

Generate a secret key with:

```powershell
.\.venv\Scripts\python.exe -c "import secrets; print(secrets.token_urlsafe(50))"
```

`backend/.env` holds your password and secret. It is gitignored. Do not commit it.

**Apply migrations:**

```powershell
.\.venv\Scripts\python.exe manage.py migrate
```

Migrations for the app live in `maintenance/migrations/`. Create new ones after changing models with `manage.py makemigrations maintenance`. Review each file before applying it.

## 3. Run the backend

From `backend/`:

```powershell
.\.venv\Scripts\python.exe manage.py runserver 8001
```

- API base: `http://localhost:8001/api/v1`
- Health check: `http://localhost:8001/health`
- API documentation (Swagger UI): `http://localhost:8001/api/docs`
- OpenAPI schema: `http://localhost:8001/api/schema`

All API paths have no trailing slash. A trailing slash returns 404.

## 4. Frontend setup

Run from `frontend/`:

```powershell
cd frontend
npm.cmd install
```

The frontend reads `VITE_API_BASE_URL` (default `http://localhost:8001`). To set it explicitly, copy `frontend/.env.example` to `frontend/.env`. Use the base URL only, with no trailing slash and no `/api/v1`.

**Start the development server:**

```powershell
npm.cmd run dev
```

Open **http://localhost:5173**. The backend's `CORS_ORIGINS` must include that origin.

**Build for production:**

```powershell
npm.cmd run build
```

The output goes to `frontend/dist/`.

## 5. Running the application locally

Use two terminals:

1. **Backend:** `backend\`, then `.\.venv\Scripts\python.exe manage.py runserver 8001`
2. **Frontend:** `frontend\`, then `npm.cmd run dev`

Then open http://localhost:5173.

## 6. Tests

Run the backend test suite from `backend/`:

```powershell
.\.venv\Scripts\python.exe manage.py test --keepdb
```

- `--keepdb` reuses the existing `officefix_test` database (and its `django_test` schema) instead of creating a new database, which the app role cannot do.
- Each test runs in a transaction that is rolled back, so the test data does not remain.
- The suite has 59 tests covering requests, technicians, dashboard, validation rules, the Other category, and the health and schema endpoints.

Validate the OpenAPI schema with warnings treated as errors:

```powershell
.\.venv\Scripts\python.exe manage.py spectacular --validate --fail-on-warn --file schema.yaml
```

Build the frontend to check it compiles:

```powershell
cd ..\frontend
npm.cmd run build
```

## 7. Docker (docker compose)

The Docker setup runs two containers: `api` (Django with gunicorn) and `web` (nginx serving the React build and forwarding `/api` to `api`). The database is not in Docker. It stays on your machine or in Azure.

1. Copy `.env.example` (in the project root) to `.env` and fill in:
   - `DATABASE_URL` using `host.docker.internal` when PostgreSQL runs on your machine:
     `postgresql://officefix_app:<password>@host.docker.internal:5432/officefix`
   - `DJANGO_SECRET_KEY`
2. From the project root:

```powershell
docker compose up --build
```

Open **http://localhost:8080**. The API container runs `migrate` on start.

Stop with Ctrl+C, or run `docker compose down`.

These Docker files have not been built or run in this environment, because Docker is not installed here. Verify them on a machine with Docker before relying on them.

## API summary

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/v1/requests` | List requests. Filters: `status`, `category`, `priority` |
| POST | `/api/v1/requests` | Create a request (201) |
| GET | `/api/v1/requests/{id}` | Get one request |
| PATCH | `/api/v1/requests/{id}` | Update fields, assign technician, change status, resolution notes |
| DELETE | `/api/v1/requests/{id}` | Delete (204) |
| GET | `/api/v1/technicians` | List technicians with active request counts |
| POST | `/api/v1/technicians` | Create a technician (201) |
| GET | `/api/v1/technicians/{id}` | Get one technician |
| PATCH | `/api/v1/technicians/{id}` | Edit details or availability |
| GET | `/api/v1/dashboard/stats` | Dashboard figures |
| GET | `/health` | Health check (includes a database probe) |

Errors use these status codes: 404 for missing records, 409 for conflicts such as a duplicate technician email, and 422 for validation or business-rule failures. Validation errors return a list of messages per field.

## Troubleshooting

- **`npm` is blocked in PowerShell:** use `npm.cmd`, or run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` once.
- **`relation ... does not exist`:** the schema is missing, or `DJANGO_DB_SCHEMA` does not match the schema you created. Run the `CREATE SCHEMA` statement and then `manage.py migrate`.
- **Browser says "Cannot reach the OfficeFix server":** the backend is not running on port 8001, or `VITE_API_BASE_URL` points somewhere else.
- **CORS errors:** the frontend origin is not listed in `CORS_ORIGINS`.
- **Health returns 503:** PostgreSQL is not running, or `DATABASE_URL` is wrong.

## Deployment

Harbour deployment has not been configured. The `infra/` folder is reserved for it and waits for Harbour's instructions and environment details.
