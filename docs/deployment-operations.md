# Deployment Operations

## Stack Drift Checks

Run this after every staging or production deployment:

```sh
GCP_PROJECT_ID=... \
GCP_REGION=... \
GCP_CLOUD_RUN_SERVICE=... \
GCP_MIGRATION_JOB=... \
./scripts/validate_cloud_run_readiness.sh
```

Then inspect Secret Manager values for the active revisions:

- `DATABASE_URL` uses the Neon pooled host containing `-pooler`.
- `MIGRATION_DATABASE_URL` uses the Neon direct host without `-pooler`.
- `STORAGE_BACKEND=s3`.
- R2 secrets are scoped to the target bucket and only the required object actions.

## Neon Restore Drill

Use a new branch for restores. Do not overwrite staging or production for drills.

1. In Neon, create a branch from the desired point in time.
2. Copy the restored branch direct connection string.
3. Run migrations against the restored branch:

   ```sh
   cd backend
   MIGRATION_DATABASE_URL='postgresql+asyncpg://...' alembic upgrade head
   ```

4. Point a non-production backend revision at the restored branch:

   ```sh
   gcloud run services update "$GCP_CLOUD_RUN_SERVICE" \
     --project "$GCP_PROJECT_ID" \
     --region "$GCP_REGION" \
     --set-secrets DATABASE_URL=database-url-restored:latest,MIGRATION_DATABASE_URL=migration-database-url-restored:latest
   ```

5. Run the smoke suite:

   ```sh
   BASE_URL=https://staging-api.example.com ./scripts/smoke_cloud_run.sh
   ```

6. Delete the temporary branch after results are recorded.

## Neon Readiness Check

Run this before and after production database changes:

```sh
NEON_RESTORE_DRILL_BRANCH_NAME=codex-restore-drill-20260513 \
./scripts/validate_neon_readiness.sh
```

The script verifies the configured project exists, the history retention window meets the required minimum, the production branch is ready, and an optional restore-drill branch is visible and ready. Neon alert creation is not exposed by the current `neonctl` surface, so provider-side backup/PITR alerting should be configured in the Neon dashboard if it becomes available on the active plan.

## R2 Recovery

Use bucket versioning or lifecycle-managed object copies for production buckets. The recovery path is:

1. Identify the missing object key from application logs or the affected menu record.
2. Restore the previous object version in Cloudflare R2, or copy the known-good object from backup storage.
3. Verify the public asset URL returns `200`.
4. Re-save the menu entity only if the object key changed.

## Smoke Tests

Use `/health` for uptime checks because it does not hit the database. Use `/ready` only for deploy smoke tests and deeper validation because it can verify database readiness.

```sh
BASE_URL=https://api.example.com ./scripts/smoke_cloud_run.sh
```

Set `AUTH_TOKEN` and `ORDER_ID` to include an authenticated order read.

## Release Evidence

For each production release, record:

- Cloud Run service name.
- Cloud Run revision.
- Container image digest or tag.
- Migration job execution ID.
- Neon project, branch, and restore window.
- R2 bucket name and versioning/lifecycle status.
- Smoke-test output.
- Rollback revision tested by `.github/workflows/backend-rollback.yml`.
