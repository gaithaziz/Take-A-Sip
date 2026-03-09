## Admin Mobile UX/Feature Recovery Plan (Phase 4)

### Summary
Address all 10 reported issues in one cohesive admin-mobile overhaul:
- complete Arabic coverage
- robust text-overflow behavior
- actionable, clickable dashboard with financial KPIs
- guided hierarchical menu creation UX
- practical promotions/loyalty workflows
- clearer scheduling UX
- user details screen with full past orders
- dedicated admin profile section

### Key Implementation Changes
- **Navigation and IA**
  - Expand admin tabs to include `AdminProfile`.
  - Make overview cards tappable and deep-link to target sections.
  - Add `AdminUserDetails` screen (stack route) opened from `AdminUsers` row tap.

- **Arabic + i18n completeness**
  - Remove hardcoded English text from admin screens and move all labels/messages to `translations.ts` (`en` + `ar`).
  - Ensure admin forms, badges, empty/error states, and action labels all use translation keys.
  - Keep RTL behavior via existing language context; verify layout direction in admin-specific components.

- **Text overflow and readability**
  - Apply default policy: **2-line clamp + tap for full content** on cards/rows.
  - Standardize `numberOfLines` usage for long names/titles/descriptions; keep full text in detail views or edit forms.
  - Prevent clipping in narrow cards/chips by adjusting spacing and min widths in admin rows.

- **Dashboard upgrades**
  - Replace static cards with interactive KPI cards:
    - menu sections count
    - promotions count
    - loyalty rules count
    - users count
    - revenue summary (Today / Last 7 Days / Last 30 Days)
  - Revenue calculation:
    - fetch orders via `GET /orders`
    - include only `ACCEPTED` + `COMPLETED`
    - compute gross revenue from order item snapshots client-side.
  - Add quick actions and visual hierarchy (status trend labels, stronger card affordance).

- **Menu Editor (hierarchy usability)**
  - Convert from “select-id then create” flow to guided context flow:
    - explicit current parent context bar (selected section/item/type/size)
    - parent pickers per creation form (not implicit hidden state)
    - progressive create panels (Section -> Item -> Type -> Size -> Add-on)
  - Keep nested hierarchy explorer, but improve with expand/collapse groups and clearer parent-child indentation.
  - Preserve existing image thumbnail + placeholder behavior and edit flow.

- **Promotions polish**
  - Replace raw free-text type/date workflow with practical controls:
    - promotion type segmented selection
    - start/end datetime pickers
    - status toggle
  - Improve scan list:
    - title, status badge, date range, value/type, edit/disable actions.
  - Add validation feedback for invalid date ranges and missing required fields.

- **Loyalty polish**
  - Parallel UX with promotions:
    - structured reward type input
    - required order count stepper/number input with guardrails
    - status toggle and quick edit.
  - Improve list readability and editing ergonomics.

- **Scheduling clarity**
  - Keep simplified scheduling model (no recurrence engine), but make intent explicit:
    - “What” (entity), “When” (start/end), “Days” selectors
    - active/inactive state displayed clearly in list.
  - Improve schedule cards with human-readable summaries and clear edit/delete/toggle actions.

- **Users -> full past orders**
  - In `AdminUsers`, row tap navigates to `AdminUserDetails`.
  - `AdminUserDetails` loads:
    - user profile summary
    - full past orders via `GET /orders/user/{user_id}`
    - order cards with status, timestamp, order type, item snapshot, computed total.
  - Keep ban/unban actions with confirmation dialogs.

- **Admin Profile section**
  - Add `AdminProfile` tab with:
    - admin name/phone/role
    - language switch
    - logout
    - optional app/system info block for support.

### Public Interfaces / Type Changes
- **Navigation types**
  - Add `AdminProfile` to `AdminTabParamList`.
  - Add `AdminUserDetails` route to root/admin stack params.

- **Services**
  - Reuse existing endpoints:
    - `GET /orders` for KPI revenue aggregation
    - `GET /orders/user/{id}` for admin user detail history.
  - Add admin-side order fetch helper in mobile service layer (no backend contract change required).

### Test Plan
- **Localization**
  - Switch language to Arabic and verify all admin screens/buttons/messages are translated and RTL-safe.
- **Overflow**
  - Seed long EN/AR strings for menu/promotions/users and verify 2-line clamp, no clipping, and full text availability in detail/edit.
- **Dashboard**
  - Verify KPI numbers, revenue periods, and card navigation targets.
  - Validate revenue includes only `ACCEPTED` + `COMPLETED`.
- **Menu Editor**
  - Create full chain Section -> Item -> Type -> Size -> Add-on using guided parent selectors.
  - Edit/toggle each level and confirm hierarchy refresh.
- **Promotions/Loyalty**
  - Create/edit/toggle flows, date/range validation, and list readability.
- **Scheduling**
  - Create, edit, disable, and delete schedules; verify list clarity and state.
- **Users**
  - Search/filter/ban/unban.
  - Open user details and confirm full order history is loaded and totals computed correctly.
- **Profile**
  - Language toggle and logout from admin profile tab.

### Assumptions and Defaults
- Financial summaries are derived client-side from existing order snapshots; no new backend endpoint is required for initial delivery.
- Revenue is gross snapshot revenue for statuses `ACCEPTED` + `COMPLETED`.
- If order volume grows and dashboard performance degrades, a follow-up backend aggregate endpoint will be proposed.
- Existing backend contracts remain unchanged unless a blocking gap appears during implementation.
