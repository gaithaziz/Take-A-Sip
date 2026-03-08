# API Specification

## Authentication

POST /auth/send-otp
POST /auth/verify-otp

If a user is banned:
- login/signup verification must be rejected
- creating new orders must be rejected

---

## Menu

GET /menu

Returns:

sections
items
item_types
sizes
addons

Each hierarchy level may include:
- image_url

---

## Orders

POST /orders

Creates order.

Request body includes:
- order_type (pickup | delivery)
- delivery_address (required when order_type = delivery)
- notes (optional)
- items

---

GET /orders/{id}

Returns order details.

---

GET /orders/user/{user_id}

Returns past orders.

---

POST /orders/{id}/reorder

Creates a new order for the authenticated client by reusing the snapshot
of a previous order.

---

POST /orders/{id}/accept

Frontdesk accepts order.

---

## Promotions

GET /promotions/active

Returns ribbon promotions.

---

## Admin

POST /admin/menu/section
POST /admin/menu/item
POST /admin/menu/type
POST /admin/menu/size
POST /admin/menu/addon

Create payloads for hierarchy entities may include:
- image_url (optional)

PATCH /admin/menu/{id}/toggle

Enable or disable menu items.

---

POST /admin/menu/schedule

Schedule menu availability.

---

## Admin Users

GET /admin/users

Returns users list.

Supports:
- search by name
- search by phone
- filter by banned/unbanned

---

POST /admin/users/{id}/ban

Request body:
- reason (optional)

Marks user as banned.

---

POST /admin/users/{id}/unban

Removes banned status.
