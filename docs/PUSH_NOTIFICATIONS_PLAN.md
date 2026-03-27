# Push Notifications Plan

## Summary
Add push notifications for `CLIENT`, `ADMIN`, and `DRIVER` users. Do not add push notifications for `FRONTDESK`.

Keep `FRONTDESK` on its current websocket-based realtime flow. Add device-token registration, notification preferences groundwork, and server-triggered notifications for important order events on mobile roles.

## Goals
- Notify clients when their order status changes in meaningful ways.
- Notify admins when new orders or operational exceptions need attention.
- Notify drivers when they are assigned a delivery or when delivery state changes require action.
- Keep frontdesk excluded from push and continue using websocket + local alert behavior there.

## Roles And Notification Scope

### Client
- New order accepted
- Driver assigned for delivery orders
- Order out for delivery
- Order delivered
- Order completed
- Optional later: promotion/marketing notifications, disabled for v1

### Admin
- New order created
- Delivery order waiting for driver assignment
- Optional later: low-level system alerts, disabled for v1

### Driver
- Delivery order assigned to this driver
- Optional later: order updated/cancelled after assignment

### Frontdesk
- No push notifications
- Keep current websocket-based realtime flow unchanged

## Architecture Direction

### Mobile
- Use Expo notifications for the mobile app.
- Add notification permission request flow after login for supported roles only: `CLIENT`, `ADMIN`, `DRIVER`.
- Obtain and persist Expo push token per device.
- Refresh token registration on app launch/login when needed.
- Remove token on logout if the backend supports device unlinking.
- Handle foreground notifications gracefully.
- Handle notification taps by routing to the relevant screen:
  - client order details
  - driver order details
  - admin dashboard or target workflow

### Backend
- Add persistent storage for mobile push tokens.
- Store token records by user with fields similar to:
  - `id`
  - `user_id`
  - `platform`
  - `push_provider`
  - `push_token`
  - `device_label` or `device_id`
  - `is_active`
  - `last_seen_at`
- Add authenticated endpoints for:
  - register/update push token
  - deactivate push token
- Add a notification service layer that:
  - builds role-specific push payloads
  - resolves recipient device tokens
  - sends through Expo push API
  - handles invalid token cleanup
- Trigger notification dispatch from existing order workflow points instead of duplicating order logic.

## Trigger Points

### Client Triggers
- On order accepted
- On driver assignment for delivery
- On `OUT_FOR_DELIVERY`
- On `DELIVERED`
- On `COMPLETED`

### Admin Triggers
- On order creation
- On delivery order entering state that needs driver assignment

### Driver Triggers
- On driver assignment

## Payload Shape
- Keep payload small and navigation-friendly.
- Include:
  - `type`
  - `order_id`
  - `role_target`
  - `title`
  - `body`
- Example notification types:
  - `client_order_accepted`
  - `client_driver_assigned`
  - `client_out_for_delivery`
  - `client_order_completed`
  - `admin_new_order`
  - `admin_driver_assignment_needed`
  - `driver_order_assigned`

## Navigation Behavior
- When a client taps a notification:
  - open `ClientOrderDetails` for that order
- When a driver taps a notification:
  - open `DriverOrderDetails` for that order
- When an admin taps a notification:
  - open `AdminTabs`
  - default to dashboard first unless a later admin-targeted route is introduced

## Implementation Steps

### 1. Mobile Notification Foundation
- Add Expo notifications dependency and setup.
- Add a notification bootstrap module in mobile for:
  - permissions
  - token retrieval
  - foreground handler
  - response tap handler
- Initialize it after auth state is ready.

### 2. Backend Token Persistence
- Add a new table for user push tokens.
- Add migration.
- Add schemas and CRUD helpers.
- Expose authenticated token registration/deactivation endpoints.

### 3. Notification Sending Service
- Add backend service for Expo push sends.
- Batch sends per recipient tokens.
- Mark invalid tokens inactive on push provider errors.
- Log send failures without breaking the order flow.

### 4. Order Workflow Integration
- Hook notification dispatch into existing order service transitions.
- Keep sends asynchronous where practical so order API latency stays reasonable.
- Reuse existing role and order ownership rules for recipient selection.

### 5. Mobile Deep Linking / Routing
- Parse notification data on tap.
- Route users into the correct stack/screen.
- Ignore unsupported notification types safely.

## API Additions
- `POST /notifications/push-token`
- `DELETE /notifications/push-token`

Suggested request shape for registration:

```json
{
  "push_token": "ExponentPushToken[...]",
  "platform": "android",
  "push_provider": "expo",
  "device_id": "optional-stable-device-id"
}
```

## Data Model Additions
- New table, for example `user_push_tokens`
- Unique constraint recommendation:
  - unique on `push_token`
- Useful indexes:
  - `user_id`
  - `is_active`

## Testing Plan

### Backend
- Token registration creates or updates records correctly
- Logout/deactivation disables token
- Invalid Expo token responses deactivate tokens
- Notification recipients are role-correct
- Order transitions trigger expected notification jobs

### Mobile
- Supported roles request permission and register token
- Frontdesk does not request push permission
- Notification tap opens the correct screen
- Foreground notification handling does not crash app
- Logout unregisters or deactivates token flow correctly

### Manual End-To-End
- Client places order and receives status notifications
- Admin receives new-order notification
- Driver receives assignment notification
- Frontdesk behavior remains unchanged

## Rollout Notes
- Start with transactional notifications only
- Keep marketing/promotional notifications out of v1
- Add env-based switch to disable actual sends in local/dev
- Add logging around token registration and send outcomes

## Assumptions
- Mobile app remains Expo-based
- Expo push is acceptable for v1 delivery
- Frontdesk remains excluded from push notifications
- Admin notifications route into the existing admin mobile app, not the web admin app
- Profile screen footer: safest and cleanest. Small text like Made by Me at the very
  bottom.
- Login/Auth screen: also good, because it doesn’t interfere with app usage.
