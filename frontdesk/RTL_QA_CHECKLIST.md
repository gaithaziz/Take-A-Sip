# Frontdesk RTL QA Checklist

Use this checklist after every UI/UX change to avoid RTL regressions.

## Setup
- Switch app language to `AR` from Auth or Orders.
- Confirm Arabic mode is driven by app-level styles, not Android native forced RTL.
- Verify device/app is rendering Arabic fonts correctly (no mojibake).
- Capture baseline screenshots for `Auth`, `Orders`, and `Order Details`.

## Auth Screen
- Title starts from the physical right edge in Arabic.
- All input text and placeholders are right-aligned in Arabic.
- Language button and top action area sit on the right in Arabic.
- OTP secondary actions remain readable and tappable with no overlap.
- Error text wraps naturally and does not clip at large font size.

## Orders Screen
- Screen title, connection pill, summary chips, and banner start from the physical right edge.
- Connection state indicator stays readable in all states.
- Order cards mirror row direction correctly:
  - order number + status chip row
  - label/value lines start from the right edge
  - action button order
  - assignment/status metadata
- Bottom dock buttons mirror order and preserve 44px+ touch targets.
- Failed print cards keep actions aligned and non-overlapping.

## Order Details Screen
- Header and all detail lines start from the physical right edge.
- Item rows, addons, and quantity prefixes are readable in Arabic.
- Accept/Reject row mirrors correctly for `NEW` orders.
- `Cancel` appears (and `Reject` does not) after accepted/assigned states.
- Driver assignment list stays RTL aligned and scrollable.

## Content + Formatting
- Arabic digits/times display correctly where localized formatting is expected.
- Long customer names and notes wrap without UI breakage.
- Banner text and status chips never overflow their containers.

## Alerts + Actions
- New order triggers immediate alert ping once per new order.
- Repeat alert continues every 8 seconds while `NEW` orders exist.
- Alert stops when no `NEW` orders remain.

## Regression Sanity
- Switch back to `EN` and confirm LTR layout is still correct.
- Run `npm run typecheck` in `frontdesk`.
