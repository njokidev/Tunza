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

## 2. Android APK (GitHub Actions)
- Every push to `main` that touches `mobile/` builds an APK.
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
