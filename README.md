# 🤝 Tunza — Caregiver Marketplace Platform

> Connecting patients requiring palliative or long-term care with qualified caregivers in Kenya.

---

## Tech Stack

| Layer    | Technology |
|----------|-----------|
| Backend  | Django 5 + Django REST Framework |
| Auth     | JWT (SimpleJWT) with auto-refresh |
| Mobile   | React Native + Expo |
| Database | PostgreSQL|
| Payments | M-Pesa Daraja STK Push |
| Location | Expo Location + real-time GPS polling |

---

## Project Structure

```
tunza/
├── backend/
│   ├── accounts/     # Users, JWT auth, roles, notifications
│   ├── caregivers/   # Profiles, specializations, availability
│   ├── bookings/     # Booking lifecycle management
│   ├── messaging/    # Conversations & messages
│   ├── ratings/      # Reviews (completed bookings only)
│   ├── payments/     # M-Pesa STK Push + callback handler
│   ├── locations/    # Live GPS tracking
│   └── tunza/        # Settings, root URLs
├── mobile/
│   └── src/
│       ├── api/         # Axios client + all API calls
│       ├── context/     # AuthContext (session + JWT)
│       ├── components/  # Shared UI: Button, Input, Card, etc.
│       ├── navigation/  # Role-based tab & stack routing
│       └── screens/
│           ├── auth/       # Login, Register
│           ├── patient/    # Home, CaregiverDetail, Payment, Track, Review
│           ├── caregiver/  # Dashboard, Profile
│           └── admin/      # Dashboard (users + bookings)
└── setup.py          # First-run bootstrap script
```

---

## Quick Start

### 1. Clone & setup

```bash
git clone <your-repo-url>
cd tunza
python setup.py      # Creates venv, installs deps, migrates DB, seeds data, creates superuser
```

### 2. Run the backend

```bash
cd backend
source venv/bin/activate
python manage.py runserver
```

API base URL: `http://127.0.0.1:8000/api/`  
Admin panel: `http://127.0.0.1:8000/admin/`

### 3. Run the mobile app

```bash
cd mobile
npm install
npx expo start
```

> ⚠️ **Important:** When testing on a physical phone, change `BASE_URL` in  
> `src/api/index.js` from `127.0.0.1` to your computer's local IP address  
> (e.g. `192.168.1.10`). Your phone and laptop must be on the same WiFi network.

---

## API Reference

### Auth  `POST /api/auth/`
| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `register/` | POST | None | Create account (patient or caregiver) |
| `login/` | POST | None | Returns access + refresh tokens + user |
| `logout/` | POST | JWT | Blacklists refresh token |
| `token/refresh/` | POST | None | Get new access token |
| `me/` | GET/PATCH | JWT | Get or update own profile |
| `users/` | GET | Admin | List all users (filter by role) |
| `users/{id}/verify/` | PATCH | Admin | Mark caregiver as verified |
| `notifications/` | GET | JWT | List own notifications |

### Caregivers  `GET /api/caregivers/`
| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/` | GET | JWT | List & search caregivers |
| `{id}/` | GET | JWT | Caregiver detail |
| `me/` | GET/PATCH | Caregiver | Own profile management |
| `availability/` | GET/POST/DELETE | Caregiver | Manage schedule |
| `specializations/` | GET | JWT | List specializations |

### Bookings  `POST /api/bookings/`
| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/` | GET/POST | JWT | List or create booking |
| `{id}/` | GET | JWT | Booking detail |
| `{id}/status/` | PATCH | JWT | Change booking status |

### Messaging  `GET /api/messages/`
| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/` | GET | JWT | List conversations |
| `start/` | POST | JWT | Get or create conversation |
| `{id}/messages/` | GET/POST | JWT | Read or send messages |

### Payments  `POST /api/payments/`
| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `initiate/` | POST | Patient | Trigger M-Pesa STK Push |
| `mpesa/callback/` | POST | None | Safaricom callback (public) |
| `status/{booking_id}/` | GET | JWT | Check payment status |

### Locations  `POST /api/locations/`
| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `update/` | POST | Caregiver | Push GPS coordinates |
| `booking/{id}/` | GET | Patient | Get caregiver's live location |

---

## User Roles & Flows

### Patient
1. Register → Search caregivers (filter by specialization, rate, rating, availability)
2. View caregiver profile → Book → Caregiver accepts/rejects
3. Pay via M-Pesa STK Push → Track caregiver live during ongoing care
4. Leave a review after care is completed

### Caregiver
1. Register → Complete profile (bio, specializations, rate, availability)
2. Admin verifies → Appear in search results
3. Accept/reject bookings → Start session → Share live GPS location
4. Mark care as completed

### Admin
1. View all users & bookings in dashboard
2. Verify caregiver credentials
3. Manage specializations via Django admin panel

---

## M-Pesa Setup (Sandbox)

1. Go to [developer.safaricom.co.ke](https://developer.safaricom.co.ke) and create an app
2. Copy `Consumer Key`, `Consumer Secret`, and `Passkey` into `backend/.env`
3. Run `ngrok http 8000` to get a public URL for the callback
4. Set `MPESA_CALLBACK_URL=https://YOUR-NGROK-URL.ngrok.io/api/payments/mpesa/callback/`
5. Test with Safaricom sandbox phone numbers (see their documentation)

---

## Switching to PostgreSQL

1. Install: `pip install psycopg2-binary`
2. Create DB: `createdb tunza`
3. Update `.env`:
```
DB_ENGINE=django.db.backends.postgresql
DB_NAME=tunza
DB_USER=postgres
DB_PASSWORD=yourpassword
DB_HOST=localhost
DB_PORT=5432
```
4. Re-run: `python manage.py migrate`

---

## Switching to Docker Compose (when ready)

```yaml
# docker-compose.yml
version: '3.9'
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_DB: tunza
      POSTGRES_PASSWORD: password
  api:
    build: ./backend
    depends_on: [db]
    ports: ["8000:8000"]
    env_file: ./backend/.env
```

---

## Built With ❤️ By Mitchelle Becky Njoki
