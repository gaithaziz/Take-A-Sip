# API Specification

## Authentication

POST /auth/send-otp
POST /auth/verify-otp

Notes:
- Client and driver accounts authenticate with OTP.
- Verification flow is role-aware.

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
- delivery_address_readable (required when order_type = delivery)
- delivery_latitude (required when order_type = delivery)
- delivery_longitude (required when order_type = delivery)
- notes (optional)
- items

Delivery fee behavior:
- backend calculates delivery_distance_km from shop coordinates to delivery coordinates using straight-line (Haversine) distance
- backend selects fee from active admin-managed distance bands
- request is rejected if no active distance band covers calculated distance

Response includes calculated delivery info for delivery orders:
- delivery_distance_km
- delivery_fee
- delivery_distance_band_id

---

GET /orders/{id}

Returns order details.

For delivery orders, relevant roles can receive:
- customer_name
- customer_phone_number
- delivery_address_readable
- delivery_latitude
- delivery_longitude
- google_maps_url

RBAC:
- client can only access own orders
- driver can only access assigned delivery orders
- frontdesk/admin can access operational orders

---

GET /orders/user/{user_id}

Returns past orders.

RBAC:
- client can only request own `user_id`
- admin/frontdesk may request any user history

---

GET /orders/latest

Latest orders feed for frontdesk/admin with role-based filtering.

Query params:
- limit (default 20, max 100)
- offset (default 0)
- status (optional, repeatable)
- order_type (optional: pickup | delivery)

Sort order:
- `created_at DESC`

---

GET /orders/my-latest

Latest orders feed for authenticated client.

Query params:
- limit (default 20, max 100)
- offset (default 0)

Sort order:
- `created_at DESC`

---

POST /orders/{id}/reorder

Creates a new order for the authenticated client by reusing the snapshot
of a previous order.

---

POST /orders/{id}/accept

Frontdesk accepts order.

RBAC:
- frontdesk/admin only

---

POST /orders/{id}/assign-driver

Manual assignment by frontdesk/admin.

Request body:
- driver_user_id

Rules:
- target user must have role `DRIVER` and be active
- assignment allowed only for `order_type = delivery`
- assignment allowed only when status is `ACCEPTED` or `ASSIGNED_TO_DRIVER`
- reassignment is allowed only for frontdesk/admin

---

POST /orders/{id}/status

Updates order lifecycle status with RBAC and transition validation.

Supported statuses:
- NEW
- ACCEPTED
- ASSIGNED_TO_DRIVER
- OUT_FOR_DELIVERY
- DELIVERED
- COMPLETED
- CANCELLED

Allowed transitions:
- NEW -> ACCEPTED | CANCELLED
- ACCEPTED -> ASSIGNED_TO_DRIVER | COMPLETED | CANCELLED
- ASSIGNED_TO_DRIVER -> OUT_FOR_DELIVERY | CANCELLED
- OUT_FOR_DELIVERY -> DELIVERED | CANCELLED
- DELIVERED -> COMPLETED

RBAC rules:
- frontdesk/admin: NEW, ACCEPTED, ASSIGNED_TO_DRIVER, CANCELLED, COMPLETED
- driver: OUT_FOR_DELIVERY, DELIVERED (assigned orders only)
- clients cannot set order status

---

## Driver

GET /driver/orders/assigned

Returns assigned delivery orders for authenticated driver.

Query params:
- status (optional)
- limit (default 20, max 100)
- offset (default 0)

---

GET /driver/orders/latest

Returns latest assigned delivery orders for authenticated driver.

Query params:
- limit (default 20, max 100)
- offset (default 0)

Sort order:
- `created_at DESC`

---

## Ratings

POST /orders/{id}/rating

Client submits rating after completion.

Request body:
- stars (1-5)
- note (optional)

Rules:
- allowed only when order status = COMPLETED
- one rating per order
- client can only rate own completed order

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

## Admin Delivery Pricing

GET /admin/delivery/distance-bands
POST /admin/delivery/distance-bands
PATCH /admin/delivery/distance-bands/{id}
DELETE /admin/delivery/distance-bands/{id}

Distance band validation:
- min_distance_km >= 0
- max_distance_km > min_distance_km
- fee_amount >= 0
- active bands must not overlap

---

## Admin Drivers

GET /admin/drivers

Returns drivers list.

Supports:
- search by name
- search by phone
- filter by active/inactive

---

GET /admin/drivers/available

Returns drivers eligible for manual assignment.

---

## Admin Ratings

GET /admin/ratings/summary

Returns:
- avg_stars
- total_ratings
- star_counts (1-5)

GET /admin/ratings/reviews

Returns review list with:
- order_id
- stars
- note
- created_at
- customer_name

Supports:
- min_stars
- max_stars
- date_from
- date_to
- limit (default 20, max 100)
- offset (default 0)

---

## Admin Users

GET /admin/users

Returns users list.

Supports:
- search by name
- search by phone
- filter by banned/unbanned
- filter by role

---

POST /admin/users/{id}/ban

Request body:
- reason (optional)

Marks user as banned.

---

POST /admin/users/{id}/unban

Removes banned status.

---

POST /admin/users/provision-staff

Admin-only staff provisioning endpoint.

Request body:
- first_name
- last_name
- phone_number
- role (ADMIN | FRONTDESK | DRIVER)

Behavior:
- creates a new staff account if phone number does not exist
- promotes/updates an existing account to the requested staff role
- reactivates and unbans target account

---

## Admin Analytics

GET /admin/analytics/revenue-summary

Returns:
- today_revenue
- week_revenue
- month_revenue
- today_orders
- week_orders
- month_orders

GET /admin/analytics/dashboard

Returns:
- revenue block (today / 7 days / 30 days)
- order analytics:
  - total_orders_today
  - pickup_orders_today
  - delivery_orders_today
  - pickup_delivery_ratio
  - average_order_value
- ratings analytics:
  - average_rating
  - total_ratings
  - stars_breakdown (1-5)
- driver analytics:
  - deliveries_completed_today
  - deliveries_per_driver

---

## Operations

GET /health

Liveness check endpoint.

GET /metrics

Operational metrics endpoint (request count, status distribution, top paths, latency snapshot).
