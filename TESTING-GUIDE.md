# JobNova V8.2 Testable Mock Build

This package is intended for fast local testing.

## Quick start

1. Install Node.js 20 LTS or newer.
2. In this folder run:

```bash
npm install
cp .env.example .env
npx expo start -c
```

3. Keep `EXPO_PUBLIC_USE_MOCK_API=true` in `.env` for mock mode.
4. Scan the QR code in Expo Go, or press `i` for iOS simulator / `a` for Android emulator.

## What works in this package

- multi-screen Expo Router app
- sign-in / sign-up UI
- onboarding
- career path flow
- resume screens
- ATS result flow
- tracker screens
- interview screens
- mock ads config

## Important truth

This zip is suitable for UI and flow testing. Some advanced V8.2 capabilities are scaffolded or mock-backed and still need full production backend wiring, especially:

- real voice recruiter realtime backend
- real job URL extraction service
- real ATS parsing and scoring service
- real DOCX/PDF export pipeline
- true autopilot application integrations

## Switch to live backend later

Update `.env`:

```env
EXPO_PUBLIC_USE_MOCK_API=false
EXPO_PUBLIC_API_BASE_URL=https://your-backend-domain.com
```

Then restart Expo or rebuild for EAS / TestFlight.
