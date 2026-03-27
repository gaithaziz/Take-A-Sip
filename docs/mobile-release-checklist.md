# Mobile Release Checklist

## Purpose
Use this checklist before every iOS App Store or Google Play submission for `Take-A-Sip`.

## Current App Scope
- OTP sign-in with phone number is implemented
- authenticated user profile editing and logout are implemented
- push notifications are implemented for `CLIENT`, `ADMIN`, and `DRIVER` roles
- foreground location is used in checkout for delivery address selection
- media library access is used in the admin menu editor for image upload
- external map deep linking is used for driver order navigation
- no in-app purchase or subscription flow was found in the mobile app code
- no in-app account deletion flow was found in the mobile app code

## Release Info
- Release version:
- Build number / version code:
- Release date:
- Release owner:
- Target platforms:
  - iOS
  - Android

## Product Readiness
- core user journeys work end-to-end in the release build
- no placeholder screens, dead links, debug menus, or unfinished features are exposed
- release notes reflect actual shipped changes
- screenshots and store descriptions match the current app behavior
- support contact and website links are valid

## Privacy And Policy
- privacy policy URL is live and matches current data usage
- terms or user-facing policies are accessible if required by the app
- data collection and sharing behavior has been reviewed for this release
- third-party SDK changes have been checked for privacy impact
- no staging endpoints or test analytics projects are used in production
- privacy disclosures explicitly cover phone number auth data, profile data, saved addresses, push tokens, and location data if sent to backend services
- privacy disclosures mention admin image uploads if staff/admin users can upload menu photos in production

## Account And User Rights
- sign-up flow works
- sign-in flow works
- password reset works
- logout works
- account deletion is available in-app if accounts are supported
- deletion behavior is explained clearly to users if asynchronous or partially delayed

Current status for `Take-A-Sip`:
- logout exists in profile screens
- account deletion was not found in the current mobile code and should be treated as a release blocker if App Store or Play distribution supports account creation or account ownership

## Permissions
- every requested permission is necessary for a user-facing feature
- iOS permission purpose strings are present and accurate
- Android permissions are declared and justified
- permission denial flows are tested and the app remains usable where expected
- notification permission flow is tested if push notifications are enabled
- camera, photo library, microphone, location, bluetooth, or file access prompts are tested if used

Current `Take-A-Sip` permission-sensitive features:
- location permission supports delivery checkout current-location selection
- notification permission supports order and role-based push notifications
- photo library permission supports admin menu image selection
- map deep links should be tested when Google Maps is unavailable and when only system maps are available

Current config gap to verify before store submission:
- `mobile/app.json` currently shows `expo-notifications` and Google Maps query scheme, but iOS usage descriptions for location and photo library access were not found in the checked Expo config

## Apple App Store Checks
- App Privacy answers are up to date
- tracking usage has been reviewed for ATT requirements if applicable
- Sign in with Apple requirements have been reviewed if third-party sign-in is offered
- in-app purchase and subscription flows follow Apple rules if digital purchases exist
- app metadata, subtitle, keywords, and category are ready
- App Store screenshots are current for supported device classes
- app review notes are prepared for reviewer login, feature flags, or special flows

`Take-A-Sip` Apple-specific notes:
- declare location usage consistent with delivery checkout behavior
- declare notification usage consistent with order updates
- declare photo library usage if admin users can upload menu images on iOS
- if the app is shipped only to internal business users for admin or driver operations, confirm the intended distribution model before public App Store submission

## Google Play Checks
- Data safety answers are up to date
- target API level meets current Play requirements
- Play Billing integration follows Google Play rules if digital purchases exist
- sensitive permissions and background behaviors have been reviewed against Play policies
- content rating questionnaire is up to date
- Play Store screenshots, descriptions, and promotional text are ready
- internal testing or closed testing track has been validated before production rollout

`Take-A-Sip` Google-specific notes:
- Data safety should account for phone number authentication, profile details, saved addresses, push tokens, and precise location if collected
- no Play Billing implementation was found, so digital goods billing review may be not applicable unless backend-enabled payments are added later

## Security And Signing
- release signing credentials are available only to authorized maintainers and CI
- keystores, certificates, provisioning profiles, and API keys are not stored in source control
- mobile secrets come from secure secret storage
- release builds are signed with the correct production credentials
- dependency vulnerability scan completed
- secret scan completed
- no debug logging or developer-only endpoints are enabled in production builds
- auth tokens are not stored in insecure local storage for production if stronger secure storage is required by your risk posture

## Quality Gates
- lint passes
- typecheck passes
- unit tests pass
- integration tests pass
- release build succeeds for iOS
- release build succeeds for Android
- smoke test completed on real iOS device
- smoke test completed on real Android device
- crash reporting is enabled for production builds

## Backend Compatibility
- app points to the correct production backend
- backend API changes required by this release are already deployed
- minimum supported app version policy has been reviewed if breaking backend changes exist
- push notification configuration matches the production environment
- OTP delivery, push token registration, and profile update endpoints are available and tested in production-like environments

## Known Follow-Ups From Current Code Review
- add in-app account deletion if this app is distributed through Apple App Store or Google Play with user accounts
- add and verify iOS permission usage descriptions for location and photo library access in Expo config/native output
- verify Android permission declarations generated by Expo match actual use of notifications, media library, and location
- review whether storing auth tokens in `AsyncStorage` is acceptable for release or should move to secure storage
- document exactly which roles receive push notifications and reflect that in privacy disclosures and reviewer notes

## Final Submission Checks
- version number and build number/version code are incremented correctly
- changelog is ready
- rollback plan is documented
- release approver has signed off
- submission owner is assigned

## Sign-Off
- Engineering:
- Product:
- QA:
- Release manager:
