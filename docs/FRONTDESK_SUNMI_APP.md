# Sunmi Frontdesk Application

Device:
Sunmi V2 Pro

Purpose:
Receive orders and print receipts.

---

# Workflow

Sunmi connects to WebSocket.

When event:

`order.created`

Occurs:

1. Alert sound
2. Show popup/banner
3. Display order details

Frontdesk presses:

`Accept Order`

Printer prints receipt locally on device.

---

# Printing

Printing is performed using Sunmi Printer SDK.

Receipt must include:

- Order number
- Date
- Customer name
- Phone number
- Items
- Add-ons
- Notes
- Order type

---

# Kiosk Mode Policy

Full Android kiosk/lock-task mode is recommended for dedicated frontdesk devices,
but it is not required to complete Phase 3.

Phase 3 functional completion requires:
- realtime order reception
- accept order flow
- local receipt printing
- reconnect and missed-order recovery

Soft kiosk behavior (keep-awake and back-button blocking) is acceptable for
Phase 3, while full OS-level lockdown can be implemented later as an
operational hardening step.

---

# Phase 3 Status

Phase 3 is considered **complete** from an implementation perspective.

Implemented:
- Frontdesk auth and role restriction (FRONTDESK/ADMIN)
- Incoming orders list and order details screen
- WebSocket connect/reconnect with missed-order reload (`GET /orders?status=NEW`)
- New order alert (vibration/beep fallback)
- Accept order flow (`POST /orders/{id}/accept`)
- Sunmi receipt printing integration
- Safe printing failure handling with failed-print queue and manual reprint
- Language toggle and RTL support across auth/orders/details
- Stability fixes for logout/navigation behavior on Sunmi

---

# Remaining Operational Validation

The following items are not code blockers and should be verified in staging or production operations:

1. Run one full live cycle with real menu data:
   client creates order -> frontdesk receives realtime event -> accept -> receipt prints.
2. Validate failed print recovery on device:
   force printer failure -> failed job appears -> reprint succeeds.
3. Confirm final receipt formatting with shop-specific branding/content.
4. Optionally enable full Android lock-task kiosk policy if required by operations.
