# Technical Stack

This document defines the official technology stack for the Coffee Shop Ordering System.

All implementations must strictly follow this stack unless explicitly updated.

---

# 1. Backend

Language
Python 3.12

Framework
FastAPI

Server
Uvicorn (ASGI)

ORM
SQLAlchemy 2.x (async)

Database
PostgreSQL 15+

Migration Tool
Alembic

Validation
Pydantic v2

Authentication
JWT tokens

OTP Service
External SMS provider (Twilio or local SMS gateway)

Background Jobs
FastAPI BackgroundTasks (initial)
Optional later: Redis + Celery

Realtime Communication
WebSockets (FastAPI native)

---

# 2. Mobile App

Framework
React Native

Runtime
Expo

Language
TypeScript

Navigation
React Navigation

State Management
React Context + Hooks

Networking
Axios

UI Components
React Native Paper or custom components

Internationalization
i18next

---

# 3. Admin Dashboard

Framework
Next.js (App Router)

Language
TypeScript

Styling
Tailwind CSS

UI Components
shadcn/ui

Charts
Recharts

Data Fetching
SWR

---

# 4. Sunmi Frontdesk App

Platform
Android

Recommended Approach
React Native + Native Module

Printer Integration
Sunmi Printer SDK

Realtime Orders
WebSocket connection to backend

Device Mode
Kiosk mode recommended

---

# 5. Infrastructure

Containerization
Docker

Local Development
Docker Compose

Services

backend
postgres
(optional) redis

Reverse Proxy
Caddy or Nginx

SSL
Let's Encrypt

---

# 6. Internationalization

Supported Languages

English
Arabic

All text fields must support:

*_en
*_ar

Arabic UI must support RTL layout.

---

# 7. Code Standards

Backend

- type hints required
- async endpoints
- SQLAlchemy 2.0 style queries
- migrations for all schema changes

Frontend

- TypeScript only
- functional React components
- hooks only (no class components)

---

# 8. Repository Structure

Recommended structure:

backend/
    app/
        api/
        models/
        services/
        schemas/
        core/
        websocket/
    migrations/

mobile/
    src/
        screens/
        components/
        services/
        hooks/
        i18n/

admin/
    app/
    components/
    lib/

docs/
    PRD.md
    ARCHITECTURE.md
    DB_SCHEMA.md
    API_SPEC.md
    TECH_STACK.md