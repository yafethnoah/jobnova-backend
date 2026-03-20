# JobNova V12 production handoff

## Product direction
JobNova V12 keeps every core feature but changes the presentation rule to: one clear next step per screen, lighter copy, and fewer competing priorities above the fold.

## What changed
- Home now prioritizes progress, next actions, and user outcomes.
- Resume now presents ATS, tailoring, package generation, design, export, and library as one guided journey.
- Interview now separates text practice from live voice practice.
- Shared screen spacing is more adaptive for narrow and wide phones.
- System health is still visible, but compressed so it does not dominate the first impression.

## Keep
- Career Path
- Resume ATS and package generation
- Voice interview
- Application tracker
- Settings, profile, LinkedIn, subscriptions

## Remove from prime real estate
- Verbose operational wording
- Large blocks of backend diagnostics on Home
- Repetitive explanatory copy

## Release checklist
1. Fill frontend and backend production env files.
2. Confirm backend /health returns ok=true with production dependencies active.
3. Build a fresh native binary after env updates.
4. Run preflight locally when dependencies are installed.
5. Validate ATS, export, tracker, live interview, and subscription screens on device.
6. Replace remaining placeholder legal and support text before store review.
