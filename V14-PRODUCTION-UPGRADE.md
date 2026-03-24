# JobNova V14 Production Upgrade

This build upgrades the project from V13 into a fuller career operating system.

## Added in V14
- AI Career Coach screen covering before, during, and after hiring phases.
- Growth Hub with First 90 Days planning.
- Financial Wellness planning screen.
- Backend endpoints for coach, growth, and market intelligence.
- Home dashboard upgraded to surface the 3-phase lifecycle.
- Version metadata bumped to 14.0.0.

## New backend endpoints
- `POST /coach/session`
- `POST /growth/plan`
- `POST /growth/financial-plan`
- `POST /market/insights`

## New frontend routes
- `/(app)/career-coach`
- `/(app)/growth`
- `/(app)/growth/first-90`
- `/(app)/growth/financial-wellness`

## Notes
Existing OCR, browser extraction, ATS, resume rewrite, and live interview layers were preserved from V13.
