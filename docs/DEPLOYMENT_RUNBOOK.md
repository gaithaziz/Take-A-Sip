# Deployment Runbook

## Branch Protection

Protect `main` with these required checks:
- `Backend CI / test`
- `Mobile CI / test`
- `Secret Scan / gitleaks`
- `Admin CI / build`
- `Frontdesk CI / verify`

Recommended settings:
- require pull requests before merging
- require branches to be up to date
- require at least one approval
- dismiss stale approvals
- block force pushes
- block branch deletion
- require conversation resolution before merge

## GitHub Environments

Create three environments in GitHub:

### `staging`
- used by `.github/workflows/backend-deploy-staging.yml`
- add variables:
  - `ENABLE_STAGING_DEPLOY=true`
  - `GCP_PROJECT_ID`
  - `GCP_REGION`
  - `GCP_ARTIFACT_REPOSITORY`
  - `GCP_CLOUD_RUN_SERVICE`
  - `GCP_MIGRATION_JOB`
  - `GCP_CLOUDSQL_INSTANCES`
  - `BACKEND_RUNTIME_ENV_VARS`
  - `BACKEND_SECRET_ENV_VARS`
  - `BACKEND_SMOKE_PATH`
  - `BACKEND_DEPLOY_EXTRA_ARGS`
- add secrets:
  - `GCP_WORKLOAD_IDENTITY_PROVIDER`
  - `GCP_SERVICE_ACCOUNT_EMAIL`

### `production`
- used by `.github/workflows/backend-deploy-prod.yml` and `.github/workflows/backend-rollback.yml`
- use the same variable and secret names as `staging`, but with production values
- set `ENABLE_PRODUCTION_DEPLOY=true`
- add required reviewers to the environment so production deploys require approval

### `mobile-release`
- used by `.github/workflows/mobile-release.yml`
- add secrets:
  - `EXPO_TOKEN`
  - `EXPO_APPLE_ID`
  - `EXPO_APPLE_APP_SPECIFIC_PASSWORD`

## Backend Release Flow

### Staging
1. Merge to `main`
2. `Backend CI` passes
3. `Backend Deploy Staging` builds and pushes a backend image tagged with the commit SHA
4. Migration job runs `alembic upgrade head`
5. Cloud Run service deploys the new revision
6. Smoke test hits `/health`

### Production
1. Confirm the staging image tag you want to promote
2. Start `Backend Deploy Production`
3. Enter the commit SHA or image tag used in staging
4. Approve the production environment gate
5. Wait for migration, deploy, and smoke test to finish

## Rollback

Use `.github/workflows/backend-rollback.yml` when production or staging needs a quick revert.

Inputs:
- `target_environment`: `staging` or `production`
- `revision`: Cloud Run revision name to restore

Recommended rollback sequence:
1. identify the last known good revision in Cloud Run
2. run the rollback workflow
3. confirm `/health` returns `200`
4. verify logs, order creation, and auth still work
5. write down the failed revision and root cause before redeploying

## Monitoring

Minimum production checks:
- Cloud Monitoring uptime check against `/health`
- alert policy for failed uptime checks
- log-based monitoring for 5xx spikes
- release annotation with commit SHA

Recommended alert destinations:
- maintainer email group
- Slack webhook or Google Chat webhook

## Mobile Delivery

`mobile/eas.json` defines two EAS profiles:
- `preview` for internal distribution
- `production` for store builds

Use `.github/workflows/mobile-release.yml` for manual releases:
1. choose `preview` or `production`
2. choose platform
3. optionally enable store submission for production

Before production mobile release:
- confirm privacy-policy and store metadata match current app behavior
- verify account deletion still works
- verify permission prompts still match `mobile/app.json`
- test login, checkout, notifications, and profile flows on device
