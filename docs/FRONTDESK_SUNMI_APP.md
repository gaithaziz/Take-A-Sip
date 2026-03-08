# Sunmi Frontdesk Application

Device:
Sunmi V2 Pro

Purpose:
Receive orders and print receipts.

---

# Workflow

Sunmi connects to WebSocket.

When event:

order.created

Occurs:

1. Alert sound
2. Show popup
3. Display order details

Frontdesk presses:

Accept Order

Printer prints receipt.

---

# Printing

Printing performed using Sunmi Printer SDK.

Receipt must include:

Order number
Date
Customer name
Phone number
Items
Add-ons
Notes
Order type