# UI System

This document defines the visual system for the Take a Sip mobile app.

The logo and brand identity are the visual inspiration.
The UI itself should remain clean, modern, premium, and easy to use.

The goal is to redesign the mobile frontend without changing any working functionality.

Behavior source of truth:
- FRONTEND_BEHAVIOR_BASELINE.md

This file is the visual source of truth.

---

# 1. Brand Direction

The visual identity should be inspired by the shop logo.

Brand feel:
- warm
- friendly
- memorable
- coffee-shop themed
- premium but approachable
- clean, not corporate
- slightly playful in personality, but not cartoonish in UI

The UI must NOT copy the cartoon style of the logo directly.
Instead, it should borrow:
- the warm caramel brown
- the cream tone
- the dark espresso contrast
- the cozy coffee-shop feeling

---

# 2. App Feel

The app should feel similar in quality to modern food ordering apps such as:
- Starbucks
- Uber Eats
- premium café ordering apps

The app should feel:
- polished
- calm
- modern
- image-forward
- readable
- fast for ordering

Light mode only.

Supports:
- English
- Arabic
- RTL for Arabic
- LTR for English

---

# 3. Color Palette

## Primary
Rich Caramel Brown
#B46E1E

## Primary Dark
Deep Roast Brown
#8B5316

## Background
Warm Cream
#FFF8F1

## Surface
White
#FFFFFF

## Surface Alt
Soft Latte
#F7EFE6

## Text Primary
Espresso Black
#1F1713

## Text Secondary
Muted Coffee Gray
#6E6258

## Border
Warm Neutral Border
#E7D7C8

## Accent
Soft Gold Latte
#D8A15B

## Success
Soft Olive Green
#4F7A52

## Warning
Warm Amber
#C98A2E

## Error
Muted Brick Red
#C95A4A

---

# 4. Typography

Use a clean modern sans-serif.

Preferred:
- English: Inter
- Arabic: IBM Plex Sans Arabic

Rules:
- readable first
- strong hierarchy
- generous spacing
- no decorative fonts
- no playful/cartoon typography

## Suggested Scale

Screen Title
28 / Bold

Section Title
20 / SemiBold

Card Title
18 / SemiBold

Body
16 / Regular

Secondary
14 / Regular

Caption
12 / Regular

Button
16 / SemiBold

Price
18 / Bold

---

# 5. Spacing System

Use a strict spacing scale:

- 4
- 8
- 12
- 16
- 20
- 24
- 32

Rules:
- screen horizontal padding: 16
- section spacing: 24
- card internal padding: 16
- gap between cards: 12
- avoid random values

---

# 6. Radius

Use rounded corners consistently:

- small: 10
- medium: 14
- large: 18
- extra large: 24

Recommended:
- inputs: 14
- buttons: 14
- cards: 18
- bottom sheets/modals: 24
- offer ribbon: 18

---

# 7. Shadows

Use subtle warm shadows only.

Rules:
- soft card shadow
- slightly stronger shadow for floating/sticky elements
- no harsh dark shadows
- no glows
- no heavy elevation

---

# 8. Core UI Principles

The app must optimize for:
- quick ordering
- product image clarity
- easy scanning
- large tap targets
- visual consistency
- bilingual readability

Avoid:
- clutter
- tiny controls
- over-decorated cards
- weak visual hierarchy
- random styling per screen

---

# 9. Shared Components

The app should rely on shared UI components.

Required shared primitives:
- AppShell
- AppText
- AppButton
- AppInput
- AppCard
- BadgeChip
- LoadingState
- EmptyState
- TopAppBar

Required ordering components:
- OfferRibbon
- ProductCard
- CategoryChip
- QuantitySelector
- CartItemRow
- OrderCard
- StickyBottomAction

---

# 10. Home Screen

Layout order:

1. Top app bar / greeting area
2. Rotating offers ribbon
3. Category chips
4. Product list

Home should feel:
- warm
- scrollable
- premium
- easy to scan

Product cards should emphasize:
- image
- name
- short description
- price
- quick action

---

# 11. Product Card

Style:
- white surface
- rounded corners
- warm soft shadow
- clean spacing
- strong image treatment

Must include:
- image
- name
- short description
- price
- action button

Image:
- top aligned
- maintain aspect ratio
- rounded corners
- elegant placeholder if missing

---

# 12. Product Details Screen

Layout order:
1. large product image
2. product name
3. product description
4. type selection
5. size selection
6. add-ons
7. quantity selector
8. sticky add-to-cart button

The screen should feel premium and focused.

---

# 13. Cart Screen

The cart should feel structured and confidence-building.

Contains:
- item rows
- selected options/add-ons
- quantity controls
- subtotal
- discount
- total
- sticky checkout button

---

# 14. Checkout Screen

Contains:
- pickup/delivery selector
- delivery address field if needed
- notes field
- order summary
- place order action

The CTA must feel clear and prominent.

---

# 15. Past Orders Screen

Display:
- order number
- date
- item summary
- status badge
- reorder action

Should feel simple and well organized.

---

# 16. Profile Screen

Contains:
- user info
- language toggle
- logout

Clean and minimal.

---

# 17. Latest Orders Screen

Display:
- recent orders first
- compact order card with status and timestamps
- quick open to order details

Should feel operational and easy to scan.

---

# 18. Bottom Navigation

Must contain exactly:
- Home
- Past Orders
- Latest Orders
- Profile

Style:
- premium
- clean
- safe-area aware
- clear active state
- visible labels
- warm theme integration

---

# 19. Offer Ribbon

Must:
- rotate when multiple offers exist
- hide when no offers exist
- feel elegant, not flashy
- use the brand colors tastefully

Recommended:
- caramel primary background
- white text
- rounded corners
- modest height

---

# 20. Status Badges

Use consistent badge styling.

Examples:
- completed: soft green
- accepted/preparing: warm amber
- cancelled: muted red

Do not rely on color only; keep text labels visible.

---

# 21. RTL Rules

Arabic must support full RTL behavior.

Rules:
- align text by direction
- mirror directional layouts where appropriate
- maintain balance in cards and rows
- preserve polished appearance in both English and Arabic

---

# 22. Motion

Motion should be subtle only.

Allowed:
- button press feedback
- soft list/card transitions
- ribbon auto rotation
- bottom sheet transitions

Avoid:
- flashy animation
- excessive motion
- slow transitions

---

# 23. Redesign Constraint

This redesign is presentation-only.

It must not change:
- API contracts
- navigation graph
- route names
- auth behavior
- cart behavior
- reorder behavior
- validation behavior
- role gating
- state ownership
- business logic

When needed, logic may be separated from presentation using container/view structure.
