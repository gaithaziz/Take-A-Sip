#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${PROJECT_ID:?PROJECT_ID is required}"
REGION="${REGION:?REGION is required}"
REPOSITORY="${REPOSITORY:?REPOSITORY is required}"
SERVICE_NAME="${SERVICE_NAME:?SERVICE_NAME is required}"

IMAGE_NAME="${IMAGE_NAME:-backend}"
TAG="${TAG:-$(git rev-parse --short HEAD)}"
MIGRATION_JOB_NAME="${MIGRATION_JOB_NAME:-}"
SERVICE_ACCOUNT="${SERVICE_ACCOUNT:-}"
RUNTIME_SERVICE_ACCOUNT="${RUNTIME_SERVICE_ACCOUNT:-${SERVICE_ACCOUNT}}"
MIGRATION_SERVICE_ACCOUNT="${MIGRATION_SERVICE_ACCOUNT:-${SERVICE_ACCOUNT}}"
MIN_INSTANCES="${MIN_INSTANCES:-0}"
MAX_INSTANCES="${MAX_INSTANCES:-3}"
CPU="${CPU:-1}"
MEMORY="${MEMORY:-512Mi}"
CONCURRENCY="${CONCURRENCY:-80}"
TIMEOUT="${TIMEOUT:-300}"
PORT="${PORT:-8000}"
ALLOW_UNAUTHENTICATED="${ALLOW_UNAUTHENTICATED:-true}"
EXECUTE_MIGRATIONS="${EXECUTE_MIGRATIONS:-true}"
RUNTIME_ENV_VARS="${RUNTIME_ENV_VARS:-}"
RUNTIME_SECRETS="${RUNTIME_SECRETS:-}"

IMAGE_URI="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/${IMAGE_NAME}:${TAG}"

echo "Building ${IMAGE_URI}"
gcloud builds submit \
  --project "${PROJECT_ID}" \
  --config cloudbuild.yaml \
  --substitutions "_REGION=${REGION},_REPOSITORY=${REPOSITORY},_IMAGE=${IMAGE_NAME},_TAG=${TAG}" \
  .

deploy_args=(
  run deploy "${SERVICE_NAME}"
  --project "${PROJECT_ID}"
  --region "${REGION}"
  --image "${IMAGE_URI}"
  --port "${PORT}"
  --cpu "${CPU}"
  --memory "${MEMORY}"
  --min-instances "${MIN_INSTANCES}"
  --max-instances "${MAX_INSTANCES}"
  --concurrency "${CONCURRENCY}"
  --timeout "${TIMEOUT}"
)

if [[ "${ALLOW_UNAUTHENTICATED}" == "true" ]]; then
  deploy_args+=(--allow-unauthenticated)
fi

if [[ -n "${RUNTIME_SERVICE_ACCOUNT}" ]]; then
  deploy_args+=(--service-account "${RUNTIME_SERVICE_ACCOUNT}")
fi

if [[ -n "${RUNTIME_ENV_VARS}" ]]; then
  deploy_args+=(--set-env-vars "${RUNTIME_ENV_VARS}")
fi

if [[ -n "${RUNTIME_SECRETS}" ]]; then
  deploy_args+=(--set-secrets "${RUNTIME_SECRETS}")
fi

if [[ -n "${MIGRATION_JOB_NAME}" ]]; then
  update_job_args=(
    run jobs update "${MIGRATION_JOB_NAME}"
    --project "${PROJECT_ID}"
    --region "${REGION}"
    --image "${IMAGE_URI}"
  )

  if [[ -n "${MIGRATION_SERVICE_ACCOUNT}" ]]; then
    update_job_args+=(--service-account "${MIGRATION_SERVICE_ACCOUNT}")
  fi

  if [[ -n "${RUNTIME_ENV_VARS}" ]]; then
    update_job_args+=(--set-env-vars "${RUNTIME_ENV_VARS}")
  fi

  if [[ -n "${RUNTIME_SECRETS}" ]]; then
    update_job_args+=(--set-secrets "${RUNTIME_SECRETS}")
  fi

  echo "Updating migration job ${MIGRATION_JOB_NAME}"
  gcloud "${update_job_args[@]}"

  if [[ "${EXECUTE_MIGRATIONS}" == "true" ]]; then
    echo "Running migrations"
    gcloud run jobs execute "${MIGRATION_JOB_NAME}" \
      --project "${PROJECT_ID}" \
      --region "${REGION}" \
      --wait
  fi
fi

echo "Deploying service ${SERVICE_NAME}"
gcloud "${deploy_args[@]}"

echo "Deployed ${IMAGE_URI}"
