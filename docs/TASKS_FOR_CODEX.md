# Implementation Tasks for Codex

## Phase 1 - Backend

Status: Complete

Scope:
- authentication (OTP)
- menu APIs
- order creation
- order snapshots
- websocket system
- admin APIs

---

## Phase 2 - Mobile App

Status: Complete

Scope:
- Authentication (signup/login with OTP)
- Home (menu)
- Product Details
- Cart
- Checkout
- Past Orders
- Profile
- language toggle (English / Arabic)
- offers ribbon (rotating promotions)

---

## Phase 3 - Frontdesk App (Sunmi)

Status: Complete (implementation)

Delivered:
- websocket connection
- incoming order list
- order details
- order accept button
- receipt printing (Sunmi SDK)
- alert sound/vibration when new order arrives
- reconnect handling and missed-order reload
- printing failure safety (failed-print queue + reprint)
- language toggle and RTL support

Remaining non-blocking operational checks:
1. End-to-end live order flow test with seeded menu/order data.
2. Live printer failure/reprint drill on device.
3. Optional full lock-task kiosk lockdown.

---

## Phase 4 - Admin Mobile App

Status: Not started

Planned scope:
- menu editor
- promotion manager
- loyalty rules
- schedule menu
- user list
- ban/unban users

---

## Phase 5 - Delivery Operations and Feedback

Status: Not started

Planned scope:
- delivery address capture with map coordinates + readable address
- delivery workflow statuses in backend and apps
- manual driver assignment by frontdesk/admin
- driver role OTP login
- driver assigned orders list + order detail + Google Maps open link
- admin-managed distance bands and distance-based delivery fee calculation
- latest orders sections for relevant roles
- post-completion order rating (stars + optional note)
- admin ratings summary and detailed reviews

Dependencies:
1. DB migrations for delivery/rating entities and order status updates.
2. API updates and RBAC for new delivery/driver/rating endpoints.
3. Frontend role-based UI surfaces (client/frontdesk/admin/driver).

Production readiness checklist (must be complete before implementation starts):
1. Finalize order status transition matrix and per-role permissions.
2. Finalize distance calculation policy (Haversine from store coordinates).
3. Ensure `store_settings` and distance-band constraints are documented and migrated.
4. Define pagination/filter contracts for latest-orders and reviews endpoints.
5. Define driver assignment constraints and reassignment rules.

---

## Phase 7 - Production Reliability and Operations

Status: Complete

Delivered:
- admin dashboard analytics expansion (`/admin/analytics/dashboard`)
- structured backend logging with request IDs
- consistent backend error response envelope
- backend query/index performance improvements
- client/admin/driver order visibility polish
- admin-driven staff provisioning flow (`/admin/users/provision-staff` + admin staff tab)
- security checks and integration coverage for key guards
- operational metrics endpoint (`/metrics`)

Release checkpoint:
1. API contract freeze for existing order/auth/cart/navigation flows.
2. Run `backend/scripts/smoke_phase7_staff_provisioning.py` in pre-release.
3. Ensure production `.env` uses non-default secrets/providers.
