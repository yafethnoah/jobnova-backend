# JobNova V18.2.1 corrected source package

Included fixes:
- `live-lobby.tsx` uses safe string narrowing for `audioUrl` route params.
- `app.config.js` now hardcodes the EAS project ID required by dynamic config.
- `src/lib/packageDownloads.ts` uses `expo-file-system/legacy` so `documentDirectory`, `EncodingType`, and `writeAsStringAsync` type-check correctly.
- `.env.example` added with the required `EXPO_PUBLIC_API_BASE_URL`.

Known limitation:
- This archive does not include a regenerated `package-lock.json`. EAS uses `npm ci`, so you must run `npm install` once in the project root and commit the new lockfile before building.
