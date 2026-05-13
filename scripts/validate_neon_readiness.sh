#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${NEON_PROJECT_ID:-}"
PRODUCTION_BRANCH_NAME="${NEON_PRODUCTION_BRANCH_NAME:-production}"
MIN_HISTORY_RETENTION_SECONDS="${NEON_MIN_HISTORY_RETENTION_SECONDS:-21600}"
RESTORE_DRILL_BRANCH_NAME="${NEON_RESTORE_DRILL_BRANCH_NAME:-}"

if [ -z "$PROJECT_ID" ] && [ -f ".neon" ]; then
  PROJECT_ID="$(jq -r '.projectId // empty' .neon)"
fi

if [ -z "$PROJECT_ID" ]; then
  echo "NEON_PROJECT_ID is required, or .neon must contain projectId." >&2
  exit 1
fi

if ! command -v neonctl >/dev/null 2>&1; then
  echo "neonctl is required for Neon readiness checks." >&2
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "jq is required for Neon readiness checks." >&2
  exit 1
fi

project_json="$(neonctl projects list --output json --no-analytics)"
retention_seconds="$(
  jq -r --arg project_id "$PROJECT_ID" '
    .[] | select(.id == $project_id) | .history_retention_seconds // empty
  ' <<<"$project_json"
)"

if [ -z "$retention_seconds" ]; then
  echo "Could not find Neon project $PROJECT_ID." >&2
  exit 1
fi

if [ "$retention_seconds" -lt "$MIN_HISTORY_RETENTION_SECONDS" ]; then
  echo "Neon history retention is ${retention_seconds}s, below required ${MIN_HISTORY_RETENTION_SECONDS}s." >&2
  exit 1
fi

branches_json="$(neonctl branches list --project-id "$PROJECT_ID" --output json --no-analytics)"
production_state="$(
  jq -r --arg branch_name "$PRODUCTION_BRANCH_NAME" '
    .[] | select(.name == $branch_name) | .current_state // empty
  ' <<<"$branches_json"
)"

if [ "$production_state" != "ready" ]; then
  echo "Neon production branch '$PRODUCTION_BRANCH_NAME' is not ready. State: ${production_state:-missing}." >&2
  exit 1
fi

if [ -n "$RESTORE_DRILL_BRANCH_NAME" ]; then
  restore_state="$(
    jq -r --arg branch_name "$RESTORE_DRILL_BRANCH_NAME" '
      .[] | select(.name == $branch_name) | .current_state // empty
    ' <<<"$branches_json"
  )"

  if [ "$restore_state" != "ready" ]; then
    echo "Neon restore drill branch '$RESTORE_DRILL_BRANCH_NAME' is not ready. State: ${restore_state:-missing}." >&2
    exit 1
  fi
fi

echo "Neon readiness checks passed for $PROJECT_ID. Retention: ${retention_seconds}s; production branch: ${production_state}."
