# Database Schema

## users

id (uuid)
first_name
last_name
phone_number
role (CLIENT | ADMIN | FRONTDESK)
is_active
is_banned
banned_at
banned_reason
created_at

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

## orders

id
order_number
user_id
status
order_type (pickup | delivery)
delivery_address
created_at
notes

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
created_at

---

## user_events

id
user_id
event_type
actor_user_id
reason
created_at
