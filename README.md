# JobNova V16 Guided Experience Upgrade

This package is a user-experience-focused V16 upgrade of the uploaded JobNova V15.1 project.

## What changed in V16
- simplified the primary navigation to the five main product lanes
- replaced the overloaded home dashboard with a guided next-step experience
- reworked Career Path into three clearer route cards
- turned Resume into a more unified Match Lab flow
- upgraded Tracker into a pipeline-first board with follow-up cues
- upgraded Interview into clearer practice modes with progress framing
- cleaned Settings copy and surfaced key saved-work links
- reduced exposed version/dev wording on user-facing screens

## Main tabs
- Home
- Path
- Resume
- Tracker
- Practice

## Important note
This package is a strong UX/code upgrade built directly from the uploaded archive. I was able to improve the project structure and main screens locally, but I could not run a full native build and device validation in this environment. Before release, run:

```bash
npm install
npm run typecheck
npm run lint
npx expo start -c
```

Also validate the live backend flows locally:
- ATS compare
- resume upload + extraction
- job description extraction from URL
- interview voice/session flows
- exports and saved library
- subscription and account flows


## Production notes
- Set `EXPO_PUBLIC_API_BASE_URL` to your deployed backend before TestFlight or App Store builds.
- Do not use localhost or a private LAN IP for production mobile builds.
- Run `npm run preflight` before EAS builds to verify the public Expo config and lint/typecheck gates.
