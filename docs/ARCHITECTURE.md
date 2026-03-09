# System Architecture

## Core Components

Mobile App
React Native + Expo

Admin App
React Native + Expo

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


User moderation is managed by admin APIs.

Banned users are blocked at the backend authorization/business-logic layer.

A banned user must not:
- authenticate successfully
- place new orders
---

# Realtime Orders

Backend pushes events using WebSockets.

When a new order is created:

1. Order saved in database
2. Event broadcast to Sunmi device
3. Sunmi shows alert

---

# Printing

Sunmi device prints locally using Sunmi Printer SDK.

Backend only sends order data.

Printing is never performed on the backend.

---

# Reliability

Sunmi device must:

- auto reconnect websocket
- request missed orders on reconnect

Endpoint:

GET /orders?status=NEW
