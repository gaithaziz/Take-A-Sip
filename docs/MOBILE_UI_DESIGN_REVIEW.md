# Phase 2 Mobile UI Design Review

This document records the pre-implementation visual planning and critique for the client mobile app.

## 1. Visual System Direction

- Tone: warm coffee-shop, clean, calm, premium everyday
- Mode: light only
- Palette: warm beige background, coffee-brown primary actions, soft semantic accents
- Typography: clean sans-serif scale with strong hierarchy for quick menu scanning
- Shape: medium/large rounded corners for cards, buttons, and banners
- Elevation: subtle card shadows only

## 2. Screen Layout + Component Hierarchy

### Authentication
- `AppShell`
- Title + subtitle
- `AppInput` fields (first name, last name, phone)
- OTP step (`AppInput`)
- Primary/ghost `AppButton`

### Home
- `AppShell`
- Header row (title + cart action)
- `OfferRibbon` (hidden if no active offers)
- Section headers (`AppText`)
- Repeating `ProductCard`
- Loading/empty/error via `LoadingState` and `EmptyState`

### Product Details
- `AppShell`
- Product title + description
- Selectors for type, size, add-ons
- `QuantitySelector`
- Price summary
- Sticky-style action card with `AppButton`

### Cart
- `AppShell`
- Cart item list with `AppCard`
- `QuantitySelector` per item
- Remove action
- Subtotal/discount/total summary card
- Checkout `AppButton`

### Checkout
- `AppShell`
- Pickup/Delivery segmented options
- Notes input
- Order summary + confirmation button

### Past Orders
- `AppShell`
- Order cards with number/date/items
- Status `BadgeChip`
- Reorder CTA only as informational fallback if endpoint unsupported

### Profile
- `AppShell`
- User summary
- Reusable `ProfileRow` settings
- Language toggle row
- Logout action

## 3. Self-Critique (Before Implementation)

- Spacing risk: long Arabic labels can crowd rows.
  Improvement: use generous row/card padding and wrapping text styles.
- Hierarchy risk: menu/product screens can become dense.
  Improvement: split into clear sections and keep consistent heading scale.
- Color balance risk: warm palette can lose contrast.
  Improvement: dark neutral text + restrained tinted backgrounds + clear borders.
- Accessibility risk: small touch targets in selectors.
  Improvement: enforce minimum ~44px target height and clear pressed states.
- RTL risk: mixed-direction rows can misalign actions.
  Improvement: direction-aware text alignment and language state usage across screens.

## 4. Final Design Adjustments Applied

- Tokenized theme (`colors`, `spacing`, `radius`, `typography`, `shadows`) created first.
- Reusable component system built before screen assembly.
- Empty/loading/error states included for major screens.
- Bottom navigation limited to exactly: Home, Past Orders, Profile.
- Offer ribbon kept compact and hidden when no active offers.
