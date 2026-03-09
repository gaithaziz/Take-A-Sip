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
