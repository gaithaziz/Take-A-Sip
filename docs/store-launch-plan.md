# Store Launch Plan

## Purpose

Use this plan to prepare the `Take A Sip` customer app for Apple App Store and Google Play submission. This covers what remains besides screenshots and the privacy policy.

## Scope

- iOS App Store customer app submission
- Google Play customer app submission
- Production backend and services already deployed
- Store builds must point to the production API

## Phase 1: App Identity And Assets

- [ ] Confirm public app name: `Take A Sip`.
- [ ] Confirm Android package: `com.takeasip.mobile`.
- [ ] Confirm iOS bundle ID: `com.takeasip.mobile`.
- [ ] Confirm app version and build numbers are incremented.
- [ ] Confirm app icon is final.
- [ ] Confirm Android adaptive icon is final.
- [ ] Confirm splash screen is final.
- [ ] Confirm app category. Recommended: `Food & Drink`.

## Phase 2: Store Metadata Draft

- [ ] Write short description for Google Play.
- [ ] Write full description for Google Play.
- [ ] Write App Store subtitle.
- [ ] Write App Store promotional text if needed.
- [ ] Write App Store keywords.
- [ ] Add support URL.
- [ ] Add contact email and phone.
- [ ] Add copyright/company name.
- [ ] Prepare release notes/changelog.
- [ ] Confirm store descriptions match the actual production app behavior.

## Phase 3: Privacy And Data Safety Draft

- [ ] Complete Apple App Privacy answers.
- [ ] Complete Google Play Data Safety answers.
- [ ] Confirm whether collected data includes:
  - [ ] phone number
  - [ ] name/profile details
  - [ ] delivery address
  - [ ] precise or approximate location
  - [ ] order history
  - [ ] push notification token or device identifiers
  - [ ] photos/media, only if exposed in the submitted app build
- [ ] Confirm data is encrypted in transit.
- [ ] Confirm whether data is shared with third parties.
- [ ] Confirm whether the app uses data for tracking. Expected answer is likely `No`.
- [ ] Ensure privacy policy text matches the answers in both stores.

## Phase 4: Permissions Review

- [ ] Verify location permission is only requested when needed for delivery or address selection.
- [ ] Verify notification permission is tied to order updates or account notifications.
- [ ] Verify photo/media permission is needed in the customer app build.
- [ ] Remove unused permissions from the submitted customer build.
- [ ] Confirm iOS permission purpose strings are accurate.
- [ ] Confirm Android permission declarations match real app behavior.

## Phase 5: Account Deletion

- [ ] Verify the customer app has an in-app account deletion flow.
- [ ] Fix account deletion if the customer app supports accounts but deletion is missing.
- [ ] Add a web deletion/contact path if required by store forms.
- [ ] Document deletion behavior in reviewer notes if the result is not immediate or obvious.

## Phase 6: Production Service Credentials

- [ ] Create or confirm the Android production upload keystore.
- [ ] Configure Android release builds to use the production upload key, not the debug key.
- [ ] Configure APNs credentials for iOS push notifications.
- [ ] Configure FCM credentials for Android push notifications.
- [ ] Restrict Google Maps API keys for iOS bundle ID.
- [ ] Restrict Google Maps API keys for Android package name and release signing SHA-1.
- [ ] Confirm target SDK meets the current Google Play requirement.

## Phase 7: Release Build Creation

- [ ] Build the Android App Bundle (`.aab`) for Google Play.
- [ ] Build the iOS App Store archive through EAS/App Store Connect.
- [ ] Confirm the final release builds use the production API URL.
- [ ] Confirm no staging URLs, debug labels, or developer-only flags are present.
- [ ] Confirm build version and build number/version code match the store metadata.

## Phase 8: Release Build Smoke Test

- [ ] Install the exact Android release build on a real Samsung device.
- [ ] Install the exact iOS release/TestFlight build on a real iPhone if available.
- [ ] Test OTP login.
- [ ] Test menu loading.
- [ ] Test location/address selection.
- [ ] Test permission denial flows.
- [ ] Test production push notifications.
- [ ] Test one real production order.
- [ ] Confirm the order appears on frontdesk/Sunmi.
- [ ] Confirm Arabic menu/order text displays correctly.
- [ ] Confirm logout.
- [ ] Test account deletion against production.
- [ ] Confirm deleted, inactive, or banned user behavior is correct after deletion.

## Phase 9: Store Screenshots

- [ ] Capture required Apple App Store iPhone screenshots.
- [ ] Capture Apple App Store iPad screenshots if the submitted build supports iPad.
- [ ] Capture required Google Play phone screenshots.
- [ ] Capture Google Play tablet screenshots if the app targets tablets or large screens.
- [ ] Use screenshots from the final production-looking release build.
- [ ] Include the core customer flow:
  - [ ] home/menu
  - [ ] item detail or customization
  - [ ] cart
  - [ ] checkout/address
  - [ ] order status
  - [ ] profile or account screen
- [ ] Include Arabic UI screenshots if Arabic is a major supported experience.
- [ ] Confirm screenshots do not show staging data, debug labels, private phone numbers, real customer data, or broken images.
- [ ] Confirm screenshot text and visible prices match production behavior.

## Phase 10: Reviewer Access

- [ ] Create or document a reviewer-safe login path.
- [ ] Prepare Apple review notes.
- [ ] Prepare Google review notes.
- [ ] Include steps to:
  - [ ] log in
  - [ ] browse the menu
  - [ ] place a clearly identifiable test order
  - [ ] cancel or ignore the test order
  - [ ] test Arabic content if needed
- [ ] Confirm OTP does not block reviewers from entering the app.

## Phase 11: Store Compliance Forms

- [ ] Complete Apple age rating questionnaire.
- [ ] Complete Apple export compliance/encryption declaration.
- [ ] Complete Google content rating questionnaire.
- [ ] Complete Google target audience form.
- [ ] Complete Google app access declaration.
- [ ] Complete Google ads declaration. Expected answer is likely `No`.
- [ ] Confirm no in-app purchase setup is needed because the app sells physical food/drink, not digital goods.

## Phase 12: Submission

- [ ] Upload Android `.aab` to Play Console.
- [ ] Upload iOS build to App Store Connect.
- [ ] Attach final screenshots.
- [ ] Fill all required metadata.
- [ ] Fill all required privacy and compliance forms.
- [ ] Submit Android to internal or closed testing first if required.
- [ ] Submit iOS to TestFlight or App Review.
- [ ] Submit production release when review gates are clear.

## Phase 13: Post-Submission Watch

- [ ] Monitor App Store Connect review messages.
- [ ] Monitor Play Console review messages.
- [ ] Keep production backend monitoring open during rollout.
- [ ] Keep rollback-ready backend revision documented.
- [ ] Be ready to patch metadata, reviewer notes, or build configuration quickly.

## Current High-Risk Items

- Android release signing must be production signing, not debug signing.
- Reviewer access must work without the reviewer getting stuck on OTP.
- Account deletion must be verified before public store submission.
- Google Maps Android key restrictions must use the release signing SHA-1.
- Store privacy/data answers must match the real production app behavior.
