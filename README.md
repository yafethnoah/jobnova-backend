# JobNova V12.0.0 Production Source Pack

This package contains the Expo mobile app and Node/Express backend for JobNova V12.

## What was fixed in this handoff
- ATS check crash from missing `jobExtractionWarning` state
- clearer extraction feedback in ATS and Job Ready flows
- safer public welcome screen safe-area import
- refreshed frontend and backend env templates
- added a starter Postgres migration for core V12 tables

## Honest status
This is a stronger source baseline, not a guaranteed end-to-end release build from this environment. It still needs local dependency install, app launch, and device validation on your machine.

## Local setup

### Mobile
```bash
npm install
cp .env.example .env
npx expo start -c
```

### Backend
```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

## Production setup
- frontend production template: `.env.production.example`
- backend production template: `backend/.env.production.example`
- backend health endpoint: `/health`
- starter SQL migration: `backend/db/migrations/003_v12_core_tables.sql`

## Important note
Before TestFlight or live release, validate:
- backend `/health` returns healthy or fallback as expected
- ATS compare runs against live backend
- Job Ready exports save correctly on device
- interview screens and subscriptions load without runtime errors
