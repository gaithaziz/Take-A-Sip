# Agent Rules for Codex

This document defines how the coding agent must work in this repository.

The goal is to keep implementation consistent, predictable, and aligned with the project documents.

---

# 1. Source of Truth

The agent must treat the following files as the source of truth, in this order:

1. `/docs/PRD.md`
2. `/docs/ARCHITECTURE.md`
3. `/docs/DB_SCHEMA.md`
4. `/docs/API_SPEC.md`
5. `/docs/TECH_STACK.md`
6. `/docs/FRONTDESK_SUNMI_APP.md`
7. `/docs/RECEIPT_FORMAT.md`
8. `/docs/I18N_GUIDELINES.md`

If implementation details are unclear, the agent must prefer consistency with these documents instead of inventing behavior.

The agent must not silently override documented requirements.

---

# 2. General Working Rules

The agent must:

- read relevant docs before making changes
- keep changes scoped to the requested task
- avoid unrelated refactors
- prefer simple and maintainable implementations
- leave clear code comments only where needed
- keep naming consistent with docs
- avoid introducing speculative features

The agent must not:

- invent extra user roles
- invent online payment flows
- invent marketplace dispatch models
- invent live driver tracking
- invent dark mode
- invent unsupported order statuses
- replace the stack with different technologies
- change database design without updating docs

---

# 3. Required Stack Discipline

The agent must strictly use the stack defined in `/docs/TECH_STACK.md`.

That means:

## Backend
- Python 3.12
- FastAPI
- SQLAlchemy 2.x async style
- Alembic
- PostgreSQL
- Pydantic v2

## Mobile
- React Native
- Expo
- TypeScript
- React Navigation
- Axios
- i18next

## Admin
- React Native
- Expo
- TypeScript
- React Navigation
- Axios

The agent must not introduce alternative frameworks unless explicitly instructed.

---

# 4. Implementation Order

The agent should build features in this order unless instructed otherwise:

## Phase 1
Backend foundation:
- project structure
- configuration
- database connection
- models
- migrations
- auth basics
- i18n-ready schema fields

## Phase 2
Client mobile app:
- OTP auth UX
- menu browsing
- cart and checkout
- order history
- profile and language toggle

## Phase 3
Frontdesk app (Sunmi):
- realtime incoming orders
- order acceptance
- local receipt printing
- reconnect and missed-order recovery

## Phase 4
Admin app:
- menu management
- promotions and loyalty
- menu scheduling
- user moderation

## Phase 5
Delivery and feedback:
- delivery address + coordinates support
- distance-band delivery pricing
- manual driver assignment
- driver assigned-orders workflows
- latest orders feeds
- completed-order ratings and admin review analytics

## Phase 6
UI polish and testing:
- Arabic/English toggle
- RTL support
- light mode only
- testing
- bug fixing

---

# 5. Database Rules

The agent must follow these database rules:

- use UUID primary keys unless otherwise documented
- create Alembic migration for every schema change
- never rely on client-side pricing as source of truth
- store order snapshots for purchased items
- preserve historical accuracy of orders even if menu changes later

For order data, the agent must store snapshot fields at time of order.

Examples:
- item name snapshot
- size name snapshot
- addon name snapshot
- price snapshot

This prevents old orders from changing when menu items are edited later.

---

# 6. Order Rules

The system supports these order statuses only:

- NEW
- ACCEPTED
- ASSIGNED_TO_DRIVER
- OUT_FOR_DELIVERY
- DELIVERED
- COMPLETED
- CANCELLED

The agent must not add additional statuses unless explicitly instructed.

Frontdesk permissions:
- view incoming orders
- accept orders
- assign drivers to delivery orders

Admin permissions:
- full menu/inventory control
- promotions
- scheduling
- system management
- view users
- ban users
- unban users
- manage delivery distance bands
- assign drivers to delivery orders
- view ratings summary and detailed reviews

Client permissions:
- browse menu
- place order
- view past orders
- view latest own orders
- manage profile
- authenticate via OTP

Driver permissions:
- authenticate via OTP
- view assigned/latest delivery orders
- view delivery order details (customer name, phone, destination)
- open destination in Google Maps
- update assigned delivery order statuses

---

# 6.1 Delivery and Rating Rules

Delivery assignment:
- must be manual by frontdesk or admin
- must not auto-dispatch drivers

Delivery pricing:
- must use admin-editable distance bands
- backend calculates delivery fee from configured bands

Delivery location data:
- store `delivery_address_readable`
- store `delivery_latitude`
- store `delivery_longitude`

Ratings:
- allowed only when order status is `COMPLETED`
- one rating per order
- includes stars and optional note

Status transitions (must be validated server-side):
- NEW -> ACCEPTED | CANCELLED
- ACCEPTED -> ASSIGNED_TO_DRIVER | COMPLETED | CANCELLED
- ASSIGNED_TO_DRIVER -> OUT_FOR_DELIVERY | CANCELLED
- OUT_FOR_DELIVERY -> DELIVERED | CANCELLED
- DELIVERED -> COMPLETED

---

# 7. Menu Hierarchy Rules

The menu hierarchy is:

