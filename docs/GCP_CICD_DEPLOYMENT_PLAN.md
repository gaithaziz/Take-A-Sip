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
- run secret scanning
- validate mobile permission metadata and required app config
- run backend integration tests against a CI PostgreSQL service

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

### Recommended Required GitHub Checks
Protect `main` with required status checks:
- `Backend CI / test`
- `Mobile CI / test`
- `Secret Scan / gitleaks`
- `Admin CI / build`
- `Frontdesk CI / verify`

Advisory but not blocking at first:
- `Backend CI / dependency-audit`
- `Mobile CI / dependency-audit`

## Suggested Pipeline Files

### Backend
- `.github/workflows/backend-ci.yml`
- `.github/workflows/backend-deploy-staging.yml`
- `.github/workflows/backend-deploy-prod.yml`
- `.github/workflows/backend-rollback.yml`

### Frontend/Admin
- `.github/workflows/admin-ci.yml`
- deploy target still needs to be chosen after hosting strategy is finalized

### Mobile
- `.github/workflows/mobile-ci.yml`
- `.github/workflows/mobile-release.yml`
- `mobile/eas.json`

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

### Branch Protection Settings
For the `main` branch enable:
- require a pull request before merging
- require status checks to pass before merging
- require branches to be up to date before merging
- require at least 1 approving review
- dismiss stale approvals when new commits are pushed
- block force pushes
- block branch deletion

Recommended if team size allows:
- require conversation resolution before merge
- restrict who can push directly to `main`

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

## Apple And Google Play Compliance

### Goal
- make mobile release readiness part of the delivery plan, not a last-minute store submission task
- ensure the app can pass Apple App Store Review and Google Play review with predictable checks

### Required Release Readiness Areas
- app privacy disclosures must match actual SDK and app data usage
- permission prompts must be necessary, user-facing, and explained clearly in-app
- account flows must satisfy store rules for sign-in, account deletion, and user consent
- release builds must be signed correctly and generated from a controlled pipeline
- app content, screenshots, metadata, and age rating must match shipped behavior
- crash rate, broken flows, placeholder screens, and incomplete features must be caught before submission

### Apple App Store Compliance Checks
- provide accurate `App Privacy` answers for all collected data, linked data, and tracking behavior
- include purpose strings for every iOS permission used, such as camera, photo library, notifications, or location
- if account creation is supported, provide account deletion flow inside the app
- if third-party sign-in is used, ensure Apple sign-in requirements are reviewed where applicable
- avoid hidden or unfinished features, placeholder purchase flows, and dead links during review
- verify subscription, payment, and digital purchase flows follow Apple in-app purchase rules where applicable

### Google Play Compliance Checks
- complete the `Data safety` form accurately for all collected and shared user data
- declare and justify every Android permission, especially sensitive permissions
- provide in-app account deletion when user accounts are supported
- meet Play target API level requirements and keep dependencies current enough to stay compliant
- satisfy foreground service, background location, notification, and exact alarm policies if any are used
- verify billing flows follow Google Play Billing rules for digital goods where applicable

### Mobile CI/CD Security And Compliance Gates
Run on mobile PRs and release branches:
- lint
- typecheck
- unit and integration tests
- dependency vulnerability scan
- secret scan to prevent keys and certificates entering the repo
- release build validation for Android and iOS
- check that privacy manifest, permission strings, and store metadata files are present and updated when app capabilities change

### Manual Pre-Submission Checklist
- verify privacy policy URL is published and matches current app behavior
- verify support URL, contact email, and app metadata are valid
- test sign-up, sign-in, password reset, logout, and account deletion flows
- test permission denial flows so the app still behaves acceptably if access is denied
- test on real devices for current supported iOS and Android versions
- confirm screenshots and promotional text match the real product
- confirm no test banners, debug menus, seeded test accounts, or staging endpoints are present in production builds

### Signing And Secrets
- keep signing keys, keystores, API keys, and push credentials out of source control
- store mobile secrets in the CI secret store or GCP Secret Manager
- restrict access to release signing credentials to the release pipeline and limited maintainers
- document certificate, provisioning profile, and keystore ownership and renewal dates

### Store Operations
- keep release notes, version codes, and version numbers part of the release checklist
- maintain internal testing tracks before production rollout
- use phased release or staged rollout when possible
- keep a rollback plan for bad mobile releases, including store unpublish or halt options

### Recommended Implementation Additions
- add `mobile-release-checklist.md` covering Apple and Google Play submission requirements
- add CI validation for Android permissions and iOS usage description keys
- track all third-party SDKs so privacy disclosures stay in sync with shipped code
- review app store compliance every time auth, analytics, notifications, payments, location, camera, or file access changes
- implement in-app account deletion if customer or staff accounts are distributed through public app stores
- verify Expo/native permission strings and generated platform permissions every release

Checklist location:
- `docs/mobile-release-checklist.md`

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
- implement and test mobile account deletion flow
- add store submission validation for privacy disclosures and permission metadata

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
- confirm mobile distribution model for customer, driver, and admin roles
- add mobile permission descriptions and generated permission review to release prep
- scope backend and mobile work for in-app account deletion

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

## Current Repository Implementation

The repository now includes:
- backend CI, staging deploy, production deploy, and rollback workflow scaffolds
- mobile CI plus manual EAS release workflow and `eas.json`
- admin CI workflow
- frontdesk CI workflow
- Terraform scaffolding in `infra/` for Artifact Registry, Cloud Run, Secret Manager, service accounts, and uptime monitoring
- `docs/DEPLOYMENT_RUNBOOK.md` documenting GitHub environment setup, rollout, rollback, and monitoring expectations

Still required outside the repo:
- create GitHub environments and add the documented vars/secrets
- configure branch protection in GitHub
- create the GCP Workload Identity Federation providers
- apply Terraform with real project IDs, regions, and initial image values
