# Coffee Shop Ordering App – Product Requirements Document

## 1. Product Overview
A mobile ordering application for a local coffee shop allowing customers to browse the menu, place pickup or delivery orders, and receive order updates. Orders appear instantly on a Sunmi V2 Pro device used by frontdesk staff.

The system consists of:

- Client Mobile App (iOS/Android)
- Frontdesk App (Sunmi V2 Pro Android device)
- Admin Dashboard (Web)
- Backend API (FastAPI)

No online payment system is required. Payment and delivery are handled by the shop manually.

---

# 2. User Roles

## Client
Customers using the mobile application.

Capabilities:
- Browse menu
- Add items to cart
- Choose pickup or delivery
- Place orders
- View past orders
- Receive promotions
- Maintain profile
- Login via OTP

---

## Frontdesk
Staff member using Sunmi device.

Capabilities:
- Receive new orders in real-time
- Accept orders
- Print order receipt
- View order details

Frontdesk cannot modify menu or inventory.

---

## Admin (Owner)
Full management access via web dashboard.

Capabilities:
- Manage menu hierarchy
- Enable/disable menu items
- Schedule menu availability
- Create promotions
- Configure loyalty rewards
- View orders
- Manage special offers
- View users
- Ban users
- Unban users

---

# 3. Mobile App UX

## Bottom Navigation
The bottom bar contains:

- Home (Menu)
- Past Orders
- Profile

---

## Home Screen
Contains:

1. Rotating offers ribbon at the top
2. Menu categories
3. Menu items within categories

Menu hierarchy entries should support images where available:
- section image
- item image
- item type image
- size image
- add-on image

Offers ribbon:
- Rotates between promotions
- Hidden if no active offers exist

---

# 4. Promotions System

Two promotion types exist.

## 1. First Time User Offer
Admin defines:
- offer description
- discount type
- discount amount

Automatically applied on the first order.

---

## 2. Loyalty Offer
Admin configures:

- required number of completed orders
- reward type

Example:
After 5 orders → free dessert.

System tracks order counts per user.

---

# 5. Authentication

User signs up using:

- First Name
- Last Name
- Phone Number

OTP verification is sent to the phone number.

OTP required for login and signup.

---

# 6. Menu Structure

Inventory hierarchy:

Section
→ Item
→ Item Type
→ Size
→ Add-ons

Example:

Coffee
 → Latte
   → Hot / Iced
     → Small / Medium / Large
       → Extra Shot / Oat Milk

Admin can enable or disable any level of the hierarchy.

---

# 7. Menu Availability

Menu items can be:

- manually enabled or disabled
- scheduled for specific hours

Example:
Breakfast menu active 7:00–11:00.

---

# 8. Order Flow

Client places order.

Order appears instantly on Sunmi device.

Frontdesk staff:

1. Reviews order
2. Presses Accept
3. Printer prints receipt

Order statuses:

NEW  
ACCEPTED  
COMPLETED  
CANCELLED

---

# 9. Language Support

Application must support:

- Arabic
- English

User can toggle language.

Arabic should support RTL layout.

---

# 10. UI Mode

Application is **light mode only**.

---

# 11. User Management

Admin can view registered users.

Admin can:
- search users
- view basic profile information
- see whether a user is active or banned
- ban a user
- unban a user

A banned user cannot place new orders or log in successfully until unbanned.
