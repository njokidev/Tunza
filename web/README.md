# Tunza Web

React web app for Tunza — *Quality care, at your doorstep.* Families find and book verified caregivers; caregivers manage requests, visits and earnings. It talks to the Django API in `../backend`.

## Run it locally (Windows)

1. Start the backend (from `Tunza\backend`, with your virtualenv active):
   ```
   python manage.py runserver
   ```
2. In a second terminal, start the web app (from `Tunza\web`):
   ```
   npm install
   npm run dev
   ```
3. Open http://localhost:5173

The Vite dev server proxies `/api` and `/media` to `http://127.0.0.1:8000`, so the browser sees one origin and Django's CORS settings don't need to change. To point at a different backend, copy `.env.example` to `.env` and set `VITE_BACKEND_URL`.

## Stack

React 18 · React Router 6 · Axios · Tailwind CSS 3 · Vite 5 · lucide-react icons

## Structure

```
src/
  api/client.js        Axios instance, JWT header, refresh-on-401 queue, DRF error formatting
  api/endpoints.js     One function per backend endpoint; walks paginated lists
  context/AuthContext  Session restore, login/register/logout, role-based home
  components/          UI kit (ui.jsx), Layout + nav, RequireRole guard, CaregiverCard, AreaPicker
  lib/                 Constants that mirror backend choices, formatting, useAsync hook
  pages/auth           Login, Register (role picker, Kenyan phone normalisation)
  pages/patient        Home, CareNeeds (5-step form), Matches, Browse, CaregiverProfile,
                       RequestBooking, MyRequests, Applications
  pages/caregiver      Dashboard, OpenJobs, ProfileEditor (+ weekly availability)
  pages/shared         Bookings (role-aware actions + reviews), Messages, Wallet/Earnings
```

## How it maps to the API

| Screen | Endpoints |
|---|---|
| Login / Register | `POST /auth/login/`, `POST /auth/register/`, `GET /auth/me/`, `POST /auth/token/refresh/` |
| Care needs → Smart Match | `POST /care-requests/` (runs matching), `GET /care-requests/:id/matches/`, `PATCH …/shortlist/` |
| Open request | `POST /care-requests/` with `discovery_path=open_request`, `GET …/applications/` |
| Browse / Profile | `GET /caregivers/`, `GET /caregivers/:id/`, `GET /caregivers/specializations/` |
| Book | `POST /bookings/` |
| Booking actions | `PATCH /bookings/:id/status/` — caregiver: accepted, rejected, ongoing, completed; patient: cancelled |
| Reviews | `POST /ratings/` |
| Chat | `GET /messages/`, `POST /messages/start/`, `GET/POST /messages/:id/messages/` (polls every 4s) |
| Caregiver profile | `GET/PATCH /caregivers/me/`, `GET/POST/DELETE /caregivers/availability/` |
| Open jobs | `GET /care-requests/open/`, `POST /care-requests/:id/apply/` |

## Known backend gaps (worked around here)

- **Booking from a match / accepting an application.** `care_requests/views.py` (`BookFromMatchView`, `AcceptApplicationView`) creates bookings with fields the `Booking` model doesn't have (`scheduled_start`, `booking_source`, `care_request`, `calculate_estimated_amount`), so those endpoints error. The web app books through `POST /bookings/` instead, prefilled from the care request.
- **No wallet endpoint.** Wallet and earnings are calculated client-side from completed bookings using the 12.5% commission.
- **Multi-day bookings** are billed for the continuous hours between start and end (`Booking.calculate_amount`). The booking form warns about this.
- **Matching needs data.** Only verified, available caregivers are ranked, and care types are matched against specialization names — add specializations and verify caregivers in Django admin.
