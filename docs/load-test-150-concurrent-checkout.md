# 150-Concurrent Checkout Load Test

## Purpose

Use this runbook to prove the staging backend can handle **150 concurrent users in a worst-case checkout rush** before store launch. The full 150-user proof runs on staging first. Production gets only a smaller, explicitly approved proof after staging passes.

Pass criteria:

- p95 measured API latency is under `1500ms`.
- measured error rate is under `1%`.
- `POST /orders` p95 is under `1500ms`.
- `active_order_conflicts` is `0`.
- `capacity_or_rate_limit_429` is `0`.
- Cloud Run and Neon do not show sustained connection, CPU, memory, or queue pressure.

## Staging Capacity Profile

Baseline the current staging revision first, then deploy the target profile. Use the normal staging deploy environment from the backend deployment runbook, plus these capacity overrides:

```sh
MIN_INSTANCES=1 \
MAX_INSTANCES=5 \
CONCURRENCY=40 \
CPU=1 \
MEMORY=512Mi \
./deploy.sh
```

Keep the database settings aligned with the production readiness posture:

- Runtime `DATABASE_URL` uses the Neon pooled host with `-pooler`.
- Migration `MIGRATION_DATABASE_URL` uses the direct Neon host.
- `DATABASE_POOL_SIZE=5` and `DATABASE_MAX_OVERFLOW=5`.
- With 5 Cloud Run instances, the app-side pool allows up to 50 database connections.

If staging fails:

- Cloud Run queueing or 429s: test `MAX_INSTANCES=8`, keep `CONCURRENCY=40`.
- High Cloud Run CPU: test `CPU=2`, `MEMORY=1Gi`, keep `CONCURRENCY=40`.
- Neon pool waits or high Neon CPU: raise Neon compute/autoscaling for the launch window.
- Only `POST /orders` is slow: replace advisory-lock `max(order_number)+1` allocation with a Postgres sequence migration.

## Prepare Test Users

Install k6 locally if needed:

```sh
brew install k6
```

Set the staging inputs:

```sh
export BASE_URL='https://staging-api.example.com'
export RUN_ID="$(date -u +%Y%m%d%H%M%S)"
export TARGET_VUS=150
export ORDER_TYPE=delivery
export OTP_TEST_CODE='123456'
export CLIENT_PHONE_PREFIX='079150'
```

Prepare the authenticated user fixture:

```sh
python3 scripts/load/prepare_checkout_users.py
```

The script writes `scripts/load/checkout-users.json`, which contains bearer tokens and is ignored by git. It uses `/auth/send-otp` and `/auth/verify-otp`, so it respects the app's OTP rate limits by default. With the current unauthenticated `/auth/send-otp` limit, preparing 150 users can take about 30 minutes. To speed this up, temporarily raise or disable the OTP send/verify limits in staging only, run the preparation script, then restore the normal limits before running k6.

Optional environment variables:

- `LOAD_FIXTURE`: fixture path. The default is `checkout-users.json` next to the k6 script.
- `OTP_SEND_INTERVAL_SECONDS`: delay between OTP sends, default `12.5`.
- `DELIVERY_LATITUDE` and `DELIVERY_LONGITUDE`: delivery quote/order coordinates, default to the store coordinates from seed data.
- `HTTP_TIMEOUT_SECONDS`: request timeout, default `30`.

## Run The Load Test

Warm staging and verify basic dependencies:

```sh
BASE_URL="$BASE_URL" ./scripts/smoke_cloud_run.sh
```

Run the checkout rush:

```sh
k6 run scripts/load/checkout-worst-case.js
```

The k6 script runs:

- 5-minute warmup with lightweight health/menu/promotions requests.
- 2-minute ramp to 150 VUs.
- 10-minute hold at 150 VUs.
- 1-minute ramp down.

Each checkout VU uses one prepared client token, loads menu/promotions, requests a delivery quote, evaluates promotions, creates one delivery order, and tags the order notes with `load-test:<RUN_ID>`.

Useful overrides:

```sh
LOAD_FIXTURE="$PWD/scripts/load/checkout-users.json" \
TARGET_VUS=150 \
WARMUP_DURATION=5m \
RAMP_DURATION=2m \
HOLD_DURATION=10m \
RAMP_DOWN_DURATION=1m \
k6 run scripts/load/checkout-worst-case.js
```

## Cleanup

Create or paste an admin token for the same staging backend, then cancel NEW load-test orders:

```sh
export ADMIN_TOKEN='admin-jwt-here'
python3 scripts/load/cleanup_checkout_orders.py
```

The cleanup script pages `/orders/latest`, finds orders with `load-test:<RUN_ID>` in the notes, and cancels only orders still in `NEW`. It reports tagged orders in other statuses so the store team can handle them intentionally.

## What To Monitor

During the run, watch:

- Cloud Run request count, p95 latency, 5xx, 429, instance count, CPU, memory, startup latency, and request concurrency.
- Neon active connections, pooler client/server connections, waiting clients, CPU, RAM, and autoscaling behavior.
- Backend logs for slow `POST /orders`, failed WebSocket broadcasts, notification failures, and DB pool timeouts.

Keep the k6 terminal output and monitoring screenshots as release evidence.

## Production Proof

After staging passes, run production only off-hours and only with approval:

- Run `./scripts/smoke_cloud_run.sh` against production.
- Use `TARGET_VUS=50`.
- Do not run `prepare_checkout_users.py` against production if it would trigger real SMS.
- Use pre-approved production test accounts/tokens and a fixture equivalent to `checkout-users.json`.
- Run cleanup immediately and confirm no real customer-visible test orders remain active.
