# JobNova V13 Final

This package adds the last production-hardening layer requested for the project.

## Implemented in this build
- OCR fallback for scanned PDFs and image resumes.
- Image resume upload support (`png`, `jpeg`, `webp`).
- Browser-rendered extraction fallback for dynamic/protected job sites using Puppeteer.
- Exponential retry helper for fragile network-bound extraction paths.
- Security hardening with `helmet`, API rate limiting, stricter JSON body size, and disabled `x-powered-by`.
- Optional Sentry instrumentation scaffold for backend error monitoring.
- Queue worker entrypoint for BullMQ worker deployment.
- Stronger production persistence defaults via `STRICT_PERSISTENCE=true` support.
- Dashboard analytics now surface OCR usage and extraction modes.

## Important deployment notes
1. Run `npm install` in both project root and `backend/` so the new dependencies are installed.
2. For OCR on scanned PDFs, the server should have `pdftoppm` available (Poppler). Image OCR does not need Poppler.
3. For browser-rendered extraction, Puppeteer must be able to launch Chromium in the target environment.
4. In production, keep `STRICT_PERSISTENCE=true` and do not enable local fallback.
5. Add `SENTRY_DSN` only if you want live backend monitoring.
6. Run the queue worker separately with:
   - `cd backend && npm run worker`

## Remaining reality check
This is much closer to a true production build, but real-world accuracy still depends on:
- a valid backend environment
- Redis and Postgres availability
- browser extraction being allowed by the target host
- OCR quality of the source file
