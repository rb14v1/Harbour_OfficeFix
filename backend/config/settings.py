import os
import re
import sys
from pathlib import Path

import dj_database_url
from django.core.exceptions import ImproperlyConfigured
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

TESTING = len(sys.argv) > 1 and sys.argv[1] == "test"


def env_bool(name, default=False):
    return os.environ.get(name, str(default)).strip().lower() in ("1", "true", "yes", "on")


def env_list(name, default):
    return [item.strip() for item in os.environ.get(name, default).split(",") if item.strip()]


def env_non_negative_int(name, default):
    raw = os.environ.get(name, "").strip()
    if not raw:
        return default
    try:
        value = int(raw)
    except ValueError:
        raise ImproperlyConfigured(f"{name} must be a whole number of seconds (got {raw!r}).")
    if value < 0:
        raise ImproperlyConfigured(f"{name} must be zero or greater (got {value}).")
    return value


SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "")
if not SECRET_KEY:
    raise ImproperlyConfigured("DJANGO_SECRET_KEY must be set (see backend/.env.example).")

DEBUG = env_bool("DJANGO_DEBUG", False)
ALLOWED_HOSTS = env_list("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1")

INSTALLED_APPS = [
    "django.contrib.contenttypes",
    "django.contrib.auth",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "corsheaders",
    "drf_spectacular",
    "maintenance",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"

# API paths are defined without trailing slashes. Do not redirect to a slash-terminated URL.
APPEND_SLASH = False

# Application tables live in their own PostgreSQL schema so they never collide with other tables in the same database.
SCHEMA_PATTERN = re.compile(r"^[a-z_][a-z0-9_]*$")

# Seconds a database connection is kept open for reuse (0 closes it after each request).
DB_CONN_MAX_AGE = env_non_negative_int("DB_CONN_MAX_AGE", 60)


def database_config():
    if TESTING:
        url = os.environ.get("TEST_DATABASE_URL", "")
        schema = os.environ.get("DJANGO_TEST_SCHEMA", "django_test")
    else:
        url = os.environ.get("DATABASE_URL", "")
        schema = os.environ.get("DJANGO_DB_SCHEMA", "django_app")
    if not url:
        raise ImproperlyConfigured("DATABASE_URL (or TEST_DATABASE_URL when testing) must be set.")
    if not SCHEMA_PATTERN.match(schema) or schema == "public":
        raise ImproperlyConfigured("DJANGO_DB_SCHEMA must be a simple schema name other than 'public'.")

    config = dj_database_url.parse(url, conn_max_age=DB_CONN_MAX_AGE, conn_health_checks=True)
    config["OPTIONS"] = {"options": f"-c search_path={schema}"}
    if TESTING:
        # Reuse the existing test database (created by hand). Django does not need CREATEDB rights.
        config["TEST"] = {"NAME": config["NAME"]}
    return {"default": config}


DATABASES = database_config()

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

REST_FRAMEWORK = {
    # The brief has no authentication in this version.
    "DEFAULT_AUTHENTICATION_CLASSES": [],
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.AllowAny"],
    "DEFAULT_PARSER_CLASSES": ["rest_framework.parsers.JSONParser"],
    "DEFAULT_RENDERER_CLASSES": ["rest_framework.renderers.JSONRenderer"],
    "TEST_REQUEST_DEFAULT_FORMAT": "json",
    "EXCEPTION_HANDLER": "config.exceptions.exception_handler",
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
}

SPECTACULAR_SETTINGS = {
    "TITLE": "OfficeFix API",
    "DESCRIPTION": "Office maintenance request and technician management.",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
}

CORS_ALLOWED_ORIGINS = [origin.rstrip("/") for origin in env_list("CORS_ORIGINS", "http://localhost:5173")]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
