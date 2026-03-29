# JobNova V12.2 Production Readiness Upgrade

## What changed

### Live-mode trustworthiness
- Removed silent frontend fallback from live ATS analysis to mock data.
- Removed silent frontend fallback from live resume rewrite to mock data.
- Removed silent frontend fallback from live package generation to mock data.
- Removed fake URL-slug fallback job-post extraction on the frontend.
- Kept mock mode available only when `EXPO_PUBLIC_USE_MOCK_API=true`.

### Extraction integrity
- Added source quality classification in backend resume analysis:
  - `high`
  - `medium`
  - `low`
  - `none`
- ATS scoring now blocks when a job-post URL is too incomplete and the user did not paste enough manual job description text.
- Resume rewrite now blocks when a job-post URL is too incomplete and the user did not paste enough manual job description text.
- Job-ready package generation now blocks when a job-post URL is too incomplete and the user did not paste enough manual job description text.

### Response metadata
- ATS and rewrite responses now include:
  - `sourceQuality`
  - `sourceWarning`
- Job-ready package `parsedJobPosting` now includes:
  - `confidence`
  - `sourceQuality`

## Files changed
- `src/api/resume.ts`
- `src/api/jobPost.ts`
- `src/api/jobReady.ts`
- `src/features/resume/resume.types.ts`
- `src/features/resume/jobReady.types.ts`
- `backend/services/resumeEngine.js`
- `backend/services/jobReadyEngine.js`

## Result
This version is materially more production-safe because it refuses to present mock or fabricated live outputs as if they were real recruiter-grade analysis.

## Remaining gaps before a true 10/10
- OCR for scanned PDFs
- Browser-rendered extraction for the hardest job sites
- Stronger database-only production persistence with local fallback disabled in production
- Monitoring, alerting, queue retries, and rate limiting
- Final Apple privacy/compliance pass
