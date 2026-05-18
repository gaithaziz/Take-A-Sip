# Backend Deployment

This backend is prepared for a simple production setup:

- FastAPI on Google Cloud Run
- Neon Postgres for the database
- Cloudflare R2 for menu images and uploaded files

## Architecture

- Cloud Run runs a single backend container and scales to zero when idle.
- Mobile apps call the backend API directly.
- Neon stores application data in Postgres.
- Cloudflare R2 stores uploaded images through an S3-compatible client.
- Alembic migrations can use a separate `MIGRATION_DATABASE_URL`, which is useful when runtime uses a pooled Neon URL.

## Required Environment Variables

### Core

```env
APP_NAME=Take A Sip API
ENVIRONMENT=production
DEBUG=false
LOG_LEVEL=INFO
JWT_SECRET_KEY=replace-with-a-long-random-secret
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=720
PUBLIC_API_BASE_URL=https://api.example.com
```

### Database

```env
DATABASE_URL=postgresql+asyncpg://<user>:<password>@<pooled-neon-host>/<db>?sslmode=require
MIGRATION_DATABASE_URL=postgresql+asyncpg://<user>:<password>@<direct-neon-host>/<db>?sslmode=require
DATABASE_POOL_SIZE=5
DATABASE_MAX_OVERFLOW=5
DATABASE_POOL_TIMEOUT_SECONDS=30
DATABASE_POOL_RECYCLE_SECONDS=1800
DATABASE_USE_NULL_POOL=false
READY_CHECK_DB=true
```

Notes:

- Use the Neon pooled connection string for `DATABASE_URL` to keep Cloud Run connection usage low.
- Use the Neon direct connection string for `MIGRATION_DATABASE_URL` so Alembic always has a clean path for schema changes.
- `MIGRATION_DATABASE_URL` falls back to `DATABASE_URL` if omitted.

### Storage: Cloudflare R2

```env
STORAGE_BACKEND=s3
STORAGE_PUBLIC_BASE_URL=https://pub-<your-bucket-domain>
S3_ENDPOINT_URL=https://<account-id>.r2.cloudflarestorage.com
S3_REGION=auto
S3_BUCKET_NAME=take-a-sip-assets
S3_ACCESS_KEY_ID=<r2-access-key-id>
S3_SECRET_ACCESS_KEY=<r2-secret-access-key>
S3_KEY_PREFIX=menu
S3_ADDRESSING_STYLE=path
MAX_UPLOAD_SIZE_MB=10
```

Notes:

- `STORAGE_PUBLIC_BASE_URL` should point to the public bucket domain or your custom CDN/domain.
- R2 bucket public access is controlled on the Cloudflare side, not by application ACLs.

### CORS and Host Safety

```env
CORS_ALLOW_ORIGINS=
CORS_ALLOW_ORIGIN_REGEX=
TRUSTED_HOSTS=api.example.com,*.run.app
```

Notes:

- Native mobile apps do not generally need CORS, so you can leave `CORS_ALLOW_ORIGINS` empty in production unless you also use browser-based tooling.
- `TRUSTED_HOSTS` is optional but recommended once your final hostnames are known.

### OTP via Mersal

```env
OTP_PROVIDER=mersal
OTP_TEST_CODE=
MERSAL_API_URL=https://your-mersal-send-endpoint
MERSAL_API_KEY=<mersal-api-key>
MERSAL_SENDER_ID=TakeASip
MERSAL_AUTH_HEADER=X-API-Key
MERSAL_AUTH_SCHEME=
MERSAL_PHONE_FIELD=PhoneNumber
MERSAL_MESSAGE_FIELD=Message
MERSAL_SENDER_FIELD=Sender
MERSAL_EXTRA_PAYLOAD_JSON=
```

Notes:

- I could confirm Mersal is an SMS platform from their official site, but I could not find public API docs on `mersalapp.com`.
- The backend now supports a configurable Mersal request shape so you can match your account’s endpoint without another code change.
- If Mersal expects a plain API key header instead of `Bearer`, set `MERSAL_AUTH_SCHEME=` to an empty value.

### Optional Other Integrations

