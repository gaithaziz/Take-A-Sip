# Database Schema

## users

id (uuid)
first_name
last_name
phone_number (unique)
role (CLIENT | ADMIN | FRONTDESK | DRIVER)
is_active
is_banned
banned_at
banned_reason
created_at

Indexes:
- (role)
- (is_banned)

---

## sections

id
name_en
name_ar
image_url
is_active
sort_order

---

## items

id
section_id
name_en
name_ar
image_url
description_en
description_ar
is_active

---

## item_types

id
item_id
name_en
name_ar
image_url
is_active

---

## sizes

id
type_id
name_en
name_ar
image_url
price
is_active

---

## addons

id
size_id
name_en
name_ar
image_url
price
is_active

---

## promotions

id
title_en
title_ar
type
value
starts_at
ends_at
is_active

---

## loyalty_rules

id
required_orders
reward_type
reward_value

---

## store_settings

id
store_name
store_latitude
store_longitude
updated_at

Notes:
- Delivery distance is calculated from these store coordinates.
- Intended as single-row settings table.

---

## delivery_distance_bands

id
min_distance_km
max_distance_km
fee_amount
is_active
sort_order
created_at
updated_at

Constraints:
- min_distance_km >= 0
- max_distance_km > min_distance_km
- fee_amount >= 0
- active distance bands must be non-overlapping

Indexes:
- (is_active, sort_order)

Notes:
- Admin-managed, editable distance bands.

---

## orders

id
order_number
user_id
status
order_type (pickup | delivery)
delivery_address_readable
delivery_latitude
delivery_longitude
delivery_distance_km
delivery_fee
delivery_distance_band_id (nullable, fk -> delivery_distance_bands.id)
assigned_driver_id (nullable, fk -> users.id)
assigned_at
delivered_at
completed_at
created_at
notes

Constraints:
- For delivery orders: address/lat/lng/distance/fee are required
- For pickup orders: address/lat/lng/distance/fee are null
- assigned_driver_id must reference a DRIVER user

Indexes:
- (user_id, created_at desc)
- (status, created_at desc)
- (assigned_driver_id, status, created_at desc)

---

## order_items

id
order_id
item_name_snapshot
size_snapshot
price_snapshot
quantity

---

## order_item_addons

id
order_item_id
addon_name_snapshot
price_snapshot

---

## order_events

id
order_id
event_type
actor_user_id
metadata_json
created_at

Indexes:
- (order_id, created_at)

---

## order_ratings

id
order_id (unique)
user_id
stars (1-5)
note (nullable)
created_at

Constraints:
- stars between 1 and 5

Rules:
- Only allowed when order status is COMPLETED.
- One rating per order.

Indexes:
- (user_id, created_at desc)
- (stars)

---

## user_events

id
user_id
event_type
actor_user_id
reason
created_at
