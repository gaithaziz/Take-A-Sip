# Backend (Phase 1)

FastAPI + async SQLAlchemy backend for the coffee shop ordering system.

## Run locally (without Docker)

1. Create virtual environment and install dependencies:

```bash
cd backend
python -m venv .venv
# Windows PowerShell:
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

2. Configure environment:

```bash
copy .env.example .env
```

3. Run migrations:

```bash
alembic upgrade head
```

4. Start API:

```bash
uvicorn app.main:app --reload
```

API will be available at `http://localhost:8000`.

## Create an Admin User (for mobile admin login)

```bash
cd backend
python -m scripts.create_admin --phone 0790000000 --first-name Admin --last-name Owner
```

Then login from the mobile app using that phone number and the configured OTP test code (default: `123456` when using mock OTP provider).

## Seed Full Demo Data (entire app)

Run this to seed users, full menu hierarchy, schedules, promotions, loyalty rules, and sample orders:

```bash
cd backend
python -m scripts.seed_full --reset
```

Use without `--reset` to append/update without clearing existing seeded entities:

```bash
python -m scripts.seed_full
```

## Run tests

```bash
pip install -r requirements-dev.txt
pytest -q
```

For integration API tests, set a PostgreSQL URL first:

```bash
set TEST_DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/take_a_sip_test
pytest -q
```

If `TEST_DATABASE_URL` is not set, integration tests are skipped automatically.

## Run with Docker Compose

```bash
docker compose up --build
```

This starts:
- PostgreSQL on `localhost:5432`
- Backend API on `localhost:8000`

## Key endpoints

- `POST /auth/send-otp`
- `POST /auth/verify-otp`
- `GET /menu`
- `POST /orders`
- `GET /orders/{id}`
- `GET /orders/user/{user_id}`
- `GET /orders?status=NEW`
- `POST /orders/{id}/accept`
- `GET /promotions/active`
- `POST /admin/menu/section`
- `POST /admin/menu/item`
- `POST /admin/menu/type`
- `POST /admin/menu/size`
- `POST /admin/menu/addon`
- `PATCH /admin/menu/{id}/toggle?entity_type=...`
- `POST /admin/menu/schedule`
- `GET /admin/users`
- `POST /admin/users/{id}/ban`
- `POST /admin/users/{id}/unban`
- `GET /admin/analytics/revenue-summary`
- `WS /ws/frontdesk` with `Authorization: Bearer <JWT>` (query token still accepted as a compatibility fallback)

## Notes

- Menu schedules are now persisted in `menu_schedules` and enforced in:
  - `GET /menu`
  - `POST /orders` (scheduled-off entities are rejected)
- OTP delivery uses a provider abstraction:
  - `otp_provider=mock` (default, no external SMS call)
  - `otp_provider=mersal` with `mersal_api_url` and `mersal_api_key`
  - `otp_provider=twilio` with Twilio credentials in `.env`
- Admin revenue summary endpoint returns gross revenue and order counts for:
  - today
  - last 7 days
  - last 30 days
  using orders in status `ACCEPTED` and `COMPLETED`.
