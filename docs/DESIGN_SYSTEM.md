# Design System

This document defines the official visual design system for the Coffee Shop Ordering App.

The goal is to produce a clean, modern, bilingual mobile experience that feels suitable for the Apple App Store and Google Play.

The app supports:

- English
- Arabic

The app is:

- light mode only
- mobile-first
- clean and premium
- simple and highly readable

---

# 1. Design Principles

The UI must feel:

- warm
- modern
- clean
- calm
- premium but not luxurious
- friendly for everyday coffee ordering

The product should avoid:

- cluttered screens
- overly dark elements
- harsh contrast
- crowded cards
- inconsistent spacing
- cheap-looking gradients
- excessive animations
- overly playful visuals

The UI should prioritize:

- fast scanning
- easy ordering
- large touch targets
- clear hierarchy
- visual consistency
- bilingual readability

---

# 2. Platform Quality Standard

The mobile app should visually align with:

- Apple Human Interface Guidelines
- Material Design best practices

The app should feel native on both iOS and Android.

Requirements:

- proper safe-area handling
- comfortable spacing
- consistent icon use
- smooth navigation transitions
- readable font sizes
- clear feedback states
- polished empty states
- polished loading states

---

# 3. Brand Direction

The visual style should reflect a local coffee shop.

Tone:

- warm
- welcoming
- modern café
- practical
- premium everyday experience

The design should feel suitable for:
- coffee
- pastries
- desserts
- breakfast items
- delivery and pickup ordering

Avoid making it look like:
- a banking app
- a gaming app
- a generic admin dashboard
- a neon/dark nightclub brand

---

# 4. Color System

Use a warm neutral palette with coffee-inspired accents.

## Primary
Used for main buttons, active states, highlighted prices, and key actions.

- Primary 50: very light warm beige
- Primary 100: soft latte beige
- Primary 200: light caramel
- Primary 300: warm tan
- Primary 400: medium coffee accent
- Primary 500: main brand coffee brown
- Primary 600: dark roast
- Primary 700: espresso brown

Suggested implementation direction:
- main action color should be a rich warm coffee tone
- avoid overly red brown
- avoid muddy grey brown

## Secondary
Used for supportive accents and mild highlights.

- soft cream
- warm sand
- muted caramel

## Background
- main app background: very light warm off-white
- card background: white
- section background: slightly tinted warm neutral

## Text
- primary text: dark neutral brown/charcoal
- secondary text: medium warm gray
- muted text: light warm gray

## Semantic Colors
Use simple semantic states:

### Success
Soft green, not neon.

### Warning
Warm amber.

### Error
Muted red.

### Info
Soft blue-gray if needed.

---

# 5. Typography

Typography must be highly readable in both English and Arabic.

## English Font
Preferred:
- Inter

Fallback:
- system sans-serif

## Arabic Font
Preferred:
- IBM Plex Sans Arabic

Fallback:
- system Arabic sans-serif

## Typography Style Rules
- clean sans-serif only
- no decorative fonts
- no serif fonts
- no script fonts

## Type Scale

### Display / Large Hero
Used sparingly on major welcome areas.

### Heading 1
Used for primary screen titles.

### Heading 2
Used for section titles.

### Heading 3
Used for card titles and modal titles.

### Body
Default content text.

### Body Small
Supporting descriptions.

### Caption
Used for helper labels and metadata.

### Price Text
Prices should be slightly emphasized and highly readable.

## Typography Behavior
- Arabic text must render naturally in RTL
- line heights should be generous
- long product names must wrap gracefully
- avoid overly tight text blocks

---

# 6. Spacing System

Use a strict spacing scale.

Recommended spacing scale:
- 4
- 8
- 12
- 16
- 20
- 24
- 32
- 40

Rules:
- no random spacing values
- use consistent padding and gaps
- major screen padding should be comfortable
- cards should breathe
- bottom navigation should not feel cramped

Common usage:
- screen horizontal padding: 16 to 20
- small gaps: 8
- standard gaps: 12 to 16
- section spacing: 20 to 24
- major vertical spacing: 24 to 32

---

# 7. Corner Radius

Use rounded corners consistently.

Recommended radius scale:
- small: 10
- medium: 14
- large: 18
- extra large: 24

Usage:
- buttons: medium
- cards: large
- input fields: medium
- modals/sheets: extra large
- offer banners: large

Avoid:
- sharp corners
- wildly different radius values between components

---

# 8. Shadows and Elevation

Use subtle shadows only.

Rules:
- soft shadow for cards
- slightly stronger shadow for floating elements
- no heavy dark shadows
- no unrealistic glow effects

Cards should feel lifted but minimal.

---

# 9. Iconography

Use a clean, modern icon set.

Preferred:
- outline or lightly filled icons
- consistent icon family across the app

Rules:
- icons must be simple and readable
- avoid mixing icon styles
- use icons to support labels, not replace them

Main navigation icons:
- Home
- Orders / History
- Profile

Optional additional icons:
- Search
- Cart
- Language
- Delivery
- Pickup
- Offers

---

# 10. Imagery

Product cards may include product images.

Image style should be:
- clean
- appetizing
- bright
- warm
- simple background if possible

Rules:
- use consistent aspect ratios
- avoid low-quality stretched images
- avoid cluttered photography

If no image exists:
- use elegant placeholder treatment, not broken layouts

---

# 11. Core Components

The agent should build a reusable component system before implementing many screens.

Recommended reusable components:

## AppShell
Handles safe area, page padding, screen background, top spacing.

## AppText
Shared typography wrapper with variants.

## AppButton
Variants:
- primary
- secondary
- ghost
- destructive
- disabled

## AppInput
For name, phone, OTP, notes.

## AppCard
Base card for menu items, profile sections, past orders.

