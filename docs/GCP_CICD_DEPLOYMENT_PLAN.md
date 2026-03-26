# GCP CI/CD And Deployment Plan

## Summary
Set up a GCP-based CI/CD and deployment workflow for the `Take-A-Sip` system with clear separation between build, test, release, and runtime infrastructure.

This plan assumes:
- `backend` is the main server application
- `mobile` is the Expo/React Native client
- `admin` is a separate frontend app
- `frontdesk` is a dedicated operational app

The goal is to make backend and web deployments automated first, while mobile release automation can come after the server pipeline is stable.

## Goals
- Run automated checks on every pull request
- Build and deploy backend safely to GCP
- Build and deploy web/admin apps through predictable environments
- Keep secrets out of source control
- Support separate `dev`, `staging`, and `prod` environments
- Make rollbacks simple
- Add enough observability to detect bad releases quickly

## Recommended GCP Architecture

### Core Services
- `Cloud Run` for backend containers
- `Artifact Registry` for storing built container images
- `Cloud Build` for CI and image build/deploy steps
- `Cloud SQL` for the production relational database
- `Secret Manager` for environment secrets
- `Cloud Storage` for static assets, uploads, backups, and optional frontend hosting artifacts
- `Cloud Logging` and `Cloud Monitoring` for logs, metrics, and alerts

### Optional Or Later Services
- `Cloud Deploy` for more structured staged rollouts
- `Firebase App Distribution` or EAS for mobile internal releases
- `Cloud CDN` in front of static web/admin assets
- `Pub/Sub` or `Cloud Tasks` for async jobs if backend work grows

## Environment Strategy

### Environments
- `dev`
- `staging`
- `prod`

### Rules
- Each environment gets its own backend service config
- `staging` should mirror `prod` closely
- `prod` deploys only from the protected main branch or version tags
- `dev` can auto-deploy from a development branch if desired

### Recommended Separation
- Separate Cloud Run services per environment
- Separate Cloud SQL databases or instances per environment
- Separate Secret Manager secret versions per environment
- Separate storage buckets when environment isolation matters

## Application Deployment Targets

### Backend
- Package backend as a Docker image
- Push image to Artifact Registry
- Deploy image to Cloud Run
- Run database migrations as part of release flow, but before traffic is shifted fully

### Admin Web App
- Build static assets in CI
- Deploy to one of:
  - `Firebase Hosting`
  - `Cloud Storage + Load Balancer + CDN`
  - another frontend platform if you prefer keeping web outside GCP runtime

Recommended on GCP:
- use `Firebase Hosting` for simplest web delivery

### Frontdesk App
- If this is a web app:
  - deploy like the admin web app
- If this is an Android-native operational app:
  - do not treat it like Cloud Run deployment
  - use CI for build, lint, tests, artifact generation, and internal distribution

### Mobile App
- Keep mobile release pipeline separate from backend deploy pipeline
- Use CI for:
  - lint
  - tests
  - typecheck
  - optional EAS build triggers
- Use:
  - `EAS Build/Submit`, or
  - `Firebase App Distribution` for QA/internal testing

## CI Pipeline Design

### Pull Request Pipeline
Run on every PR:
- install dependencies
- lint changed apps
- run typecheck
- run unit/integration tests
- optionally build backend container without pushing
- optionally build admin frontend to catch compile issues

### Main Branch Pipeline
Run on merges to main:
- run full validation
- build backend Docker image
- tag image with commit SHA
- push image to Artifact Registry
- deploy to `staging`
- run post-deploy smoke checks

### Production Release Pipeline
Run on manual approval or git tag:
- promote tested image
- deploy to `prod`
- run migrations
- run smoke tests
- notify release channel

## Backend Deployment Flow

### Build
- Docker build from `backend`
- tag image with:
  - commit SHA
  - branch name for non-prod
  - semver tag for release builds

### Release Steps
1. Build image
2. Push to Artifact Registry
3. Fetch env vars and secrets from Secret Manager
4. Run database migration job
5. Deploy new revision to Cloud Run
6. Route traffic to new revision
7. Run smoke checks
8. Keep previous revision available for rollback

### Rollback Strategy
- use Cloud Run revision rollback for application issues
- restore database only when absolutely necessary
- avoid destructive migrations without a rollback path

## Database And Migration Plan

### Cloud SQL
- Use managed PostgreSQL if the app is already aligned with it
- Enable automated backups
- Enable point-in-time recovery if budget allows

### Migration Strategy
- Store migrations in repo
- Run them in CI/CD with a dedicated release step
- Make migrations:
  - forward-safe
  - repeatable in automation
  - backward-aware when possible

### Release Safety
- prefer additive migrations first
- deploy code compatible with both old and new schema during transition windows
- remove deprecated schema in later releases, not the same release

## Secrets And Config

