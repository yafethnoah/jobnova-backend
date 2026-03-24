# JobNova V18 SaaS Version

## What changed
- Fixed frontend lint blocker in `app/(app)/_layout.tsx` by replacing anonymous tab icon renderers with named components.
- Fixed Expo environment access in `src/lib/env.ts` to avoid dynamic `process.env[key]` access.
- Fixed backend lint false positives for CommonJS globals through targeted ESLint overrides.
- Added missing `inferQuestionFamily()` fallback in `backend/services/interviewEngine.js`.
- Added `src/lib/saasPlans.ts` as a single source of truth for pricing-card and billing-plan UI.
- Bumped app version to 18.0.0 for SaaS-ready packaging.

## SaaS-ready foundations included
- central plan definitions for weekly / monthly / annual offers
- runtime validation for billing product IDs when billing is enabled
- cleaner lint path for Expo + backend monorepo setup

## Recommended next integrations
1. Wire `saasPlans` into the subscriptions screen.
2. Connect Apple product IDs to the billing gateway.
3. Add event tracking around paywall opens, trial starts, exports, ATS checks, and interview completions.
4. Add backend usage metering if you want seat-based or credit-based plans later.
