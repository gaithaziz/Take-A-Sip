#!/usr/bin/env bash
set -euo pipefail

: "${BASE_URL:?Set BASE_URL, for example https://api.example.com}"

base_url="${BASE_URL%/}"

check() {
  local path="$1"
  echo "Checking ${base_url}${path}"
  curl --fail --silent --show-error "${base_url}${path}" >/dev/null
}

check "/health"
check "/ready"
check "/menu"
check "/promotions/active"

if [ -n "${AUTH_TOKEN:-}" ] && [ -n "${ORDER_ID:-}" ]; then
  echo "Checking authenticated order read"
  curl --fail --silent --show-error \
    -H "Authorization: Bearer ${AUTH_TOKEN}" \
    "${base_url}/orders/${ORDER_ID}" >/dev/null
else
  echo "Skipping authenticated order check. Set AUTH_TOKEN and ORDER_ID to include it."
fi

echo "Smoke checks passed."
