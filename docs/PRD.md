# Coffee Shop Ordering App - Product Requirements Document

## 1. Product Overview
A mobile ordering application for a local coffee shop allowing customers to browse the menu, place pickup or delivery orders, and receive order updates. Orders appear instantly on a Sunmi V2 Pro device used by frontdesk staff.

The system consists of:

- Client Mobile App (iOS/Android)
- Frontdesk App (Sunmi V2 Pro Android device)
- Admin App (iOS/Android)
- Driver App/Role Interface (iOS/Android)
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
- View latest own orders
- Receive promotions
- Maintain profile
- Login via OTP

---

## Frontdesk
Staff member using Sunmi device.

Capabilities:
- Receive new orders in real-time
- Accept orders
- Manually assign delivery orders to available drivers
- Print order receipt
- View order details
- View latest orders feed

Frontdesk cannot modify menu or inventory.

---

## Admin (Owner)
Full management access via admin mobile app.

Capabilities:
- Manage menu hierarchy
- Enable/disable menu items
- Schedule menu availability
- Create promotions
- Configure loyalty rewards
- Provision staff accounts (DRIVER, FRONTDESK, ADMIN)
- View orders
- Manage special offers
- View users
- Ban users
- Unban users
- Manage delivery pricing distance bands
- Manually assign delivery orders to drivers
- View latest orders feed
- View ratings summary and detailed reviews

---

## Driver
Delivery staff account using OTP login.

Capabilities:
- Login via OTP
- View assigned delivery orders
- See customer name and phone number
- See order details and destination address
- Open destination in Google Maps
- Update delivery workflow statuses for assigned orders
- View latest assigned orders

---

# 3. Mobile App UX

## Bottom Navigation
The bottom bar contains:

- Home (Menu)
- Past Orders
- Latest Orders
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
After 5 orders -> free dessert.

System tracks order counts per user.

---

# 5. Authentication

User signs up using:

- First Name
- Last Name
- Phone Number

OTP verification is sent to the phone number.

OTP required for login and signup.

Driver accounts also authenticate with phone-number OTP.

---

# 6. Menu Structure

Inventory hierarchy:

Section
-> Item
-> Item Type
-> Size
-> Add-ons

Example:

Coffee
 -> Latte
   -> Hot / Iced
     -> Small / Medium / Large
       -> Extra Shot / Oat Milk

Admin can enable or disable any level of the hierarchy.

---

# 7. Menu Availability

Menu items can be:

- manually enabled or disabled
- scheduled for specific hours

Example:
Breakfast menu active 7:00-11:00.

---

# 8. Order Flow

Client places order.

Order appears instantly on Sunmi device.

Frontdesk staff:

1. Reviews order
2. Presses Accept
3. Printer prints receipt
4. For delivery orders, manually assigns a driver (frontdesk or admin)

Order lifecycle statuses:

NEW
ACCEPTED
ASSIGNED_TO_DRIVER
OUT_FOR_DELIVERY
DELIVERED
COMPLETED
CANCELLED

Notes:
- Driver assignment is manual by frontdesk/admin.
- Delivery workflow statuses must be supported end-to-end.
- Ratings are only allowed after order status is COMPLETED.

---

# 9. Delivery Requirements

For delivery checkout, client must provide:
- readable address text
- map-selected latitude/longitude coordinates

Both readable address and coordinates must be stored.

Delivery fee rules:
- fee is calculated by backend using distance bands
- distance is measured from configured shop coordinates to customer coordinates
- distance bands are editable by admin
- pricing model is distance-band based only

No live driver tracking is required.

---

# 10. Ratings and Reviews

After a completed order, client can submit:
- star rating (required)
- optional review note

Admin can view:
- ratings summary metrics
- detailed review list

---

# 11. Latest Orders

Latest orders section/page is required for relevant roles:
- client: their recent orders
- frontdesk: newest operational orders
- admin: newest operational orders
- driver: newest assigned delivery orders

---

# 12. Language Support

Application must support:

- Arabic
- English

User can toggle language.

Arabic should support RTL layout.

---

# 13. UI Mode

Application is **light mode only**.

---

# 14. User Management

Admin can view registered users.

Admin can:
- search users
- view basic profile information
- see whether a user is active or banned
- ban a user
- unban a user
- provision or promote staff users by phone number (ADMIN / FRONTDESK / DRIVER)

A banned user cannot place new orders or log in successfully until unbanned.
