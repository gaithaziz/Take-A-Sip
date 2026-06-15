# Take A Sip

Take A Sip is a multi-app coffee shop ordering platform. The repo contains
the customer/driver/admin mobile app, a frontdesk order handling app, a web
admin dashboard, and the FastAPI backend that powers menu, ordering, delivery,
promotions, push notifications, and staff workflows.

## Apps

- `backend/`: API, auth, menu, orders, delivery, promotions, and push
  notifications. Built with FastAPI, async SQLAlchemy, Alembic, and PostgreSQL.
- `mobile/`: Customer, driver, and admin mobile app. Built with Expo SDK 54
  and React Native.
- `frontdesk/`: Order intake and Sunmi printer frontdesk app. Built with Expo
  and React Native.
- `admin/`: Browser admin dashboard. Built with Next.js.
- `infra/`: Deployment and infrastructure notes.

## Quick Start

Install the root tooling and app dependencies:

```bash
npm install
npm --prefix admin install
npm --prefix mobile install
npm --prefix frontdesk install
```

Start the backend with Docker:

```bash
npm run backend
```

Start the admin dashboard:

```bash
npm run admin
```

Start the frontdesk app:

```bash
npm run frontdesk
```

Start the mobile app:

```bash
npm run mobile
```

Or run the main local services together:

```bash
npm run all
```

## Environment

Environment files are intentionally ignored by git. The backend and mobile app
include example files to copy before filling in local values.

Backend:

```bash
cp backend/.env.example backend/.env
```

Mobile:

```bash
cp mobile/.env.example mobile/.env
```

Mobile/frontdesk builds need an API base URL:

```bash
EXPO_PUBLIC_API_BASE_URL="http://<LAN_IP>:8000"
```

For frontdesk development, set that value in the shell before starting Expo or
create a local `frontdesk/.env` file.

Production mobile builds require HTTPS for `EXPO_PUBLIC_API_BASE_URL`. iOS
release builds with embedded Google Maps should be installed through:

```bash
mobile/scripts/install-ios-release.sh
```

That script loads `mobile/.env`, builds a production iOS app, verifies the
Google Maps key resolved into the native app bundle, verifies `main.jsbundle`
exists, and installs to the connected iPhone.

## Backend

Common commands:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt -r requirements-dev.txt
alembic upgrade head
uvicorn app.main:app --reload
```

Seed demo data:

```bash
cd backend
python -m scripts.seed_full --wipe
```

Create an admin user:

```bash
cd backend
python -m scripts.create_admin \
  --phone 0790000000 \
  --first-name Admin \
  --last-name Owner
```

See `backend/README.md` and `backend/DEPLOYMENT.md` for deeper backend details.

## Tests

Mobile:

```bash
cd mobile
npm run typecheck -- --pretty false
npm test -- --runInBand
```

Backend:

```bash
cd backend
.venv/bin/python -m pytest tests/test_auth_service.py tests/test_auth_guards.py
```

Backend integration tests require `TEST_DATABASE_URL`; without it, those tests
skip locally.

```bash
cd backend
TEST_DATABASE_URL="postgresql+asyncpg://..." \
  .venv/bin/python -m pytest tests/integration
```

## Auth Sessions

The backend issues short-lived access tokens plus long-lived refresh tokens.
Refresh tokens are stored hashed in the database, rotated on use, and cleared
on account deletion. The mobile app stores both tokens in SecureStore and
silently refreshes once on `401` before asking the user to sign in again.

## CI/CD

GitHub Actions cover:

- Backend CI and staging/prod deploy workflows
- Mobile CI and release workflow
- Frontdesk CI
- Admin CI
- Secret scanning
- CodeQL
- Backend container scanning

Workflow files live in `.github/workflows/`.

## Useful Docs

- `backend/README.md` - backend setup, seed scripts, endpoints
- `mobile/README.md` - Expo mobile setup
- `frontdesk/README.md` - Sunmi/frontdesk setup
- `infra/README.md` - infrastructure notes
- `docs/store-launch-plan.md` - launch checklist
- `docs/provider-followups.md` - provider follow-ups
