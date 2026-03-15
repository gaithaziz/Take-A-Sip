# System Architecture

## Core Components

Mobile App
React Native + Expo

Admin App
React Native + Expo

Frontdesk App
Sunmi V2 Pro Android client

Driver Role Interface
React Native + Expo (role-scoped screens)

Backend API
FastAPI

Database
PostgreSQL

Realtime System
WebSockets

Printer Device
Sunmi V2 Pro

---

# System Diagram

Client App
     |
     | REST API
     |
Backend (FastAPI)
     |
     | WebSocket
     |
Frontdesk Sunmi Device

Admin App
     |
     | REST API
     |
Backend

Driver Interface
     |
     | REST API
     |
Backend

---

# Delivery Architecture

Delivery order flow:
1. Client submits delivery order with readable address + coordinates.
2. Backend calculates delivery distance from `store_settings` coordinates using Haversine distance.
3. Backend calculates delivery fee from active admin-managed distance bands.
4. Frontdesk/admin manually assigns a driver.
5. Driver updates order through delivery statuses.
6. System marks order completed after delivery workflow is finished.

No live driver tracking is implemented.

Google Maps integration is link-based only (open destination URL using stored coordinates/address).

---

# Order Lifecycle and Ownership

Supported statuses:
- NEW
- ACCEPTED
- ASSIGNED_TO_DRIVER
- OUT_FOR_DELIVERY
- DELIVERED
- COMPLETED
- CANCELLED

Transition control:
- backend validates allowed transitions
- backend validates actor role for each transition
- driver can update only assigned delivery orders

---

# Realtime Orders

Backend pushes events using WebSockets.

When a new order is created:

1. Order saved in database
2. Event broadcast to Sunmi device
3. Sunmi shows alert

Latest orders pages use REST endpoints with pagination and role-based filtering.

---

# Printing

Sunmi device prints locally using Sunmi Printer SDK.

Backend only sends order data.

Printing is never performed on the backend.

---

# Ratings and Reviews

After order completion, clients can submit 1-5 star ratings with optional notes.

Backend enforces:
- completed-order-only rating
- one rating per order
- own-order-only rating submission

Admin dashboard consumes:
- ratings summary endpoint
- detailed reviews endpoint

---

# Reliability

Sunmi device must:

- auto reconnect websocket
- request missed orders on reconnect

Example endpoint:

GET /orders/latest

Order changes should be written to `order_events` for auditability.

---

# User Moderation

User moderation is managed by admin APIs.

Banned users are blocked at the backend authorization/business-logic layer.

A banned user must not:
- authenticate successfully
- place new orders
