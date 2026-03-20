# JobNova V7.2 Backend Wiring Pack

This pack upgrades the V7 foundation with practical backend wiring for:
- live ATS compare persistence
- truthful full-resume rewrite persistence
- AI application package generation
- export bundle generation with downloadable file URLs
- realtime interview mock session routing with event storage and persisted feedback

## What is live versus still mocked

### Working backend flows in this pack
- `/ats/compare`
- `/ats/rewrite`
- `/ats/package`
- `/exports/resume`
- `/exports/library`
- `/interview/realtime/session`
- `/interview/realtime/session/:id/event`
- `/interview/realtime/session/:id/end`
- `/interview/realtime/:id/feedback`

### Still mocked / starter-level
- OpenAI Realtime ephemeral session creation is represented by a safe mock token route.
- ATS scoring is deterministic and content-based, but not yet using a production LLM scorer.
- Rewrite uses the existing resume engine fallback path unless OpenAI credentials are wired.
- Export rendering creates real files through the existing export service, but storage is local `/downloads` by default.

## Frontend starter APIs added
- `src/api/ats.ts`
- `src/api/exportV7.ts`
- `src/api/interviewV7.ts`

## Notes
This is the least-chaotic next step after the V7.1 UI shell: the routes now persist outputs, return structured records, and are ready to be connected to the V7 screens.
