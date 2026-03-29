# ATS + Export Pipeline Fixes

This patch hardens the job-ready package generation flow against inconsistent AI and parser payloads.

## Main fixes
- normalized all list-like fields before any `join`, `slice`, or export rendering
- hardened job-ready package generation for strings, arrays, nested objects, and nulls
- normalized export artifact payloads before saving or returning them
- stabilized ATS application-package generation when AI returns non-array skills or bullets
- made export format parsing resilient to strings, arrays, and object payloads
- added frontend guards so export screens do not crash on malformed artifact payloads

## Files changed
- `backend/lib/normalize.js`
- `backend/services/jobReadyEngine.js`
- `backend/services/atsService.js`
- `backend/services/exportService.js`
- `backend/routes/jobReady.js`
- `src/lib/renderText.ts`
- `app/(app)/resume/job-ready.tsx`
- `app/(app)/resume/export-center.tsx`
- `app/(app)/resume/export-library.tsx`


2026-03-18 follow-up hardening:
- normalized export artifact rendering on the frontend
- surfaced export warnings in the job-ready screen
- tightened recruiter email, cover letter, and resume rewrite prompts for more submission-ready output
- added ATS-screen resume download format controls and a direct ATS-tailored resume download action
- normalized printable text before DOCX/PDF splitting to avoid object/array payload crashes
