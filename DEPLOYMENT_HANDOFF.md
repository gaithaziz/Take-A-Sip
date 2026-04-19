# Deployment Handoff

This file is for the next developer who needs to understand the live backend deployment, where each platform is used, and how to monitor costs without guessing.

## Current Architecture

- Mobile-only system
- No web frontend deployment
- All apps call the backend API
- Backend runtime: Google Cloud Run
- Database: Neon Postgres
- File and image storage: Cloudflare R2
- SMS OTP provider: Mersal

## Live Production Targets

Google Cloud:
- Project ID: `project-005ab1ae-ab75-41f8-bae`
- Region: `us-central1`
- Cloud Run service: `take-a-sip-backend-prod`
- Cloud Run migration job: `take-a-sip-backend-migrate-prod`
- Artifact Registry repository: `take-a-sip-backend`

Backend URL:
- `https://take-a-sip-backend-prod-336480748586.us-central1.run.app`

Cloud Run runtime posture:
- `min instances = 0`
- `max instances = 3`
- `cpu = 1`
- `memory = 512Mi`
- `concurrency = 80`
- public access enabled for mobile clients

Monitoring posture:
- external uptime check uses `GET /health`
- `GET /ready` is DB-aware and should not be used for routine external uptime monitoring

## Platform Roles

### Google Cloud Run

Used for:
- running the FastAPI backend
- autoscaling API traffic
- running Alembic migrations through a Cloud Run Job

Important files:
- [cloudbuild.yaml](/Users/alex/Take-A-Sip/cloudbuild.yaml)
- [deploy.sh](/Users/alex/Take-A-Sip/deploy.sh)
- [backend/Dockerfile](/Users/alex/Take-A-Sip/backend/Dockerfile)
- [backend/DEPLOYMENT.md](/Users/alex/Take-A-Sip/backend/DEPLOYMENT.md)
- [infra/main.tf](/Users/alex/Take-A-Sip/infra/main.tf)

### Neon Postgres

Used for:
- application database
- Alembic migrations
- OTP challenge persistence for production-safe OTP verification

Important backend files:
- [backend/app/core/config.py](/Users/alex/Take-A-Sip/backend/app/core/config.py)
- [backend/app/core/database.py](/Users/alex/Take-A-Sip/backend/app/core/database.py)
- [backend/migrations/env.py](/Users/alex/Take-A-Sip/backend/migrations/env.py)
- [backend/app/models/otp_challenge.py](/Users/alex/Take-A-Sip/backend/app/models/otp_challenge.py)

### Cloudflare R2

Used for:
- menu images
- uploaded files and assets

Important files:
- [backend/app/services/storage.py](/Users/alex/Take-A-Sip/backend/app/services/storage.py)
- [backend/app/core/config.py](/Users/alex/Take-A-Sip/backend/app/core/config.py)

### Mersal

Used for:
- sending OTP SMS messages

Working production contract:
- endpoint: `https://admin.mersalapp.com/api/MersalSmsApi/SendSmsMessage`
- header: `X-API-Key`
- payload fields: `PhoneNumber`, `Message`

Important files:
- [backend/app/services/sms_service.py](/Users/alex/Take-A-Sip/backend/app/services/sms_service.py)
- [backend/app/services/auth_service.py](/Users/alex/Take-A-Sip/backend/app/services/auth_service.py)
- [backend/.env.example](/Users/alex/Take-A-Sip/backend/.env.example)

## Secrets And Runtime Config

Secret Manager secrets currently expected:
- `database-url`
- `migration-database-url`
- `jwt-secret-key`
- `mersal-api-key`
- `s3-access-key-id`
- `s3-secret-access-key`

Plain runtime env vars commonly used in production:
- `ENVIRONMENT=production`
- `LOG_LEVEL=INFO`
- `OTP_PROVIDER=mersal`
- `MERSAL_API_URL=https://admin.mersalapp.com/api/MersalSmsApi/SendSmsMessage`
- `MERSAL_AUTH_HEADER=X-API-Key`
- `MERSAL_AUTH_SCHEME=`
- `MERSAL_PHONE_FIELD=PhoneNumber`
- `MERSAL_MESSAGE_FIELD=Message`
- `MERSAL_SENDER_FIELD=Sender`
- `STORAGE_BACKEND=s3`
- `STORAGE_PUBLIC_BASE_URL=https://pub-a1dab0e15b2d4187bede459d95a690f8.r2.dev`
- `S3_ENDPOINT_URL=https://bedf8e77654629fa3937ad6d0a396106.r2.cloudflarestorage.com`
- `S3_REGION=auto`
- `S3_BUCKET_NAME=take-a-sip-assets`
- `S3_KEY_PREFIX=menu`
- `S3_ADDRESSING_STYLE=path`
- `READY_CHECK_DB=true`

