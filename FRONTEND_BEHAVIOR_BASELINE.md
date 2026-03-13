# FRONTEND_BEHAVIOR_BASELINE

This baseline captures current frontend behavior across `mobile`, `frontdesk`, and `admin` apps.  
Any UI redesign must preserve the behaviors below unless explicitly approved.

## Non-Negotiable Guardrails

- Do not change API endpoints, payload shapes, response assumptions, or auth header behavior.
- Do not change navigation graph, route names, auth/role gating, or cross-screen destination flow.
- Do not change state ownership boundaries (`Auth`, `Cart`, `Language`, admin/local screen state).
- Do not change business logic for order lifecycle, pricing/discount application, moderation, scheduling, or realtime handling.
- Do not remove/alter validation gates that currently block actions.

---

## 1) All Screens

### Mobile app (`mobile`)
- `Auth`
- `MainTabs/Home`
- `MainTabs/PastOrders`
- `MainTabs/Profile`
- `ProductDetails`
- `Cart`
- `Checkout`
- `AdminTabs/AdminDashboard`
- `AdminTabs/AdminMenu`
- `AdminTabs/AdminPromotions`
- `AdminTabs/AdminScheduling`
- `AdminTabs/AdminUsers`
- `AdminLoyalty`
- `AdminProfile`
- `AdminUserDetails`

### Frontdesk app (`frontdesk`)
- `AuthScreen` (outside navigator when logged out)
- `Orders` (stack root)
- `Details` (order detail)

### Admin web app (`admin`)
- `/login`
- `/` (dashboard)
- `/menu-editor`
- `/promotions`
- `/loyalty-rules`
- `/scheduling`
- `/users`

---

## 2) All User Flows

### Mobile (customer)
- OTP login: fill name + phone -> send OTP -> enter OTP -> verify -> app enters role-gated nav.
- Browse menu on Home -> open product -> select type/size/addons/quantity -> add to cart.
- Cart updates quantity/remove items -> checkout.
- Checkout choose pickup/delivery + notes -> place order -> cart cleared -> navigates to `PastOrders`.
- Past orders list -> reorder tries to rebuild active catalog matches -> if fully matched, cart replaced and user sent to cart; if any mismatch, reorder blocked.
- Profile: language toggle and logout confirmation.

### Mobile (admin role in same app)
- Admin login (same OTP entry point, role-based route gating).
- Dashboard quick navigation to menu/promotions/loyalty/users/profile.
- Menu hierarchy browse/expand/select context -> create/edit/toggle section/item/type/size/addon.
- Promotions CRUD + toggle active state.
- Loyalty rules CRUD + toggle active state.
- Scheduling CRUD + enable/disable schedule records.
- Users search/filter/apply -> ban/unban -> open user order details.
- Admin profile: language toggle and logout confirmation.

### Frontdesk
- OTP login (FRONTDESK or ADMIN role only).
- Orders screen loads new orders, connects websocket, shows connection/banners.
- Open order details and accept from details, or accept directly from card.
- Accept order triggers backend accept then print attempt; failed print jobs are queued for reprint/dismiss.
- Manual printer test action.
- Logout.

### Admin web
- OTP login -> verify role must be `ADMIN` -> token saved -> redirect `/`.
- Sidebar navigation among dashboard/menu/promotions/loyalty/scheduling/users.
- Menu editor hierarchical create/edit/toggle.
- Promotions create/edit/toggle.
- Loyalty rules create/edit/toggle.
- Scheduling create/update active/delete.
- Users search/filter + ban/unban with confirmation + optional ban reason.
- Header locale toggle (`en`/`ar`) and logout.

---

## 3) All API Integrations (Current Contracts)

### Shared auth APIs
- `POST /auth/send-otp`
- `POST /auth/verify-otp`
- `GET /auth/me` (mobile app auth restore)

