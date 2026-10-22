from pathlib import Path
from datetime import timedelta
from decouple import config

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = config('SECRET_KEY', default='dev-secret-key-change-me')
DEBUG = config('DEBUG', default=True, cast=bool)
ALLOWED_HOSTS = config('ALLOWED_HOSTS', default='*').split(',')

# Render sets this automatically for every web service
RENDER_EXTERNAL_HOSTNAME = config('RENDER_EXTERNAL_HOSTNAME', default='')
if RENDER_EXTERNAL_HOSTNAME:
    ALLOWED_HOSTS.append(RENDER_EXTERNAL_HOSTNAME)

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    # Third-party
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',
    'django_filters',
    # Tunza apps
    'accounts',
    'caregivers',
    'bookings',
    'messaging',
    'ratings',
    'payments',
    'locations',
    'care_requests',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'tunza.urls'

TEMPLATES = [{
    'BACKEND': 'django.template.backends.django.DjangoTemplates',
    'DIRS': [],
    'APP_DIRS': True,
    'OPTIONS': {
        'context_processors': [
            'django.template.context_processors.debug',
            'django.template.context_processors.request',
            'django.contrib.auth.context_processors.auth',
            'django.contrib.messages.context_processors.messages',
        ],
    },
}]

WSGI_APPLICATION = 'tunza.wsgi.application'

# ── Database ──────────────────────────────────────────────────────────────────
# In production (Render) a single DATABASE_URL is provided; locally the DB_*
# variables below are used as before.
DATABASE_URL = config('DATABASE_URL', default='')
DB_ENGINE = config('DB_ENGINE', default='django.db.backends.sqlite3')

if DATABASE_URL:
    import dj_database_url
    DATABASES = {'default': dj_database_url.parse(DATABASE_URL, conn_max_age=600)}
elif DB_ENGINE == 'django.db.backends.sqlite3':
    DATABASES = {
        'default': {
            'ENGINE': DB_ENGINE,
            'NAME': BASE_DIR / config('DB_NAME', default='tunza_db.sqlite3'),
        }
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': DB_ENGINE,
            'NAME': config('DB_NAME', default='tunza'),
            'USER': config('DB_USER', default='postgres'),
            'PASSWORD': config('DB_PASSWORD', default=''),
            'HOST': config('DB_HOST', default='localhost'),
            'PORT': config('DB_PORT', default='5432'),
        }
    }

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

AUTH_USER_MODEL = 'accounts.User'

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'Africa/Nairobi'
USE_I18N = True
USE_TZ = True

STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STORAGES = {
    'default': {'BACKEND': 'django.core.files.storage.FileSystemStorage'},
    'staticfiles': {'BACKEND': 'whitenoise.storage.CompressedManifestStaticFilesStorage'},
}
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# ── Cloudinary (private storage for caregiver verification documents) ───────
# Format: cloudinary://<api_key>:<api_secret>@<cloud_name>  (Cloudinary dashboard → API Keys)
# Leave empty locally to store documents in MEDIA_ROOT instead.
CLOUDINARY_URL = config('CLOUDINARY_URL', default='')
if CLOUDINARY_URL:
    import os
    os.environ.setdefault('CLOUDINARY_URL', CLOUDINARY_URL)

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# ── REST Framework ────────────────────────────────────────────────────────────
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_FILTER_BACKENDS': (
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ),
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
    # Scoped limits on the endpoints people could hammer (see accounts/views.py).
    # Counted per user when signed in, per IP otherwise.
    'DEFAULT_THROTTLE_RATES': {
        'login':     config('THROTTLE_LOGIN', default='10/min'),
        'register':  config('THROTTLE_REGISTER', default='10/hour'),
        'otp':       config('THROTTLE_OTP', default='5/hour'),
        'otp_check': config('THROTTLE_OTP_CHECK', default='20/hour'),
        'reset':     config('THROTTLE_RESET', default='5/hour'),
    },
}
# Render's proxy puts the client IP first in X-Forwarded-For; count that, not the proxy.
NUM_PROXIES = 1 if RENDER_EXTERNAL_HOSTNAME else None
if NUM_PROXIES:
    REST_FRAMEWORK['NUM_PROXIES'] = NUM_PROXIES

# ── JWT ───────────────────────────────────────────────────────────────────────
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(
        minutes=config('ACCESS_TOKEN_LIFETIME_MINUTES', default=60, cast=int)
    ),
    'REFRESH_TOKEN_LIFETIME': timedelta(
        days=config('REFRESH_TOKEN_LIFETIME_DAYS', default=7, cast=int)
    ),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
}

# ── CORS ──────────────────────────────────────────────────────────────────────
CORS_ALLOWED_ORIGINS = config(
    'CORS_ALLOWED_ORIGINS',
    default='http://localhost:8081,http://localhost:19006'
).split(',')
CORS_ALLOW_CREDENTIALS = True
CSRF_TRUSTED_ORIGINS = [o for o in config('CSRF_TRUSTED_ORIGINS', default='').split(',') if o]
if RENDER_EXTERNAL_HOSTNAME:
    CSRF_TRUSTED_ORIGINS.append(f'https://{RENDER_EXTERNAL_HOSTNAME}')

# ── Production security (only when DEBUG is off) ─────────────────────────────
if not DEBUG:
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
    SECURE_SSL_REDIRECT = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    SECURE_HSTS_SECONDS = 3600

# ── Onboarding ────────────────────────────────────────────────────────────────
# Bump when the Terms / Privacy Policy change; each user's accepted version is stored.
TERMS_VERSION = config('TERMS_VERSION', default='2026-10')
# Africa's Talking SMS for phone OTP (accounts/sms.py). Without AT_API_KEY, codes are
# only logged (and returned by the API when DEBUG is on).
AT_USERNAME  = config('AT_USERNAME', default='sandbox')
AT_API_KEY   = config('AT_API_KEY', default='')
AT_SENDER_ID = config('AT_SENDER_ID', default='')
# None = automatic (on when AT_API_KEY is set, or DEBUG). Set True/False to force.
_pvr = config('PHONE_VERIFICATION_REQUIRED', default='')
PHONE_VERIFICATION_REQUIRED = None if _pvr == '' else _pvr.lower() in ('1', 'true', 'yes')

# ── Bookings ──────────────────────────────────────────────────────────────────
BOOKING_AUTO_DECLINE_MINUTES = config('BOOKING_AUTO_DECLINE_MINUTES', default=30, cast=int)
# Family pays before the visit once M-Pesa collection is live. Until then the
# address/phone unlock when the caregiver accepts.
MPESA_COLLECTION_LIVE = config('MPESA_COLLECTION_LIVE', default=False, cast=bool)
# Earnings stay "on hold" this long after a visit ends (time for the family to raise an issue).
EARNINGS_HOLD_HOURS = config('EARNINGS_HOLD_HOURS', default=24, cast=int)
# GPS check-in further than this from the care address is flagged for admins.
CHECKIN_MAX_DISTANCE_M = config('CHECKIN_MAX_DISTANCE_M', default=500, cast=int)

# ── M-Pesa ────────────────────────────────────────────────────────────────────
MPESA_CONSUMER_KEY = config('MPESA_CONSUMER_KEY', default='')
MPESA_CONSUMER_SECRET = config('MPESA_CONSUMER_SECRET', default='')
MPESA_SHORTCODE = config('MPESA_SHORTCODE', default='174379')
MPESA_PASSKEY = config('MPESA_PASSKEY', default='')
MPESA_CALLBACK_URL = config('MPESA_CALLBACK_URL', default='')
MPESA_ENV = config('MPESA_ENV', default='sandbox')
