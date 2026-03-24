# JobNova V16 Upgrade Notes

## Main UX upgrades
- simplified tab bar to five core lanes: Home, Path, Resume, Tracker, Practice
- rebuilt Home around progress, today's plan, next milestone, and one primary CTA
- simplified Resume into a guided Match Lab flow
- reframed Career Path around best-fit, bridge, and fast-income routes
- upgraded Tracker into a stage-based pipeline board
- reframed Interview into clearer practice modes and progress tracking
- cleaned Account/Settings into Profile, Resume Library, Subscription, and Preferences
- grouped Resources by practical user need

## Files updated
- `app/(app)/_layout.tsx`
- `app/(app)/home.tsx`
- `app/(app)/career-path.tsx`
- `app/(app)/resume/index.tsx`
- `app/(app)/tracker/index.tsx`
- `app/(app)/interview/index.tsx`
- `app/(app)/settings.tsx`
- `app/(app)/resources.tsx`
- `README.md`
- `package.json`

## Recommended local validation
1. `npm install`
2. `npm run typecheck`
3. `npm run lint`
4. `npx expo start -c`
5. validate ATS, extraction, export, tracker, interview, and subscription flows on device


## V16.1 hardening updates
- added Daily Encouragement blocks to the main user-facing screens and public auth flow
- removed user-facing runtime wording such as mock mode / live mode from primary auth and guidance copy
- softened technical copy across Home, ATS, Export Center, and LinkedIn optimizer
- changed Home wording from pipeline-first language to application-first language for clearer user understanding
- kept the simplified 5-tab navigation while improving tone and guidance consistency


## V16.2 Functional Hardening
- relaxed ATS and rewrite flows so low-confidence job-link extraction no longer hard-fails when the user can still continue with recovered text
- improved job-post parsing with stronger section fallback extraction for responsibilities, requirements, and skills
- improved DOCX extraction with XML fallback when Mammoth cannot recover enough text
- enabled guest-friendly ATS package routes more consistently
- removed more leftover NorthPath cache keys and old version language from user-facing copy
- improved error messages around backend URL setup so users know exactly how to recover

## V16.3 production polish
- removed repeated Daily Encouragement banners on screens that already use the shared AppScreen wrapper
- fixed the Home metrics card bug where encouragement text appeared inside each metric tile
- upgraded Home to switch into a post-hire guidance mode when offer-stage applications exist
- replaced Follow-up metric on Home with Offer so the dashboard reflects the strongest milestone more clearly
- improved Tracker cards with clearer stage labels and a simple next-step reminder for each application
- refined Interview screen calls to action so each practice path feels more direct and easier to understand
- replaced one remaining backend fallback note that exposed mock-mode language with calmer production wording
