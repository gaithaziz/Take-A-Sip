# AGENTS.md

## Project goal
Set up production deployment for a mobile-only coffee shop system.

## Current runtime architecture
- FastAPI backend
- PostgreSQL database
- Object storage for images/files
- Mobile apps only:
  - client
  - admin mobile
  - frontdesk
  - driver

## Deployment target
Use this stack unless a blocker is found:
- Backend: Google Cloud Run
- Database: Neon Postgres
- File storage: Cloudflare R2

## Non-negotiable rules
- Do not introduce a web frontend deployment.
- Do not change business logic unless explicitly required for deployment.
- Do not change API contracts unless required and clearly documented.
- Preserve all current mobile flows and backend behavior.
- Keep costs low and ops simple.
- Prefer production-safe defaults over clever complexity.
- Use environment variables for all secrets and service URLs.
- Keep deployment docs updated as you work.

## Deliverables
When working on deployment, always produce:
1. infrastructure changes
2. env var list
3. local/dev instructions
4. production deployment instructions
5. rollback notes
6. assumptions and remaining risks

## Preferred outputs
- Dockerfile improvements if needed
- cloudbuild.yaml or deploy shell script
- startup/healthcheck fixes
- storage integration changes for R2
- database connection changes for Neon
- README or DEPLOYMENT.md updates
