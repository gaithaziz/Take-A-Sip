# Deployment Readiness Checklist

This checklist tracks the remaining hardening work before treating the app as production-ready. It is ordered by risk and should be completed with tests, staging validation, and rollback awareness.

Status key:

- `[x]` Completed in repo, locally verified, or live-provider verified.
- `[~]` Repo support added, but live provider/staging verification is still required.
- `[ ]` Requires an operator action in Google Cloud, Neon, Cloudflare, Expo, or GitHub.

## Target Stack

- Backend runtime: Google Cloud Run
- Database: Neon Postgres
- Object storage: Cloudflare R2 buckets
- Mobile runtime: Expo/React Native
- Frontdesk runtime: Expo/React Native Android on Sunmi

## Phase 0: Stack Drift Check

- [x] Confirm Google Cloud Run service does not keep unused Cloud SQL attachments once Neon is the confirmed database. Verified production service/job on 2026-05-13.
- [x] Confirm Cloud Run runtime env uses the Neon pooled URL for `DATABASE_URL`. Production secret host contains `-pooler` and uses SSL.
- [x] Confirm Cloud Run migration job uses the Neon direct URL for `MIGRATION_DATABASE_URL`. Production secret host is direct Neon and uses SSL.
- [x] Confirm Cloud Run runtime env sets `STORAGE_BACKEND=s3` when Cloudflare R2 is intended for uploads. Verified in production Cloud Run.
- [x] Confirm Cloud Run runtime env sets `S3_ENDPOINT_URL`, `S3_BUCKET_NAME`, `STORAGE_PUBLIC_BASE_URL`, and R2 credentials through Secret Manager or environment variables. Verified in production Cloud Run.
- [x] Update or archive older docs that still describe Cloud SQL or Cloud Storage as the target production database/storage stack. `docs/GCP_CICD_DEPLOYMENT_PLAN.md` is marked historical.

## Phase 1: Data Safety

- [x] Confirm the live backend `DATABASE_URL` and `MIGRATION_DATABASE_URL` point to the intended Neon project, branch, and database. Verified production Neon project `cool-feather-06036400`, database `neondb`.
- [x] Confirm Neon point-in-time restore/history retention for every live database environment. Production reports `history_retention_seconds=21600` (6 hours).
- [x] Decide the required Neon restore window for staging and production based on the current plan limits. Current verified production window is 6 hours.
- [x] Document the exact Neon restore workflow, including whether restore uses a new branch or overwrites an environment. The documented workflow uses a new branch.
- [x] Perform one restore drill into a non-production Neon branch. Created temporary branch `codex-restore-drill-20260513`, expiring 2026-05-14.
- [x] Confirm migrations can run against a restored Neon branch. Alembic upgraded restored branch through `0022_extend_rls_user_tables`.
- [~] Confirm the app can be temporarily pointed at a restored Neon branch for emergency verification. Restore branch and command are proven; no staging Cloud Run cutover was performed.
- [~] Confirm Cloudflare R2 bucket versioning/lifecycle policy strategy for uploaded menu images and assets. Backend asset retrieval is verified through `/assets`; provider-side versioning/lifecycle still needs Cloudflare dashboard review.
- [x] Document the Cloudflare R2 recovery process for accidentally deleted or overwritten assets.
- [~] Confirm the backend has least-privilege R2 credentials scoped to the required bucket/actions. Production credentials can put/head/delete temp objects in `take-a-sip-assets`; permission scope still needs Cloudflare policy review.

## Phase 2: API Abuse Protection

- [x] Add global backend rate limiting middleware.
- [x] Add stricter limits for `/auth/send-otp`.
- [x] Add stricter limits for `/auth/verify-otp`.
- [x] Add per-user or per-token limits for order creation.
- [x] Add limits for upload/image endpoints.
- [x] Add admin mutation limits to prevent accidental rapid destructive actions.
- [x] Return consistent `429` error responses with retry guidance.
- [x] Add tests for rate-limit allow/block behavior.

## Phase 3: App Crash Safety

- [x] Add a top-level React error boundary to the mobile app.
- [x] Add a top-level React error boundary to the frontdesk app.
- [x] Show a fallback screen with a retry/reload action.
- [x] Prevent fallback UI from exposing raw stack traces to users.
- [x] Add tests for the fallback screen. Mobile has Jest coverage; frontdesk is covered by TypeScript because it does not currently have a Jest setup.
- [x] Decide whether to add crash reporting such as Sentry. Deferred for now; React error boundaries plus backend Cloud Monitoring alerts are in place, and crash reporting can be added after first production feedback if needed.

## Phase 4: Monitoring And Alerts

