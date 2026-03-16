# JobNova V8.1.0 Backend

This backend is prepared for production-style token placement and deployment.

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
cp .env.production.example .env
npm install
npm run start:prod
```

## Health check
Open `/health` after startup. In real production mode you want Postgres enabled and healthy.

## Notes
- If `DATABASE_URL` is missing, the backend falls back to local JSON for some flows.
- If `SUPABASE_*` keys are missing, cloud storage and auth-linked flows will be incomplete.
- If `RESEND_API_KEY` or `EMAIL_FROM` are missing, email send flows will fail.

See `../docs/ENV-SETUP.md` for the exact token placement guide.