Section
-> Item
-> Type of Item
-> Size
-> Add-on

The agent must preserve this exact hierarchy in schema, API, and UI.

The admin can enable/disable any level of this hierarchy:
- section
- item
- type
- size
- add-on

Menu availability can be:
- manual on/off
- scheduled on/off

The agent must support both.

---

# 8. Promotions Rules

The agent must implement these promotion categories only:

## First-time user reward
Admin-configured offer for the user's first completed order.

## Loyalty reward
Admin-configured reward triggered after a configurable number of completed orders.

The agent must not invent a large generic discount engine unless explicitly requested.

Keep implementation simple, extensible, and aligned with current requirements.

---

# 9. Authentication Rules

Client auth flow:

- user enters first name
- user enters last name
- user enters phone number
- OTP is sent
- OTP is verified
- account is created or login is completed

The agent must build auth around phone-number OTP.

The agent must not replace this with email/password auth for clients.

Driver auth must use phone-number OTP.

Admin/frontdesk auth may use a simpler staff auth flow if needed, but must remain separate from client/driver OTP flows.

---

# 10. Internationalization Rules

The application must support:

- English
- Arabic

Requirements:
- all user-facing content must be translatable
- Arabic must support RTL layout
- English must support LTR layout
- language toggle must exist
- light mode only

The agent must avoid hardcoding user-visible strings directly in components unless routed through translation files.

Database entities that are shown to users should support bilingual fields where applicable:
- `name_en`
- `name_ar`
- `description_en`
- `description_ar`

---

# 11. UI Rules

The agent must follow these UI rules:

- light mode only
- clean, modern, simple layout
- bottom navigation for client app:
  - Home
  - Past Orders
  - Latest Orders
  - Profile
- offers ribbon at top of Home
- ribbon hidden when no active offers exist
- Arabic and English toggle supported
- UI should not depend on dark theme support

The agent must not implement dark mode toggles.

---

# 12. Frontdesk / Sunmi Rules

The Sunmi frontdesk app must:

- connect to backend in real-time
- display incoming orders clearly
- allow frontdesk to accept an order
- allow frontdesk to assign drivers for delivery orders
- print the receipt after acceptance
- recover missed orders after reconnect

The backend must not attempt to print directly.

Printing happens on the Sunmi device using Sunmi Printer SDK.

The agent must isolate printer-specific logic so it can be maintained easily.

---

# 13. API Rules

The agent must:

- keep APIs RESTful and predictable
- validate all request payloads with Pydantic
- enforce RBAC on protected endpoints
- keep response formats consistent
- avoid breaking documented endpoints without updating docs

For mobile and admin APIs:
- prefer stable response contracts
- keep naming clear
- avoid over-nesting response payloads unless useful
- include pagination for list endpoints (`limit`, `offset`)
- define role-based access rules explicitly per endpoint

For delivery APIs:
- enforce the documented status transition matrix
- enforce manual assignment constraints
- enforce delivery fee calculation from distance bands only

---

# 14. Testing Rules

The agent must include testing where practical.

Minimum expectations:

## Backend
- model validation tests
- order creation tests
- promotion eligibility tests
- schedule availability tests
- auth flow tests

## Frontend / Mobile
- basic screen behavior tests where easy
- key form validation
- i18n rendering checks

If full test coverage is not practical for a task, the agent must still test the critical logic it introduces.

---

# 15. Migration and Refactor Rules

The agent may refactor only when:

- necessary to complete the task
- it clearly reduces complexity
- it does not change documented behavior

The agent must avoid large refactors unrelated to the current task.

If a refactor changes structure significantly, the agent should keep behavior unchanged and update docs if needed.

---

# 16. Commit and PR Rules

For each task, the agent should:

1. identify relevant docs
2. implement the smallest complete solution
3. keep commits focused
4. ensure code builds
5. ensure migrations are included if needed
6. summarize changes clearly

Commit/PR summaries should mention:
- what was added
- what docs it follows
- any assumptions made
- any remaining TODOs

---

# 17. Assumption Rules

If a requirement is missing, the agent should:

1. first check project docs
2. prefer the simplest assumption consistent with current architecture
3. avoid building extra complexity
4. clearly document the assumption in its summary

The agent must not silently invent business logic.

---

# 18. Definition of Done

A task is considered done only if:

- implementation matches the relevant docs
- code is consistent with the required stack
- migrations are included if schema changed
- routes/components compile
- no unrelated breakage was introduced
- summary of changes is provided

---

# 19. Priority Principle

When there is tension between:
- speed
- completeness
- correctness

the agent should prioritize:

1. correctness
2. consistency with docs
3. maintainability
4. speed

---

# 20. Final Instruction

When in doubt, the agent must choose the simpler implementation that matches the current documented product requirements.

The agent must optimize for:
- reliable ordering
- correct menu hierarchy
- clean bilingual UX
- maintainable codebase
- minimal business-logic surprises

---

21. # User Ban Rules

The agent must support admin user moderation.

Rules:
- admin can view users
- admin can ban a user
- admin can unban a user
- banned users cannot log in successfully
- banned users cannot place new orders
- banning/unbanning should be auditable if practical