### Mobile customer/admin app APIs
- `GET /menu`
- `GET /promotions/active`
- `POST /orders`
- `GET /orders/user/{userId}`
- `GET /orders/my-orders`
- `POST /orders/{orderId}/reorder`
- `GET /admin/menu/tree`
- `POST /admin/uploads/image`
- `POST /admin/menu/section|item|type|size|addon`
- `PATCH /admin/menu/section/{id}|item/{id}|type/{id}|size/{id}|addon/{id}`
- `PATCH /admin/menu/{id}/toggle`
- `GET /admin/menu/schedule`
- `POST /admin/menu/schedule`
- `PATCH /admin/menu/schedule/{id}`
- `DELETE /admin/menu/schedule/{id}`
- `GET /admin/promotions`
- `POST /admin/promotions`
- `PATCH /admin/promotions/{id}`
- `PATCH /admin/promotions/{id}/toggle`
- `GET /admin/loyalty-rules`
- `POST /admin/loyalty-rules`
- `PATCH /admin/loyalty-rules/{id}`
- `PATCH /admin/loyalty-rules/{id}/toggle`
- `GET /admin/users?search=&banned=`
- `POST /admin/users/{id}/ban`
- `POST /admin/users/{id}/unban`
- `GET /orders?status=`
- `GET /orders/user/{userId}` (admin user details)
- `GET /admin/analytics/revenue-summary`

### Frontdesk APIs + realtime
- `GET /orders?status=NEW`
- `GET /orders/{orderId}`
- `POST /orders/{orderId}/accept`
- WebSocket `ws(s)://<base>/ws/frontdesk?token=<jwt>`
- Socket events handled:
  - `order.created` -> fetch full order and prepend if status still `NEW`
  - `order.accepted` -> remove order from list

### Admin web APIs
- Uses `NEXT_PUBLIC_API_BASE_URL` or `/api/proxy` passthrough route.
- `/api/proxy/[...path]` forwards method/path/query/body/headers to backend base URL.
- Endpoints used mirror admin/mobile admin endpoints plus auth OTP.

---

## 4) All State Dependencies

### Mobile app state
- `LanguageContext`: `language`, `isRTL`, persisted key `take_a_sip_language`, drives `i18n.changeLanguage`.
- `AuthContext`: `token`, `user`, `isLoading`; persisted token/user keys; `auth/me` validation on app start.
- `CartContext`: line-item map by deterministic id `${size.id}:${sortedAddonIds}`; quantity merge logic; subtotal/total derived.
- `useCartPricing(subtotal)`:
  - depends on `AuthContext.user`
  - fetches active promotions + user orders
  - eligibility: `TEMPORARY` always, `FIRST_TIME` only when completed orders count is 0, ignores `LOYALTY`
  - applies max-value eligible promotion, capped by subtotal.

### Frontdesk state
- `AuthContext`: frontdesk-specific storage keys, role check on verify (`FRONTDESK` or `ADMIN` only).
- `useFrontdeskOrders(token)`:
  - local states: `orders`, `failedPrints`, `banner`, `connectionState`, `isLoading`
  - boot fetch + websocket lifecycle + reconnect/backoff + keepalive ping
  - print/reprint state transitions and banner messaging.
- `useKioskMode(enabled)`: keep-awake always; Android hardware back suppressed when enabled.

### Admin web state
- Local page state for form models, selection/edit target ids, pending dialogs.
- SWR data hooks: `menu`, `promotions`, `schedules`, `loyalty-rules`, `users(search,banned)`.
- Locale provider state: persisted `admin_locale`, sets document `lang` + `dir`.
- Auth token in `localStorage` (`admin_access_token`), injected via axios request interceptor.

---

## 5) All Reusable Components

### Mobile shared
- `AppButton`, `AppCard`, `AppInput`, `AppShell`, `AppText`, `BadgeChip`, `BottomTabBar`, `DateTimeField`, `EmptyState`, `LoadingState`, `OfferRibbon`, `ProductCard`, `ProfileRow`, `QuantitySelector`, `TopAppBar`.

### Mobile admin shared
- `ActionRow`, `AdminPageSection`, `BilingualFieldGroup`, `ExpandableText`, `InfoLine`, `SelectDropdownField`.

### Frontdesk shared
- `OrderCard`, `OrderBanner`.

### Admin web shared
- Admin domain: `admin-layout`, `confirm-dialog`, `data-table`, `empty-state`, `filter-bar`, `form-section`, `image-thumbnail`, `loading-state`, `page-header`, `search-bar`, `section-card`, `status-badge`.
- UI primitives: button/input/select/dialog/table/tabs/textarea/etc. from `components/ui`.

---

## 6) All Navigation Behavior

### Mobile app navigation
- Root stack route branches:
  - no token -> `Auth`
  - token + `user.role === 'ADMIN'` -> `AdminTabs` + stack screens `AdminLoyalty`, `AdminProfile`, `AdminUserDetails`
  - token + non-admin -> `MainTabs` + stack screens `ProductDetails`, `Cart`, `Checkout`
