#!/usr/bin/env python3
"""
Tunza first-run setup script.
Run: python setup.py
"""
import os, sys, subprocess

def run(cmd, cwd=None):
    print(f"\n▶ {cmd}")
    result = subprocess.run(cmd, shell=True, cwd=cwd)
    if result.returncode != 0:
        print(f"❌ Command failed: {cmd}")
        sys.exit(1)

BACKEND = os.path.join(os.path.dirname(__file__), "backend")

print("\n" + "="*50)
print("  🤝 TUNZA — First-run Setup")
print("="*50)

# 1. Create virtualenv
if not os.path.exists(os.path.join(BACKEND, "venv")):
    run("python3 -m venv venv", cwd=BACKEND)
    print("✅ Virtual environment created")
else:
    print("ℹ️  Virtual environment already exists")

pip = os.path.join(BACKEND, "venv", "bin", "pip")
python = os.path.join(BACKEND, "venv", "bin", "python")

# 2. Install requirements
run(f"{pip} install -r requirements.txt", cwd=BACKEND)

# 3. Create .env if not exists
env_path = os.path.join(BACKEND, ".env")
if not os.path.exists(env_path):
    import shutil
    shutil.copy(os.path.join(BACKEND, ".env.example"), env_path)
    print("✅ .env created from .env.example — edit it to add M-Pesa keys")
else:
    print("ℹ️  .env already exists")

# 4. Migrate
run(f"{python} manage.py migrate", cwd=BACKEND)

# 5. Seed specializations
seed_cmd = f"""{python} -c "
import django, os
os.environ['DJANGO_SETTINGS_MODULE'] = 'tunza.settings'
django.setup()
from caregivers.models import Specialization
specs = ['Palliative Care', 'Post-operative Care', 'Elderly Care', 'Pediatric Care',
         'Physical Therapy', 'Mental Health Support', 'Wound Care', 'Dementia Care',
         'Oncology Support', 'Diabetes Management']
created = 0
for name in specs:
    _, c = Specialization.objects.get_or_create(name=name)
    if c: created += 1
print(f'Seeded {created} specializations')
"
"""
run(seed_cmd, cwd=BACKEND)

# 6. Create superuser prompt
print("\n" + "="*50)
print("  Create your admin superuser")
print("="*50)
run(f"{python} manage.py createsuperuser", cwd=BACKEND)

print("\n" + "="*50)
print("  ✅ Setup complete!")
print("="*50)
print(f"""
Next steps:
  1. cd backend && source venv/bin/activate
  2. python manage.py runserver
  3. Visit http://127.0.0.1:8000/admin to manage users

  For M-Pesa (optional for local dev):
  4. Install ngrok:  npm install -g ngrok
  5. Run:            ngrok http 8000
  6. Paste the URL into backend/.env as MPESA_CALLBACK_URL

  Mobile app:
  7. cd ../mobile && npm install
  8. Edit src/api/index.js — set BASE_URL to your machine's IP
     e.g. http://192.168.1.5:8000/api  (not localhost — phone can't reach it)
  9. npx expo start
""")
