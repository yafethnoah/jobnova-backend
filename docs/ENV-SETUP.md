# JobNova token and secret placement guide

This package is prepared so you can paste your real production values into the correct files without hunting through the codebase.

## 1) Frontend mobile env
Create `.env` from `.env.production.example` for production-style local testing.

Required mobile values:
- `EXPO_PUBLIC_API_BASE_URL`
- `EXPO_PUBLIC_BUNDLE_ID`
- all `EXPO_PUBLIC_SUBSCRIPTION_*` values when moving off test ads

Notes:
- `EXPO_PUBLIC_*` values are bundled into the client app. Never place private server secrets in the frontend `.env`.
- For local device testing against a local backend, use your LAN IP instead of localhost.

## 2) Backend env
Create `backend/.env` from `backend/.env.production.example`.

Most important required backend values:
- `OPENAI_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL`
- `JWT_SECRET`

Optional but strongly recommended:
- `RESEND_API_KEY`
- `EMAIL_FROM`
- `REDIS_URL`
- job-feed keys like Adzuna / Greenhouse / Lever

## 3) Where each token is used
- `OPENAI_API_KEY`: resume rewrite, ATS explanations, interview intelligence, voice features
- `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`: backend storage/admin operations
- `SUPABASE_ANON_KEY`: auth/client-safe Supabase access paths
- `DATABASE_URL`: Postgres persistence
- `RESEND_API_KEY` + `EMAIL_FROM`: recruiter email sending
- `EXPO_PUBLIC_SUBSCRIPTION_*`: mobile ads configuration

## 4) Safe separation rule
Frontend env is public-to-the-app.
Backend env is private-to-the-server.
Do not paste service role keys, OpenAI keys, JWT secrets, Resend keys, or database URLs into the frontend env.

## 5) Local production-like test
Frontend:
```bash
cp .env.production.example .env
npm install
npx expo start
```

Backend:
```bash
cd backend
cp .env.production.example .env
npm install
npm run start:prod
```

## 6) Health check after pasting secrets
Open:
`https://your-backend-domain/health`

You want:
- `db.mode` to be `postgres`
- `db.ok` to be `true`
- no startup runtime warnings about missing keys

## 7) Remaining honest blockers
This package is ready for token placement and deployment setup, but not all legacy local-json fallback flows are removed yet.
A true final production pass should still:
- migrate all user state to Postgres/Supabase
- replace `expo-av` with `expo-audio`
- add smoke tests for auth, ATS, resume parsing, and interview routes