- Main tabs: `Home`, `PastOrders`, `Profile`.
- Admin tabs: `AdminDashboard`, `AdminMenu`, `AdminPromotions`, `AdminScheduling`, `AdminUsers`.
- Cross-stack calls currently used:
  - Home -> parent `ProductDetails` and `Cart`
  - Cart -> `Checkout`
  - Checkout success -> `MainTabs/PastOrders`
  - Admin dashboard quick actions -> parent `AdminLoyalty`/`AdminProfile`
  - Admin users -> parent `AdminUserDetails`

### Frontdesk navigation
- Logged-out path renders `AuthScreen` directly (not stack route).
- Logged-in path uses stack:
  - `Orders` (header hidden)
  - `Details` (order passed by route param; resolved against live list when possible).

### Admin web navigation
- Route-level navigation via sidebar links.
- Guard: if no token and not on `/login`, redirect to `/login`.
- Logout clears token and routes to `/login`.

---

## 7) All Form Validation Behavior

### Mobile customer
- Auth:
  - send OTP requires non-empty `firstName`, `lastName`, `phone`.
  - phone must be length >= 6.
  - verify OTP requires code length >= 4.
- Checkout:
  - delivery requires non-empty delivery address.
  - place-order button disabled unless: user exists, cart has items, address valid, not loading.

### Mobile admin
- Menu editor:
  - create actions disabled unless required parent selection + bilingual names present.
  - helper text for missing bilingual translations.
  - edit save disabled if bilingual names missing.
- Promotions:
  - requires bilingual title, numeric value, `end > start`.
  - save disabled if invalid or saving.
- Loyalty:
  - `required_orders >= 1`, non-empty reward value.
  - save disabled if invalid or saving.
- Scheduling:
  - requires entity type/id, start/end time, at least one weekday.
  - save disabled when invalid/saving.
- Users:
  - filters only applied when user taps `Apply Filters` (not immediate while typing/changing toggles).

### Frontdesk
- Auth:
  - no hard client-side field guards before send/verify; errors shown from request failures.
  - verify additionally enforces role gate in context (`FRONTDESK`/`ADMIN` only), throws explicit error otherwise.

### Admin web
- Login:
  - Send OTP button disabled when phone empty.
  - Verify button disabled when OTP empty.
  - verify rejects non-admin users.
- Users:
  - ban reason optional.
- Other admin forms:
  - mostly rely on backend validation; client does minimal gating (selection checks + numeric conversions + toast on failure).

---

## 8) Business-Critical Interactions (Must Not Break)

- OTP auth and token persistence/restore flows in all apps.
- Role gating:
  - mobile admin branch only for `ADMIN`.
  - frontdesk login allowed only for `FRONTDESK`/`ADMIN`.
  - admin web access only for `ADMIN`.
- Cart identity + merge logic using `size + addons` composite key.
- Checkout payload structure (`order_type`, optional `delivery_address`, optional `notes`, item lines with `size_id`, `quantity`, `addon_ids`).
- Promotion logic in cart pricing:
  - `FIRST_TIME` depends on completed order count.
  - only max eligible value applied.
  - discount capped by subtotal.
- Reorder reconstruction behavior:
  - must match current active catalog by `item name_en + size name_en + addon name_en`.
  - any mismatch aborts reorder with “not possible” alert.
- Frontdesk realtime:
  - websocket connect/reconnect/keepalive.
  - `order.created` -> fetch full order -> alert/beep/vibration.
  - `order.accepted` -> remove from queue.
- Frontdesk acceptance/printing:
  - order accept API call executes before print.
  - print failures create failed-print queue entries, not rollback acceptance.
  - reprint updates/removes failed job and banner.
- Menu entity toggles and status (`is_active`) directly control visibility/availability assumptions across UI.
- User moderation effects:
  - ban/unban actions integrated with user list refresh and confirmation prompts.
- Scheduling CRUD and status toggle behavior.
- Revenue summary fetch/display on mobile admin dashboard.
- Language directionality behavior (`isRTL`, mirrored rows, localized labels) and persisted locale settings.

---

## Redesign Safety Checklist

Before merging any redesign work, verify:

- Navigation graph and route names unchanged.
- All above API calls still made with same payload fields.
- Context/state ownership unchanged.
- Validation gates unchanged.
- All business-critical interactions still pass manual smoke tests:
  - login
  - order placement
  - reorder
  - frontdesk accept + print + failed reprint
  - admin menu toggle/edit/create
  - admin promotions/loyalty/scheduling CRUD
  - admin user ban/unban + user details orders.
