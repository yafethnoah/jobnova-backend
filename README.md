# JobNova Backend

## Start locally
```bash
cp .env.example .env
npm install
npm run dev
```

## Production checklist
- set a strong `JWT_SECRET`
- configure `DATABASE_URL`
- configure `OPENAI_API_KEY`
- configure Supabase storage credentials
- configure email provider credentials
- set `ALLOW_LOCAL_FALLBACK=false` and `STRICT_PERSISTENCE=true`
- run `npm run preflight`
