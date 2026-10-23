# Deploying the Tunza pilot

## 1. Backend + web (Render)
1. Sign in to https://render.com with GitHub.
2. New + → **Blueprint** → choose the `njokidev/Tunza` repo → Apply.
   Render reads `render.yaml` and creates `tunza-api` (Django), `tunza-web` (React) and `tunza-db` (Postgres).
3. When asked, fill in `DJANGO_SUPERUSER_EMAIL` and `DJANGO_SUPERUSER_PASSWORD` (your admin login).
   The M-Pesa keys can stay blank for now.
4. Wait for both services to go green, then open:
   - API health: https://tunza-api.onrender.com/  → `{"service": "tunza-api", "status": "ok"}`
   - Web app:    https://tunza-web.onrender.com/
5. If Render gave different URLs (it adds a suffix when a name is taken), update
   `VITE_API_URL` on tunza-web and `CORS_ALLOWED_ORIGINS` on tunza-api, and set the
   GitHub repo variable `API_URL` (Settings → Secrets and variables → Actions → Variables)
   to `https://<your-api>.onrender.com/api`, then re-run the APK workflow.

### Production settings
With `DEBUG=False` the API refuses to start unless `SECRET_KEY` is real (32+ chars),
`ALLOWED_HOSTS` has no `*`, every `CORS_ALLOWED_ORIGINS` entry is `https://`, and
`DATABASE_URL` points at Postgres. The Blueprint already sets all four. If a deploy
fails at startup, the log line says which one is wrong.

### Database backups
- The free Render database has **no backups and expires after 30 days**. Before real
  families sign up, change `tunza-db` to a paid plan (e.g. Basic) in Render; that adds
  daily backups with point-in-time recovery.
- Until then, the **Database backup** workflow dumps the database every night at 03:30
  and keeps encrypted copies for 14 days. Turn it on by adding two repo secrets:
  `PROD_DATABASE_URL` (Render → tunza-db → Connections → External Database URL) and
  `BACKUP_PASSPHRASE` (a long random passphrase; store it in your password manager).
  Restore steps are at the top of `.github/workflows/db-backup.yml`.

### M-Pesa (sandbox)
`POST /api/payments/initiate/ {booking_id, phone?}` sends the STK push. It returns
503 `payments_unavailable` until `MPESA_CONSUMER_KEY`, `MPESA_CONSUMER_SECRET` and
`MPESA_PASSKEY` are set on tunza-api (Daraja portal → your sandbox app).

## 2. Android APK (GitHub Actions)
- Every push to `main` that touches `mobile/` builds an APK.
- Or with Expo: `cd mobile && npx eas-cli build -p android --profile preview` builds an
  installable APK pointed at the production API (needs an Expo login).
- Manual build: Actions → **Android APK (pilot)** → Run workflow.
- Download: the run's **tunza-apk** artifact, or the `pilot-N` release.
- Share the `.apk` with testers (WhatsApp/Drive). On the phone: open it and allow
  "Install unknown apps" when asked.
- Optional: add a `GOOGLE_MAPS_API_KEY` repo secret to turn on the in-app live map.
  Without it, the tracking screen shows an "Open in Google Maps" button instead
  (a missing key would otherwise crash the app on that screen).

## Pilot limitations (free tier)
- The API sleeps after 15 min idle; the first request after that takes ~50 s.
- Free Postgres expires after 30 days. Upgrade it (or export the data) before then.
- Uploaded photos live on Render's disk and are wiped on every deploy. Move uploads to
  Cloudinary/S3 before a wider launch.
- The APK is signed with the standard debug key: fine for sideloading to testers, but create
  a real upload key before publishing on Google Play.
- `mobile/android/` is no longer committed: CI regenerates it with `expo prebuild`
  (the old folder was generated for an older Expo SDK and would not build with SDK 57).
