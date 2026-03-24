# JobNova TestFlight readiness checklist

This package is prepared for a TestFlight submission pass, but it still depends on **real production environment values**.

## 1) Frontend mobile env for EAS
Use `.env.production.example` as the source of truth.

You must set:
- `EXPO_PUBLIC_USE_MOCK_API=false`
- `EXPO_PUBLIC_API_BASE_URL=https://your-real-backend.onrender.com`
- real subscriptions IDs if you are shipping ads in the build

Do **not** use a LAN IP such as `http://10.x.x.x:4000` in TestFlight.

## 2) Backend env on Render
Use `backend/.env.production.example`.

Minimum realistic TestFlight values:
- `OPENAI_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL`
- `JWT_SECRET`
- `REDIS_URL` (recommended)

## 3) Health check before building
Open:
- `https://your-real-backend.onrender.com/health`

Expected:
- HTTP 200
- JSON response confirming service is alive

## 4) Build command
```bash
npm install
npx expo install --check
npx expo start -c
```

Then for iOS:
```bash
eas build -p ios --profile production
```

## 5) App Store Connect review notes
Provide a working test account or guest path. Native reviewers do not need a web origin, but they do need working credentials.

Suggested review account:
- email: reviewer@jobnova.ai
- password: Test12345!

## 6) Submission blockers still requiring real credentials
This package cannot become truly TestFlight-ready until these are real:
- public backend URL
- OpenAI key
- database URL
- storage credentials
- review login path

## 7) Recommended final checks
- Sign in / sign up works on device
- Resume upload works against production backend
- ATS result is not mock data
- Interview coach returns live responses
- No red environment warnings in the UI
- subscriptions uses test IDs for internal testing only
