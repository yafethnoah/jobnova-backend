# JobNova V15 corrections

This package is a cleaned V15 handoff based on the uploaded V14 source.

## Core fixes applied
- Promoted `/job-ready/*` to the canonical backend route while keeping `/assets/*` as a compatibility alias.
- Updated frontend Job Ready API calls to use the canonical `/job-ready/*` endpoints.
- Replaced duplicate public auth pages with canonical routing:
  - `/(public)/login` and `/(public)/register` are the maintained screens.
  - `/(public)/sign-in` and `/(public)/sign-up` now redirect to the canonical screens.
- Updated the welcome screen to use the canonical auth routes.
- Removed legacy hidden-tab references to V7 interview/export screens from the tabs layout.
- Hardened the API client so mock mode does not silently fall back to `http://localhost:4000` when a request unexpectedly escapes the mock layer.
- Improved the TypeScript configuration with explicit `target`, `lib`, `jsx`, and `moduleResolution` settings for a stronger Expo/TS baseline.
- Bumped frontend and backend versions to `15.0.0`.

## Important note
This is a structural correction pass that is safe to ship as a cleaner source baseline. It does **not** claim that every runtime integration is verified end-to-end in this environment because dependencies and external services were not installed or executed here.
