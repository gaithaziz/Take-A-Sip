# Frontdesk App (Phase 3)

Sunmi V2 Pro frontdesk app for incoming order handling and local thermal printing.

## Features implemented

- WebSocket connection to `ws://<backend>/ws/frontdesk?token=<jwt>`
- Incoming `NEW` orders list
- New order alert (vibration + native beep when module exists)
- Accept order flow (`POST /orders/{id}/accept`)
- Receipt formatting and print call via Sunmi native module wrapper
- Reconnect with exponential backoff
- Missed-order recovery on reconnect via `GET /orders?status=NEW`

## Run

```powershell
cd frontdesk
npm install
$env:EXPO_PUBLIC_API_BASE_URL="http://192.168.1.228:8000"
npm run start -- --host lan --clear
```

## Sunmi native printer integration

This repo includes the native wrapper files:

- `android/app/src/main/java/com/takeasip/frontdesk/SunmiPrinterModule.kt`
- `android/app/src/main/java/com/takeasip/frontdesk/SunmiPrinterPackage.kt`

After `npx expo prebuild -p android`, register `SunmiPrinterPackage()` in `MainApplication` packages list and add Sunmi SDK dependencies to `android/app/build.gradle`.

If native module is not registered, the app still receives/accepts orders but printing throws a runtime error (`SunmiPrinterModule is not available`).