- [~] Confirm Cloud Monitoring notification channels are configured and actually notify someone. Created enabled email channel `Take A Sip Production Alerts`; inbox receipt still needs human confirmation.
- [x] Add a Google Cloud Run alert for elevated backend `5xx` rate.
- [x] Add a Google Cloud Run alert for high backend latency.
- [x] Add an alert for Cloud Run revision startup/deploy failures.
- [x] Add an alert for failed migration jobs.
- [~] Add Neon monitoring checks for compute health, connection pressure, storage growth, and branch/database availability. Neon project metrics were inspected; provider-side alert integration still depends on Neon plan/integration.
- [x] Add alerts for Neon restore/backup/PITR health if available on the current Neon plan. Current `neonctl` does not expose alert setup; `scripts/validate_neon_readiness.sh` now verifies retention, branch readiness, and restore-drill visibility, with dashboard alerting documented if the plan exposes it later.
- [~] Add Cloudflare R2 monitoring or operational checks for bucket access failures and unexpected storage growth. Backend `/assets` retrieval is smoke-tested; provider-side storage-growth alerting still needs Cloudflare dashboard/API setup.
- [x] Keep uptime checks pointed at `/health` to avoid waking the DB unnecessarily.
- [x] Use `/ready` only for deployment smoke tests and deeper checks.

## Phase 5: Dependency And Supply-Chain Scanning

- [x] Add dependency audit for the frontdesk app.
- [x] Decide whether backend and mobile dependency audits should fail CI or remain warning-only. They are warning-only to avoid blocking emergency deploys while still surfacing issues.
- [x] Add Dependabot for backend Python dependencies.
- [x] Add Dependabot for mobile, frontdesk, admin, and root npm dependencies.
- [x] Add CodeQL or an equivalent static analysis workflow.
- [x] Add container image vulnerability scanning for backend images.
- [x] Keep Gitleaks secret scanning enabled for pushes and pull requests.

## Phase 6: RLS Hardening

- [x] Design RLS policies for `users` without breaking login/auth lookup.
- [x] Design RLS policies for `user_push_tokens`.
- [x] Design RLS policies for `user_events`.
- [~] Add tests for OTP login, kiosk login, `/auth/me`, profile update, and account deletion under the new policies. Existing auth integration tests pass against Postgres; Alembic RLS migration applies cleanly. Staging must verify the live app role path after migration.
- [~] Add tests for admin user management under the new policies. Existing admin integration tests pass against Postgres; staging must verify with RLS enabled by migration.
- [~] Add tests for push token registration/removal under the new policies. Existing notification integration tests pass against Postgres; staging must verify with RLS enabled by migration.
- [x] Deploy to staging first and verify authenticated client, driver, frontdesk, and admin flows. Staging revision `take-a-sip-backend-staging-00013-x59` passed client `/auth/me`, admin `/admin/users`, frontdesk `/orders/latest`, and driver `/driver/orders/latest`.

## Phase 7: Session Hardening

- [x] Review current JWT expiry for production use. Production docs set `ACCESS_TOKEN_EXPIRE_MINUTES=720`.
- [x] Decide whether to add refresh tokens. Not added; current production stance is access tokens plus secure platform storage.
- [x] Add server-side session/device records if token revocation is required. Not required under the current production policy; revisit when remote forced logout becomes a product requirement.
- [x] Add admin ability to revoke a user's active sessions if session records are added. Deferred with server-side session records.
- [x] Store mobile tokens in secure platform storage where possible. Mobile and frontdesk use Expo SecureStore.
- [x] Add tests for logout, banned users, inactive users, and deleted accounts. Existing auth and guard tests cover banned/inactive/deleted behavior; logout is client-side token removal through SecureStore.

## Phase 8: Final Release Checks

- [x] Confirm stack drift checks still pass before release. `scripts/validate_cloud_run_readiness.sh` passed against production on 2026-05-13.
- [x] Run the full backend test suite locally. Result: 58 passed against Postgres `take_a_sip_test`.
- [x] Run mobile typecheck and tests.
- [x] Run frontdesk typecheck.
- [x] Run Google Cloud Run deployment smoke tests against staging. Staging `/health`, `/ready`, `/menu`, `/promotions/active`, and `/assets` smoke checks passed.
- [x] Verify `/health`, `/ready`, `/menu`, `/promotions/active`, and authenticated order endpoints on Cloud Run. Production smoke plus authenticated client, admin, frontdesk, and driver reads passed on 2026-05-13.
- [x] Verify Neon restore/history status after deployment. Production restore branch drill and 6-hour history retention verified.
- [x] Verify Cloudflare R2 upload and public asset retrieval after deployment. S3 put/delete and backend `/assets` retrieval passed in staging and production.
- [x] Verify alert policies and notification channels after deployment. Five production alert policies are enabled and wired to the email channel.
- [x] Record the deployed Cloud Run revision and image tag. Revision `take-a-sip-backend-prod-00010-zks`, image `backend:r2-asset-proxy-20260513`.
- [x] Confirm rollback workflow works for the latest known-good revision. No-op rollback drill routed 100% traffic to current ready revision `take-a-sip-backend-prod-00010-zks`, then smoke checks passed.