### Use Secret Manager For
- database URLs
- JWT/auth secrets
- API keys
- third-party credentials
- push notification credentials

### Use Non-Secret Env Vars For
- environment name
- API base URLs
- feature flags
- logging level

### Rules
- do not keep production secrets in `.env`
- keep `.env.example` only for local documentation
- grant CI service accounts least-privilege access

## Identity And Permissions

### Service Accounts
Create separate service accounts for:
- CI/CD deploy pipeline
- backend runtime
- migration jobs

### Minimum Permissions
- Artifact Registry writer for CI build account
- Cloud Run admin or scoped deploy permissions for deploy account
- Secret accessor only for secrets each service needs
- Cloud SQL client for backend runtime if using private connections

## Networking And Security

### Recommended
- HTTPS everywhere
- custom domains for admin/backend
- managed SSL certificates
- Cloud Armor later if public traffic grows

### Backend Security
- restrict CORS to known clients
- rate-limit sensitive endpoints later if needed
- keep admin-only routes protected by role checks

## Observability

### Logging
- structured JSON logs from backend
- include request IDs when possible
- log deploy version and commit SHA at startup

### Monitoring
- uptime checks for public endpoints
- alerts on:
  - elevated 5xx errors
  - crash loops
  - latency spikes
  - failed migrations

### Release Visibility
- annotate releases with commit SHA and timestamp
- send deploy notifications to Slack or email later

## Suggested Repository Automation Structure

### GitHub Actions Or Cloud Build
You can use either:
- `GitHub Actions` for orchestration, with GCP auth for deploys
- `Cloud Build` triggered directly from repo events

Recommended:
- use `GitHub Actions` for repo-centric CI
- use GCP only for artifact storage and runtime

This usually gives better PR ergonomics and easier workflow visibility.

## Suggested Pipeline Files

### Backend
- `.github/workflows/backend-ci.yml`
- `.github/workflows/backend-deploy-staging.yml`
- `.github/workflows/backend-deploy-prod.yml`

### Frontend/Admin
- `.github/workflows/admin-ci.yml`
- `.github/workflows/admin-deploy.yml`

### Mobile
- `.github/workflows/mobile-ci.yml`
- optional EAS-trigger workflow later

### Infra
- `infra/` folder for:
  - service definitions
  - env manifests
  - Terraform later if you want infrastructure as code

## Infrastructure As Code

### Recommended Direction
- use `Terraform` once infrastructure stops changing daily

Manage:
- Artifact Registry
- Cloud Run services
- service accounts
- IAM bindings
- Secret Manager entries
- Cloud SQL
- buckets
- alert policies

### Early Stage Option
- start manually in GCP Console
- document every created resource
- migrate to Terraform before production hardens

## Branching And Promotion Strategy

### Recommended
- PRs merge into `main`
- `main` auto-deploys to `staging`
- production deploy happens by:
  - manual approval, or
  - release tag such as `v1.2.0`

### Benefit
- the exact same image tested in staging can be promoted to production
- this reduces “works in staging but not prod” drift

## Mobile Release Plan

### CI For Mobile
- install deps
- lint
- typecheck
- run tests

### Delivery Later
- internal QA builds on merge to main
- store build artifacts or distribute to testers
- app store release remains manual until backend deployment is stable

## Implementation Phases

### Phase 1
- choose GCP project structure
- create Artifact Registry
- create Cloud Run backend service
- create Secret Manager secrets
- deploy backend manually once

### Phase 2
- add backend CI for lint, test, typecheck
- add backend build and staging deploy automation
- add smoke tests

### Phase 3
- add admin web deployment automation
- add structured prod release workflow
- add monitoring and alerting

### Phase 4
- add Terraform
- add mobile build automation
- add rollback playbooks and release docs

## Concrete First Tasks
- decide whether CI orchestration will be `GitHub Actions` or `Cloud Build`
- containerize backend if not already production-ready
- define environment variable matrix for `dev`, `staging`, `prod`
- create GCP project naming convention
- create Artifact Registry repository
- create Cloud Run service for backend staging
- connect backend to Cloud SQL
- store secrets in Secret Manager
- add a first backend CI workflow
- add a first staging deploy workflow

## Risks And Things To Decide Early
- whether admin/frontdesk are web or native deployment targets
- whether uploads stay on local disk or move to Cloud Storage
- how database migrations are triggered and monitored
- whether staging and prod use separate GCP projects or only separate services
- whether mobile releases stay manual for a while

## Opinionated Recommendation
- Backend: `Cloud Run + Artifact Registry + Cloud SQL + Secret Manager`
- Admin web: `Firebase Hosting`
- CI orchestration: `GitHub Actions`
- Infra later: `Terraform`
- Mobile release automation later: `EAS Build`

This gives the cleanest path with the least operational overhead for a project at this stage.
