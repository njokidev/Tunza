#!/usr/bin/env bash
# Render build script for the Tunza API
set -o errexit

pip install --upgrade pip
pip install -r requirements.txt

python manage.py collectstatic --no-input
python manage.py migrate --no-input

# Create the first admin account from DJANGO_SUPERUSER_* env vars (set them in
# the Render dashboard). Safe to run on every deploy: it is skipped if the
# account already exists.
if [ -n "$DJANGO_SUPERUSER_EMAIL" ] && [ -n "$DJANGO_SUPERUSER_PASSWORD" ]; then
  python manage.py createsuperuser --no-input || echo "Superuser already exists, skipping."
fi
