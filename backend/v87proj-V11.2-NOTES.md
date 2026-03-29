JobNova V11.2

Included in this package:
- backend export smoke test endpoint: GET /exports/test
- improved job-posting extraction pipeline with AI cleanup and structured output
- richer extraction payload: confidence, responsibilities, requirements, skills
- version bump to 11.2.0

Deployment checks:
1. Open /health
2. Open /exports/test
3. In the app, paste a real job posting URL and confirm extracted text is cleaner and more role-focused
4. Generate a job-ready package and confirm exportArtifacts include real DOCX/PDF download URLs
