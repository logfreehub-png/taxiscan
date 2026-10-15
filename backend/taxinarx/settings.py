"""
Django settings for TaxiNarx project.
"""
from pathlib import Path
from datetime import timedelta
import os

BASE_DIR = Path(__file__).resolve().parent.parent


def _load_dotenv(path: Path) -> None:
    """Oddiy .env yuklovchi (python-dotenv shart emas).

    `KEY=VALUE` qatorlarini o'qib, hali o'rnatilmagan env o'zgaruvchilarini
    process muhitiga qo'shadi. Izoh (#) va bo'sh qatorlar e'tiborsiz qoldiriladi.
    """
    if not path.exists():
        return
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, val = line.partition("=")
        key = key.strip()
        val = val.strip().strip('"').strip("'")
        os.environ.setdefault(key, val)


_load_dotenv(BASE_DIR / ".env")

SECRET_KEY = os.environ.get(
    "DJANGO_SECRET_KEY",
    "django-insecure-change-me-in-production-3k8sj92mxz0eqp4l1nv7t6yb",
)

DEBUG = os.environ.get("DJANGO_DEBUG", "True").lower() == "true"

ALLOWED_HOSTS = ["*"]

# Email — dev'da konsolga chiqaradi; prod'da SMTP sozlamalarini env orqali bering
EMAIL_BACKEND = os.environ.get(
    "DJANGO_EMAIL_BACKEND",
    "django.core.mail.backends.console.EmailBackend" if DEBUG
    else "django.core.mail.backends.smtp.EmailBackend",
)
DEFAULT_FROM_EMAIL = os.environ.get("DEFAULT_FROM_EMAIL", "TaxiNarx <noreply@taxinarx.uz>")

INSTALLED_APPS = [
    # Daphne — runserver'ni ASGI (WebSocket) rejimida ishlatishi uchun eng tepada
    "daphne",

    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",

    # 3rd party
    "channels",
    "rest_framework",
    "rest_framework_simplejwt",
    "corsheaders",
    "django_filters",
    "drf_spectacular",

    # local apps
    "apps.users",
    "apps.taxi",
    "apps.billing",
    "apps.stats",
    "apps.admin_api",
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
    "apps.users.middleware.ActivityTrackingMiddleware",
]

ROOT_URLCONF = "taxinarx.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "taxinarx.wsgi.application"
ASGI_APPLICATION = "taxinarx.asgi.application"

# Real-time bildirishnoma (WebSocket) — bitta jarayonli dev uchun xotira-asosli layer
CHANNEL_LAYERS = {
    "default": {"BACKEND": "channels.layers.InMemoryChannelLayer"},
}

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
    }
}

AUTH_USER_MODEL = "users.User"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "uz"
TIME_ZONE = "Asia/Tashkent"
USE_I18N = True
USE_TZ = True

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# REST Framework
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
    "DEFAULT_FILTER_BACKENDS": (
        "django_filters.rest_framework.DjangoFilterBackend",
    ),
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 20,
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(days=7),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=30),
    "AUTH_HEADER_TYPES": ("Bearer",),
}

# CORS — frontend dev + production
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
    # Expo web (mobile)
    "http://localhost:8081",
    "http://127.0.0.1:8081",
    # Production
    "https://taxiscan.app",
    "https://www.taxiscan.app",
    "http://taxiscan.app",
    "http://www.taxiscan.app",
]

# CSRF — production domenlar (admin panel va session-formalar uchun)
CSRF_TRUSTED_ORIGINS = [
    "https://taxiscan.app",
    "https://www.taxiscan.app",
    "https://backend.taxiscan.app",
    "http://backend.taxiscan.app",
]
# Mobil qurilma / Expo dev-server LAN IP sidan kelgan so'rovlarga ham ruxsat
# (masalan http://192.168.x.x:8081 yoki :3001) — faqat dev uchun.
CORS_ALLOWED_ORIGIN_REGEXES = [
    r"^http://192\.168\.\d{1,3}\.\d{1,3}:(3000|3001|8081)$",
    r"^http://10\.\d{1,3}\.\d{1,3}\.\d{1,3}:(3000|3001|8081)$",
]
CORS_ALLOW_CREDENTIALS = True

# OpenAPI
SPECTACULAR_SETTINGS = {
    "TITLE": "TaxiNarx API",
    "DESCRIPTION": "Toshkentdagi barcha taksi xizmatlari narxlarini bir joyda taqqoslash uchun API",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
}

# Geocoding provayderi
# Agar YANDEX_GEOCODER_KEY o'rnatilgan bo'lsa — Yandex Geocoder ishlatiladi
# (nomlar Yandex Maps bilan bir xil bo'ladi). Aks holda — bepul Nominatim (OSM).
# Bepul kalitni bu yerdan oling: https://developer.tech.yandex.ru/services/ (Geocoder API)
YANDEX_GEOCODER_KEY = os.environ.get("YANDEX_GEOCODER_KEY", "")
# Yandex til kodi: ru_RU, en_US, tr_TR, uk_UA (uz_UZ hozircha qo'llab-quvvatlanmaydi)
YANDEX_GEOCODER_LANG = os.environ.get("YANDEX_GEOCODER_LANG", "ru_RU")

# Payme Merchant API (kassa ma'lumotlari — business.payme.uz kabinetidan)
PAYME_MERCHANT_ID = os.environ.get("PAYME_MERCHANT_ID", "")
PAYME_KEY = os.environ.get("PAYME_KEY", "")
PAYME_TEST_KEY = os.environ.get("PAYME_TEST_KEY", "")
PAYME_CHECKOUT_URL = os.environ.get("PAYME_CHECKOUT_URL", "https://checkout.paycom.uz")

# TaxiNarx project specific
TAXINARX = {
    # Oylik obuna narxi rolga qarab (so'mda)
    "SUBSCRIPTION_PRICE_UZS": {
        "passenger": 9_999,
        "driver": 49_999,
    },
    "SUBSCRIPTION_PERIOD_DAYS": 30,
    "FREE_TRIAL_DAYS": 1,
    "DEFAULT_CITY": "Tashkent",
}