## Deployment Flow

Normal deploy path:
1. Build image with Cloud Build
2. Push image to Artifact Registry
3. Update Cloud Run migration job
4. Execute Alembic migration job
5. Deploy Cloud Run service
6. Verify `/health` and `/ready`

Important note:
- Cloud Build IAM was repaired
- `.gcloudignore` was added so backend builds upload only a small backend-focused source archive

Useful commands:

```bash
gcloud builds submit \
  --project project-005ab1ae-ab75-41f8-bae \
  --config cloudbuild.yaml \
  --substitutions _REGION=us-central1,_REPOSITORY=take-a-sip-backend,_IMAGE=backend,_TAG=$(git rev-parse --short HEAD) \
  .
```

```bash
gcloud run jobs execute take-a-sip-backend-migrate-prod \
  --project project-005ab1ae-ab75-41f8-bae \
  --region us-central1 \
  --wait
```

```bash
gcloud run services logs read take-a-sip-backend-prod \
  --project project-005ab1ae-ab75-41f8-bae \
  --region us-central1 \
  --limit 100
```

## Cost Monitoring By Platform

### Google Cloud Run Cost Monitoring

What costs money:
- request volume
- CPU and memory usage while instances are running
- build usage in Cloud Build
- Artifact Registry storage

How to monitor:
- Cloud Console -> Cloud Run -> service metrics
- Billing -> Cost table filtered by Cloud Run and Cloud Build
- Artifact Registry -> repository size

What to watch:
- unexpected increase in request count
- instances not scaling down
- too many deploy smoke builds piling up as images

Safe defaults already chosen:
- `min instances = 0`
- `max instances = 3`
- small container size

### Neon Cost Monitoring

What costs money:
- compute usage
- storage
- connection/activity patterns

How to monitor:
- Neon dashboard -> compute usage / CU consumption
- Neon dashboard -> branch/database activity

What to watch:
- idle CU burn when no users exist
- unexpected repeated DB wakeups
- high connection churn

Known optimization already applied:
- external uptime checks now use `/health` instead of `/ready`
- this reduces unnecessary DB connectivity checks from monitoring

If Neon cost rises unexpectedly:
1. Check whether any uptime, cron, or smoke tests are hitting `/ready`
2. Check recent deploys and migration runs
3. Check Cloud Run logs for noisy health traffic

### Cloudflare R2 Cost Monitoring

What costs money:
- storage size
- class A and class B operations
- egress depending on access pattern

How to monitor:
- Cloudflare dashboard -> R2 -> bucket metrics
- bucket size
- object count
- request count

What to watch:
- too many duplicate uploads
- accidental large file uploads
- unexpected public asset traffic

Current production bucket:
- `take-a-sip-assets`

### Mersal Cost Monitoring

What costs money:
- SMS sends

How to monitor:
- Mersal dashboard/account usage
- backend logs around OTP sends

What to watch:
- OTP spam
- repeated send attempts from the same number
- sudden growth before app launch

App-side protections already in place:
- resend cooldown
- OTP expiry
- max verify attempts
- lockout after too many bad attempts

## Operational Checks

Use these when something seems wrong:

```bash
curl https://take-a-sip-backend-prod-336480748586.us-central1.run.app/health
curl https://take-a-sip-backend-prod-336480748586.us-central1.run.app/ready
```

Expected:
- `/health` should be lightweight and return `{"status":"ok"}`
- `/ready` should confirm DB readiness and return `{"status":"ok"}`

## Push-Safe Repo Notes

Do not commit:
- real `.env` files
- `.venv/`
- `.neon`
- Terraform local state
- generated Terraform provider files

Important local-only paths:
- `backend/.env`
- `infra/environments/*.tfvars`
- `infra/.terraform/`
- `*.tfstate`

## Recommended First Checks For Any Future Dev

1. Read [CODEX_HANDOFF.md](/Users/alex/Take-A-Sip/CODEX_HANDOFF.md)
2. Run `git status`
3. Read [backend/DEPLOYMENT.md](/Users/alex/Take-A-Sip/backend/DEPLOYMENT.md)
4. Confirm Cloud Run health and readiness
5. Confirm Neon is not burning idle CU unexpectedly
6. Confirm Mersal OTP sends still work
7. Confirm R2 uploads and public asset URLs still work

## Plain-English Summary

This deployment is intentionally simple:
- Cloud Run runs the backend
- Neon stores the app data
- R2 stores files
- Mersal sends OTPs

The main cost risks are:
- unnecessary Cloud Run builds
- unnecessary Neon DB checks
- unexpected SMS sends
- unexpected R2 upload/traffic growth

The main cost optimization already in place is:
- monitor `/health`, not `/ready`

That keeps the app monitored without waking the database all the time.
