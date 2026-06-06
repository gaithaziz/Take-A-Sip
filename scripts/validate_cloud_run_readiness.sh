#!/usr/bin/env bash
set -euo pipefail

: "${GCP_PROJECT_ID:?Set GCP_PROJECT_ID}"
: "${GCP_REGION:?Set GCP_REGION}"
: "${GCP_CLOUD_RUN_SERVICE:?Set GCP_CLOUD_RUN_SERVICE}"
: "${GCP_MIGRATION_JOB:?Set GCP_MIGRATION_JOB}"

service_json="$(gcloud run services describe "$GCP_CLOUD_RUN_SERVICE" \
  --project "$GCP_PROJECT_ID" \
  --region "$GCP_REGION" \
  --format=json)"

job_json="$(gcloud run jobs describe "$GCP_MIGRATION_JOB" \
  --project "$GCP_PROJECT_ID" \
  --region "$GCP_REGION" \
  --format=json)"

if printf '%s' "$service_json" | grep -q '"cloudSqlInstance"'; then
  echo "Cloud Run service still has Cloud SQL volumes attached." >&2
  exit 1
fi

if printf '%s' "$service_json" | grep -q '"DATABASE_URL"'; then
  echo "Found DATABASE_URL on runtime service."
else
  echo "Runtime service is missing DATABASE_URL." >&2
  exit 1
fi

if printf '%s' "$job_json" | grep -q '"MIGRATION_DATABASE_URL"'; then
  echo "Found MIGRATION_DATABASE_URL on migration job."
else
  echo "Migration job is missing MIGRATION_DATABASE_URL." >&2
  exit 1
fi

for name in STORAGE_BACKEND S3_ENDPOINT_URL S3_BUCKET_NAME STORAGE_PUBLIC_BASE_URL; do
  if printf '%s' "$service_json" | grep -q "\"$name\""; then
    echo "Found $name on runtime service."
  else
    echo "Runtime service is missing $name." >&2
    exit 1
  fi
done

for name in \
  PUSH_ENABLED \
  FCM_SERVICE_ACCOUNT_JSON \
  APNS_KEY_ID \
  APNS_TEAM_ID \
  APNS_BUNDLE_ID; do
  if printf '%s' "$service_json" | grep -q "\"$name\""; then
    echo "Found $name on runtime service."
  else
    echo "Runtime service is missing $name." >&2
    exit 1
  fi
done

if printf '%s' "$service_json" | grep -q '"APNS_PRIVATE_KEY"' || \
  printf '%s' "$service_json" | grep -q '"APNS_PRIVATE_KEY_PATH"'; then
  echo "Found APNs private key configuration on runtime service."
else
  echo "Runtime service is missing APNS_PRIVATE_KEY or APNS_PRIVATE_KEY_PATH." >&2
  exit 1
fi

echo "Cloud Run readiness shape checks passed. Confirm secret values point to Neon pooled/direct URLs in Secret Manager."
