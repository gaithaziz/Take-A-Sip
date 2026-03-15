# Phase 7 Release Checkpoint

This checklist is the final verification gate for production readiness.

## 1) Environment and Secrets

- `JWT_SECRET_KEY` is set to a non-default strong secret.
- OTP provider is configured for production usage (not mock).
- `DEBUG=false`
- `SQL_ECHO=false`
- `LOG_LEVEL=INFO` (or stricter as needed)

## 2) Migrations

- Run:
  - `alembic upgrade head`
- Confirm all migrations applied successfully in production DB.

## 3) Core Smoke Tests

- Run:
  - `python backend/scripts/smoke_phase7_staff_provisioning.py --base-url http://<api-host>:<port>`
- Validate result returns `"status":"ok"`.

## 4) RBAC and Guard Checks

- Admin can access `/admin/analytics/dashboard`.
- Non-admin is denied for admin-only endpoints.
- Banned users cannot place orders.
- Users cannot rate orders they do not own.

## 5) Observability

- Verify `/health` returns `{"status":"ok"}`.
- Verify `/metrics` returns request counters and latency snapshot.
- Confirm structured logs include request IDs and key order/auth events.

## 6) Release Freeze Notes

- No breaking API changes without coordinated versioning/migration notes.
- Preserve existing navigation graph and core order/cart/rating behavior.
