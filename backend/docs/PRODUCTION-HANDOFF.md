# JobNova V8.1.0 Production Handoff

This package is a production-hardened source bundle, not a finished deployed product.

## What was hardened
- Version alignment across mobile and backend
- Frontend environment validation for live API mode
- Backend environment validation with startup warnings
- Safer Expo app config placeholders
- Production env templates
- Render and Docker deployment starter files

## What is still not honestly production-complete
- Local JSON auth/session storage is still present in backend/data/store.js
- expo-av is still used in the live interview screen
- Core user persistence is not fully moved to Postgres/Supabase
- There is no automated test suite or CI pipeline in this package

## Release order
1. Replace placeholder bundle IDs and URLs
2. Move auth/session persistence to Supabase or JWT + Postgres
3. Replace expo-av with expo-audio
4. Move applications/resumes/interview sessions to Postgres
5. Add tests and CI before store submission
