# Frontdesk App (Phase 3)

Sunmi V2 Pro frontdesk app for incoming order handling and local thermal printing.

## Features implemented

- High-priority FCM delivery for new orders
- Incoming `NEW` orders list
- New order alert (vibration + native beep when module exists)
- Accept order flow (`POST /orders/{id}/accept`)
- Receipt formatting and print call via Sunmi native module wrapper
- Push-token retry when the device boots before Wi-Fi or Google Play Services is ready
- Missed-order recovery on app resume and every five minutes

## Run

```powershell
cd frontdesk
npm install
$env:EXPO_PUBLIC_API_BASE_URL="http://192.168.1.228:8000"
npm run start -- --host lan --port 8082 --clear
```

Notes:
- `8000` is the backend API port.
- `8081/8082` are Metro/dev-server ports (not backend API).

## Built app over USB (recommended for device testing)

For installed APK/dev-client connected by USB, use backend on your PC and tunnel it.

```powershell
# Make sure backend is running on your PC at localhost:8000 first.
cd frontdesk
npm run usb:setup
```

You can also pass a custom backend URL:

```powershell
npm run usb:setup -- -BackendUrl "http://127.0.0.1:8000"
```

Manual equivalent:

```powershell
adb devices
adb reverse tcp:8081 tcp:8082
adb reverse tcp:8000 tcp:8000
```

If Metro is running on port `8082`, the `8081 -> 8082` reverse is required because the Android dev client probes Metro on `localhost:8081`.

Use app build config with:

```text
EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
```

Because `EXPO_PUBLIC_*` is baked at build time, changing shell env after install does not change a built app.

## RTL behavior notes

- Arabic layout is handled at the app component/style level.
- The app does **not** rely on Android native forced RTL for screen mirroring.
- After RTL-related UI edits, always relaunch the app through the frontdesk dev client and verify:
  - title starts from the physical right edge
  - connection pill is right-anchored
  - summary chips are right-anchored
  - mixed Arabic plus Latin/number lines keep the correct visual order

## Sunmi native printer integration

This repo includes the native wrapper files:

- `android/app/src/main/java/com/takeasip/frontdesk/SunmiPrinterModule.kt`
- `android/app/src/main/java/com/takeasip/frontdesk/SunmiPrinterPackage.kt`

After `npx expo prebuild -p android`, register `SunmiPrinterPackage()` in `MainApplication` packages list and add Sunmi SDK dependencies to `android/app/build.gradle`.

If native module is not registered, the app still receives/accepts orders but printing throws a runtime error (`SunmiPrinterModule is not available`).
