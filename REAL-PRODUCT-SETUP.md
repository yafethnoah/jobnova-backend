# JobNova V8.2 Live-Wired Baseline

This package is the closest honest version of a **real product baseline** from the current codebase.
It is **not mock-first** anymore: the default frontend env is configured for a live local backend (`EXPO_PUBLIC_USE_MOCK_API=false`).

## What this package is
- Expo mobile app
- Express backend
- live API wiring structure
- ATS / resume / interview / export routes scaffolded in backend
- production env templates for local and hosted deployment

## What still requires your real services
To become a true end-to-end production product, you must add your own:
- OpenAI API key
- Supabase project and keys
- PostgreSQL database (or accept local fallback where supported)
- Redis (optional but recommended)
- Resend key for outbound email
- Azure Document Intelligence for stronger resume parsing (optional but recommended)
- Adzuna / Greenhouse / Lever sources if you want live jobs ingestion

## Fast local run
### 1) Backend
```bash
cd backend
npm install
cp .env.example .env
npm run dev
```
Backend health check:
- http://localhost:4000/health

### 2) Mobile
Open a second terminal in the project root.
```bash
npm install
cp .env.example .env
npx expo start -c
```

## Important truth
This package is **live-wired**, but some advanced features still depend on your real external services and keys.
Without those, the product will run only partially or fall back to simplified behavior.
