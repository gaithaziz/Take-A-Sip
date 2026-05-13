# Provider Follow-Ups

These are the remaining deployment-readiness checks that require provider dashboards, inbox confirmation, or plan-specific features. After each item is confirmed, update `docs/deployment-readiness.md` from `[~]` to `[x]`.

## Google Cloud Monitoring Email

Go to:

`Google Cloud Console` -> `Monitoring` -> `Alerting` -> `Notification channels`

Find:

`Take A Sip Production Alerts`

Confirm:

- The email is `takeasipdev@gmail.com`.
- The channel is enabled.
- The verification email was received and confirmed.

If the email has not been confirmed, resend verification from the notification channel page.

## Cloudflare R2 Versioning And Lifecycle

Go to:

`Cloudflare Dashboard` -> `R2` -> `take-a-sip-assets`

Confirm or configure:

- Object versioning is enabled if available on the current plan.
- Lifecycle rules exist for temporary or operational test objects.
- Normal uploaded menu images are kept long enough for production recovery.

Suggested lifecycle strategy:

- Keep normal uploaded menu images indefinitely.
- Expire `menu/ops-health/*` objects after 1 to 7 days.
- If object versioning is enabled, retain previous object versions for 30 to 90 days.

## Cloudflare R2 Least-Privilege Credentials

Go to:

`Cloudflare Dashboard` -> `R2` -> `Manage R2 API Tokens`

Confirm the production token is scoped only to:

- Bucket: `take-a-sip-assets`
- Permissions:
  - Object Read
  - Object Write
  - Object Delete

Avoid account-wide admin permissions.

If credentials are rotated, update Google Secret Manager:

```sh
gcloud secrets versions add s3-access-key-id \
  --project project-005ab1ae-ab75-41f8-bae \
  --data-file=-

gcloud secrets versions add s3-secret-access-key \
  --project project-005ab1ae-ab75-41f8-bae \
  --data-file=-
```

Then redeploy or restart Cloud Run so the service picks up the latest secret versions.

## Neon Provider Alerts

Go to:

`Neon Dashboard` -> `Take a Sip` project -> `Monitoring`, `Alerts`, or `Settings`

Look for alerts covering:

- Compute unavailable
- High connection usage
- Storage growth
- PITR, restore, or backup health if exposed on the current plan
- Branch or database availability

If Neon does not expose these alerts on the current plan, keep using the local readiness check:

```sh
NEON_RESTORE_DRILL_BRANCH_NAME=codex-restore-drill-20260513 \
./scripts/validate_neon_readiness.sh
```

## R2 Operational Monitoring

Cloudflare may not expose native alerting for every bucket failure mode on the current plan. The practical baseline is:

- Keep backend `/assets` smoke testing in every release.
- Add a permanent tiny health object, for example `menu/ops-health/live.txt`.
- Periodically verify the backend asset proxy can read it.

Example check:

```sh
curl -f https://take-a-sip-backend-prod-dxwxxm76vq-uc.a.run.app/assets/menu/ops-health/live.txt
```

If the permanent object is missing, upload it to R2 first under the same key.
