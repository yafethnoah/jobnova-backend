# JobNova V12 Backend

## Main routes
- /auth
- /users
- /career-path
- /applications
- /resume
- /assets
- /linkedin
- /interview
- /interview/realtime
- /ats
- /exports
- /email
- /dashboard
- /jobs

## Setup
```bash
cp .env.example .env
npm install
npm run dev
```

## Health check
Open `/health` after startup. In production, the best state is Postgres enabled and healthy.

## Persistence
- If `DATABASE_URL` is missing and `ALLOW_LOCAL_FALLBACK=true`, the backend falls back to local JSON for some flows.
- For production, use `backend/.env.production.example` and apply the migration in `backend/db/migrations/003_v12_core_tables.sql`.

## Export engine
The backend can generate `.docx`, `.pdf`, and `.zip` files in `data/generated/`, exposed through `/downloads/<fileName>`.
