# Infrastructure

This folder contains the first Terraform scaffold for the GCP delivery stack used by `Take-A-Sip`.

Current scope:
- Artifact Registry for backend images
- service accounts for deploy, runtime, and migrations
- Secret Manager secrets used by backend deploy workflows
- Cloud Run service for the backend
- Cloud Run Job for Alembic migrations
- uptime check and alert policy for `/health`

## Expected Usage

1. Copy one of the example tfvars files in `infra/environments/`.
2. Fill in project, region, service names, and the initial backend image.
3. Run Terraform:

```bash
cd infra
terraform init
terraform plan -var-file=environments/staging.tfvars
terraform apply -var-file=environments/staging.tfvars
```

## GitHub Environment Contract

Create GitHub environments named `staging` and `production` and add these variables:

- `ENABLE_STAGING_DEPLOY` or `ENABLE_PRODUCTION_DEPLOY`
- `GCP_PROJECT_ID`
- `GCP_REGION`
- `GCP_ARTIFACT_REPOSITORY`
- `GCP_CLOUD_RUN_SERVICE`
- `GCP_MIGRATION_JOB`
- `BACKEND_RUNTIME_ENV_VARS`
- `BACKEND_SECRET_ENV_VARS`
- `BACKEND_SMOKE_PATH`
- `BACKEND_DEPLOY_EXTRA_ARGS`

Add these secrets to each environment:

- `GCP_WORKLOAD_IDENTITY_PROVIDER`
- `GCP_SERVICE_ACCOUNT_EMAIL`

Create a GitHub environment named `mobile-release` and add these secrets:

- `EXPO_TOKEN`
- `EXPO_APPLE_ID` for iOS submit
- `EXPO_APPLE_APP_SPECIFIC_PASSWORD` for iOS submit

## Secret Naming Convention

The Terraform scaffold creates Secret Manager entries from `secret_ids`. A good starting set is:

- `database-url`
- `jwt-secret-key`
- `twilio-account-sid`
- `twilio-auth-token`
- `twilio-from-number`
- `fcm-service-account-json`
- `apns-key-id`
- `apns-team-id`
- `apns-bundle-id`
- `apns-private-key-path`

In GitHub Actions, `BACKEND_SECRET_ENV_VARS` should map app env names to Secret Manager names, for example:

```text
DATABASE_URL=database-url:latest,JWT_SECRET_KEY=jwt-secret-key:latest
```