```env
OTP_PROVIDER=twilio
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM_NUMBER=
PUSH_ENABLED=false
FCM_PROJECT_ID=
FCM_SERVICE_ACCOUNT_JSON=
APNS_KEY_ID=
APNS_TEAM_ID=
APNS_BUNDLE_ID=
APNS_PRIVATE_KEY_PATH=
APNS_USE_SANDBOX=false
```

## Health Endpoints

- `GET /health`: lightweight liveness endpoint for container health checks
- `GET /ready`: readiness endpoint that verifies database connectivity
- `GET /metrics`: in-memory request metrics snapshot

Recommended uptime target:

- Cloud Monitoring uptime check against `/health`
- Reserve `/ready` for deployment validation, debugging, and deeper checks because it verifies database connectivity

## Deployment Order

1. Create the Neon project and database.
2. Copy both Neon connection strings:
   - pooled string for `DATABASE_URL`
   - direct string for `MIGRATION_DATABASE_URL`
3. Create the Cloudflare R2 bucket and generate S3 API credentials.
4. Configure a public bucket domain or custom domain and set `STORAGE_PUBLIC_BASE_URL`.
5. Create or update GCP Secret Manager secrets for:
   - `database-url`
   - `migration-database-url`
   - `jwt-secret-key`
   - `s3-access-key-id`
   - `s3-secret-access-key`
   - `mersal-api-key`
   - any Twilio or push-notification secrets you use
6. Provision Artifact Registry and Cloud Run service/job.
7. Deploy the image, run migrations, and update the service.

## Build and Deploy Commands

From the repo root:

```bash
chmod +x deploy.sh
PROJECT_ID=your-gcp-project \
REGION=us-central1 \
REPOSITORY=take-a-sip-backend \
SERVICE_NAME=take-a-sip-backend-prod \
MIGRATION_JOB_NAME=take-a-sip-backend-migrate-prod \
RUNTIME_SERVICE_ACCOUNT=take-a-sip-production-runtime@your-gcp-project.iam.gserviceaccount.com \
MIGRATION_SERVICE_ACCOUNT=take-a-sip-production-migrate@your-gcp-project.iam.gserviceaccount.com \
RUNTIME_ENV_VARS="ENVIRONMENT=production,DEBUG=false,LOG_LEVEL=INFO,PUBLIC_API_BASE_URL=https://api.example.com,STORE_TIMEZONE=Asia/Amman,OTP_PROVIDER=mersal,MERSAL_API_URL=https://your-mersal-send-endpoint,MERSAL_SENDER_ID=TakeASip,MERSAL_AUTH_HEADER=X-API-Key,MERSAL_AUTH_SCHEME=,MERSAL_PHONE_FIELD=PhoneNumber,MERSAL_MESSAGE_FIELD=Message,MERSAL_SENDER_FIELD=Sender,STORAGE_BACKEND=s3,STORAGE_PUBLIC_BASE_URL=https://pub-your-bucket.example.com,S3_ENDPOINT_URL=https://<account-id>.r2.cloudflarestorage.com,S3_REGION=auto,S3_BUCKET_NAME=take-a-sip-assets,S3_KEY_PREFIX=menu,S3_ADDRESSING_STYLE=path,READY_CHECK_DB=true" \
RUNTIME_SECRETS="DATABASE_URL=database-url:latest,MIGRATION_DATABASE_URL=migration-database-url:latest,JWT_SECRET_KEY=jwt-secret-key:latest,MERSAL_API_KEY=mersal-api-key:latest,S3_ACCESS_KEY_ID=s3-access-key-id:latest,S3_SECRET_ACCESS_KEY=s3-secret-access-key:latest" \
./deploy.sh
```

To build only:

```bash
gcloud builds submit \
  --project your-gcp-project \
  --config cloudbuild.yaml \
  --substitutions _REGION=us-central1,_REPOSITORY=take-a-sip-backend,_IMAGE=backend,_TAG=$(git rev-parse --short HEAD) \
  .
```

## Cloud Run Runtime Recommendations

- `min-instances=0` for lowest cost, or `1` if you want reduced cold starts
- `max-instances=3` to start
- `cpu=1`
- `memory=512Mi`
- `concurrency=80`
- public unauthenticated ingress enabled if mobile clients access the API directly
- avoid external uptime monitors against `/ready` unless you explicitly want continuous DB checks

## Local Verification

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements-dev.txt
pytest -q
```
