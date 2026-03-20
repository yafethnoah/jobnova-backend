# JobNova V11.1 live-backend wiring

This build is focused on running against a real backend instead of feeling like a polished mock.

## Frontend

Set these values in `.env`:

```env
EXPO_PUBLIC_USE_MOCK_API=false
EXPO_PUBLIC_API_BASE_URL=https://YOUR_RENDER_BACKEND_URL
EXPO_PUBLIC_APP_ENV=production
EXPO_PUBLIC_APP_NAME=JobNova
EXPO_PUBLIC_APP_VERSION=11.1.0
```

## Backend

Set these values in Render or your production host:

```env
NODE_ENV=production
APP_VERSION=11.1.0
ALLOW_LOCAL_FALLBACK=false
DISABLE_LOCAL_AUTH=true
JWT_SECRET=replace_with_a_long_random_string
OPENAI_API_KEY=sk-...
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
DATABASE_URL=postgresql://...
PGSSL=true
```

## First connection check

1. Deploy the backend.
2. Open `https://YOUR_RENDER_BACKEND_URL/health` in a browser.
3. Confirm the response returns `ok: true`.
4. Launch the mobile app.
5. On the Home screen, confirm the new **Backend connection** card shows `live backend connected`.

## Live paths covered in this build

- auth
- dashboard summary
- resume upload
- job posting extraction
- ATS comparison
- tailored rewrite
- job ready package generation
- realtime interview session bootstrap
- export library

## Notes

- The app still keeps a few safety fallbacks for uploads and local text recovery, but the intended mode for this build is real backend traffic.
- If the health card fails, fix the backend URL or deployment before testing ATS, exports, or voice interview features.
