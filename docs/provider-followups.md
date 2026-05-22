# Provider Follow-Ups

Provider dashboard setup is complete. The remaining work is product/content readiness before app store review.

Status key:

- `[x]` Complete
- `[ ]` Still open

## Current Status

| Area | Status | Notes |
| --- | --- | --- |
| Google Cloud alert email | [x] | `Take A Sip Production Alerts` verified for `takeasipdev@gmail.com` on 2026-05-22. |
| Cloudflare R2 lifecycle/versioning | [x] | Bucket policy reviewed or configured for `take-a-sip-assets` on 2026-05-22. |
| Cloudflare R2 least-privilege token | [x] | Production token reviewed and scoped to required bucket/object permissions on 2026-05-22. |
| Neon monitoring/alerts | [x] | Provider alert capability checked; configured where available or accepted with readiness-script fallback on 2026-05-22. |
| R2 operational health object | [x] | `menu/ops-health/live.txt` uploaded and verified through the backend asset proxy on 2026-05-22. |
| Production menu | [ ] | Fill real menu data before submitting review builds. |
| Store listings and uploads | [ ] | Draft listings can start now; final screenshots/uploads wait for the complete menu. |

## Open Before Store Review

### Production Menu

- [ ] Finish the production menu before submitting any App Store or Google Play review build.

Complete:

- Production sections, items, types, sizes, addons, prices, availability, and images are filled in.
- Inactive or draft-only menu entries are hidden from customers.
- Customer menu screen works against production-like data.
- Cart pricing and checkout are tested with at least one pickup order and one delivery order.
- Admin menu editing works after production data is entered.
- Frontdesk order display shows real menu names and modifiers correctly.

Done means:

- The app no longer shows an empty menu or placeholder product data.
- Screenshots and store metadata truthfully represent the current app.
- Store reviewers can complete the main ordering flow without hitting unfinished content.

### App Store And Google Play

- [ ] Prepare store listings as drafts only until the menu is complete.

Safe to start now:

- Create or confirm Apple Developer and Google Play Console access.
- Create placeholder app records.
- Reserve bundle identifiers and package names.
- Draft app name, subtitle, short description, full description, category, support URL, marketing URL, and privacy policy URL.
- Draft Apple privacy nutrition and Google Play Data safety answers.
- Draft reviewer notes for OTP login, ordering, roles, location use, notifications, and admin image uploads.
- Gather screenshot requirements for target devices.

Wait until after the menu is complete:

- Final production screenshots.
- Final app preview videos, if any.
- Final review build upload.
- App Store review submission.
- Google Play production or open-testing submission.

Recommended order:

1. Fill and verify the production menu.
2. Run `docs/mobile-release-checklist.md`.
3. Prepare store listings as drafts.
4. Upload signed iOS and Android builds.
5. Submit for review only after app content, screenshots, privacy answers, and support links are aligned.

## Provider Reference

### Google Cloud Monitoring Email

Path:

`Google Cloud Console` -> `Monitoring` -> `Alerting` -> `Notification channels`

Verified:

- Channel: `Take A Sip Production Alerts`
- Email: `takeasipdev@gmail.com`
- Status: enabled and confirmed on 2026-05-22

Readiness link:

- `docs/deployment-readiness.md` Phase 4 notification-channel item is marked `[x]`.

### Cloudflare R2 Lifecycle And Versioning

Path:

`Cloudflare Dashboard` -> `R2` -> `take-a-sip-assets`

Policy:

- Keep normal uploaded menu images indefinitely.
- Expire temporary operational objects such as `menu/ops-health/*` after 1 to 7 days if lifecycle rules are available.
- Retain previous object versions for 30 to 90 days if versioning is available on the current plan.

Verified:

- Versioning/lifecycle posture reviewed or configured on 2026-05-22.
- Normal uploaded menu images are not covered by short expiry rules.

Readiness link:

- `docs/deployment-readiness.md` Phase 1 R2 lifecycle item is marked `[x]`.

### Cloudflare R2 Least-Privilege Token

Path:

`Cloudflare Dashboard` -> `R2` -> `Manage R2 API Tokens`

Required scope:

- Bucket: `take-a-sip-assets`
- Permissions: object read, write, and delete/list as required by backend uploads and smoke checks.
- Avoid account-wide admin permissions.

Verified:

- Production R2 token scope reviewed and adjusted on 2026-05-22.

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

Readiness link:

- `docs/deployment-readiness.md` Phase 1 R2 least-privilege item is marked `[x]`.

### Neon Provider Alerts

Path:

`Neon Dashboard` -> `Take a Sip` project -> `Monitoring`, `Alerts`, or `Settings`

Coverage to keep watching:

- Compute unavailable
- High connection usage
- Storage growth
- PITR, restore, or backup health if exposed on the current plan
- Branch or database availability

Fallback check:

```sh
NEON_RESTORE_DRILL_BRANCH_NAME=codex-restore-drill-20260513 \
./scripts/validate_neon_readiness.sh
```

Verified:

- Neon monitoring/alert capability checked on 2026-05-22.
- Alerts configured where available, or the readiness-script fallback accepted for the current plan.

Readiness link:

- `docs/deployment-readiness.md` Phase 4 Neon monitoring item is marked `[x]`.

### R2 Operational Health Object

Live check:

```sh
curl -f https://take-a-sip-backend-prod-dxwxxm76vq-uc.a.run.app/assets/menu/ops-health/live.txt
```

Expected response:

```text
ok
```

Verified:

- 2026-05-22: uploaded `menu/ops-health/live.txt` to `take-a-sip-assets`.
- 2026-05-22: backend asset proxy returned `200`.
- `scripts/smoke_cloud_run.sh` now includes this check.

If the object is ever missing, recreate it:

- Bucket: `take-a-sip-assets`
- Key: `menu/ops-health/live.txt`
- Content: `ok`

Readiness link:

- `docs/deployment-readiness.md` Phase 4 R2 monitoring item is marked `[x]`.
