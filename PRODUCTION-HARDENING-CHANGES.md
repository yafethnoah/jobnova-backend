# JobNova V9.0.2 production hardening

This package includes a stabilization pass focused on the highest-risk production blockers.

## Applied fixes

- Unified app and backend versioning to **9.0.2**.
- Migrated the live interview screen off `expo-av` to the newer `expo-audio` API surface.
- Removed fake local subscription activation so the app no longer pretends purchases succeeded.
- Reduced public Expo config exposure by removing public subscription product IDs.
- Hardened backend startup so production can block when critical security and database settings are missing.
- Prevented production from silently relying on JSON persistence when local fallback is disabled.
- Reduced accidental demo-mode behavior by only seeding sample users in non-production fallback mode.
- Migrated the secure token key from the old `northpath_access_token` name to `jobnova_access_token` with backward compatibility.

## Important remaining requirement

Real in-app subscriptions still require your own native StoreKit wiring, App Store Connect products, and receipt validation. This project now avoids fake success states, but it does not auto-create Apple billing logic for you.

## Before release

1. Run `npm install` in the app.
2. Run `npx expo install expo-audio` to pin the correct Expo SDK-compatible package version.
3. Run `npm install` in `backend/`.
4. Fill production env files.
5. Build a fresh native binary after the audio migration.