## SectionHeader
Title + optional action.

## ProductCard
Used in menu lists.

Must support:
- image
- name
- short description
- price
- availability state

## OfferRibbon
Top rotating offers carousel/banner.
Hidden if no active offers.

## QuantityStepper
Used in product details and cart.

## LanguageToggle
English / Arabic.

## EmptyState
Friendly illustration/icon + message + optional button.

## LoadingState / Skeleton
Used on menu, order history, profile.

## Chip / Badge
Used for:
- pickup
- delivery
- active offers
- order status

## BottomTabBar
Custom-styled or polished standard tabs.

## OrderCard
For past orders list.

## ProfileRow
Reusable settings row.

---

# 12. Screen Design Guidance

## 12.1 Splash / Launch Feel
Simple and premium.
No heavy animation required.
Should feel clean and branded.

## 12.2 Authentication
Screens:
- enter first name
- enter last name
- enter phone number
- OTP verification

Design:
- large clear input fields
- friendly spacing
- minimal distractions
- easy keyboard handling

## 12.3 Home Screen
Contains:
- top greeting or page title
- rotating offers ribbon
- sections list or horizontal chips
- product cards / item list

Important:
- menu browsing must be visually attractive
- sections must be easy to scan
- scrolling should feel smooth
- avoid overcrowding the screen

## 12.4 Product Details Screen
Should feel premium and easy to customize.

Contains:
- large product image or clean header
- item name
- description
- type selection
- size selection
- add-on selection
- quantity selector
- sticky add-to-cart button

Price must update clearly as options change.

## 12.5 Cart
Should be clean and confidence-building.

Contains:
- item list
- quantities
- add-ons
- subtotal
- discount if applicable
- total
- checkout button

Editing cart items should be easy.

## 12.6 Checkout
Contains:
- pickup / delivery toggle
- delivery address if needed
- notes field
- final summary
- confirmation button

The flow should feel simple and trustworthy.

## 12.7 Past Orders
Should show:
- order number
- date
- summary of items
- status
- reorder button

Empty state must be polished.

## 12.8 Profile
Should include:
- user name
- phone number
- language toggle
- logout
- optional profile sections/cards

Keep it simple and elegant.

---

# 13. Bottom Navigation

Bottom navigation contains exactly:

- Home
- Past Orders
- Profile

Rules:
- labels must always be visible
- active state must be obvious
- icon and label alignment must be polished
- safe area spacing must be correct
- no extra tabs

---

# 14. Offers Ribbon

The top ribbon on Home shows active offers.

Rules:
- rotate offers if more than one
- hidden entirely if no active offers exist
- should feel elegant, not flashy
- each card/banner should be readable quickly
- support Arabic and English cleanly
- should not occupy too much vertical space

Possible content:
- first-time reward
- loyalty reward
- temporary shop offers

---

# 15. Order Status Presentation

Statuses should be visually clear.

Supported statuses:
- NEW
- ACCEPTED
- COMPLETED
- CANCELLED

Each should have:
- text label
- badge/chip treatment
- consistent semantic color

Do not use overly strong alarming colors unless necessary.

---

# 16. RTL / Bilingual Rules

The app must properly support:

- English (LTR)
- Arabic (RTL)

Rules:
- layout direction must flip correctly
- text alignment should follow language direction
- icons in directional contexts should mirror when appropriate
- cards and paddings must remain visually balanced in RTL
- translations must not break layout

The language toggle should be easy to find in Profile.

---

# 17. Motion and Interaction

Motion should be subtle and polished.

Allowed:
- soft screen transitions
- slight button press feedback
- lightweight carousel/ribbon transitions
- smooth state changes

Avoid:
- bouncy exaggerated motion
- long animations
- flashy entrance effects
- unnecessary motion on every component

The app should feel responsive first, animated second.

---

# 18. Accessibility

Minimum accessibility requirements:
- adequate contrast
- readable font sizes
- large tap targets
- clear labels
- clear input placeholders
- clear disabled states
- no low-contrast text on warm backgrounds

Buttons and inputs should remain usable on smaller devices.

---

# 19. Empty, Loading, and Error States

The app must not feel unfinished.

Every major screen should have:
- loading state
- empty state
- error state

Examples:
- no offers available
- no past orders
- menu failed to load
- user banned / cannot continue
- network disconnected

States should be polished and user-friendly.

---

# 20. App Store Quality Expectations

The UI should feel polished enough for public release.

This means:
- no placeholder-looking components
- no inconsistent styling
- no raw default browser-like forms
- no unfinished spacing
- no mismatched fonts
- no abrupt layout jumps
- no broken RTL support

The app should look intentional and professionally designed.

---

# 21. Implementation Rules for the Agent

The agent must:

- create reusable UI primitives first
- define theme tokens centrally
- avoid inline random styling everywhere
- keep typography, spacing, and colors consistent
- implement bilingual support from the beginning
- respect light mode only
- ensure polished mobile-first layouts
- optimize for readability and ordering speed

The agent must not:
- build dark mode
- add visual clutter
- use many unrelated colors
- create inconsistent card/button/input patterns
- ignore Arabic RTL support

---

# 22. Suggested Theme Tokens

The implementation should create a centralized theme file containing tokens for:

- colors
- spacing
- radius
- typography
- shadows
- icon sizes

This theme should be shared across reusable components.

---

# 23. Suggested Component Build Order

The agent should build the mobile design system in this order:

1. theme tokens
2. AppText
3. AppButton
4. AppInput
5. AppCard
6. Badge / Chip
7. ProductCard
8. OfferRibbon
9. QuantityStepper
10. BottomTabBar
11. EmptyState / LoadingState
12. screen layouts

Only after that should the agent build full feature screens.