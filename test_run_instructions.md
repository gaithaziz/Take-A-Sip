# Take-A-Sip Wi-Fi Run Guide

This is the short version for how you actually use the project:

- Frontdesk runs over Wi-Fi
- Backend runs in Docker
- Mobile Metro uses `8081`
- Frontdesk Metro uses `8082`

Current PC Wi-Fi IP:

```powershell
192.168.1.228
```

If your IP changes later, update the commands below.

## Ports

- Backend API: `8000`
- Postgres: `5433`
- Mobile Metro: `8081`
- Frontdesk Metro: `8082`

## Test Accounts

OTP for all test accounts:

```powershell
123456
```

- `FRONTDESK`: `+962790070001`
- `DRIVER`: `+962790099992`
- `CLIENT`: `0790000101`
- `ADMIN`: `+962790099981`

## Install Day: Frontdesk on Sunmi

Use this when:

- frontdesk is not installed yet
- you changed the backend IP
- you changed native Android files

### 1. Start Backend

```powershell
cd C:\Users\user\Take-A-Sip\Take-A-Sip
docker compose up -d postgres backend --remove-orphans
Invoke-RestMethod http://localhost:8000/health
```

Expected:

```json
{"status":"ok"}
```

### 2. Make Sure ADB Is Authorized

Even if daily use is over Wi-Fi, install still needs ADB authorization.

```powershell
$ADB = 'C:\Users\user\AppData\Local\Android\Sdk\platform-tools\adb.exe'
& $ADB devices -l
```

You need the Sunmi to show as:

```text
V2A4213923214    device
```

If it shows `offline` or `unauthorized`:

- unlock the Sunmi
- set USB mode to `File Transfer`
- accept the RSA popup on the Sunmi

If the popup does not appear:

```powershell
& $ADB kill-server
& $ADB start-server
& $ADB devices -l
```

If still broken, on the Sunmi:

- `Developer options`
- `Revoke USB debugging authorizations`
- turn `USB debugging` off, then on
- reconnect cable
- accept the RSA popup

### 3. Install Frontdesk Build

```powershell
cd C:\Users\user\Take-A-Sip\Take-A-Sip\frontdesk
$env:EXPO_PUBLIC_API_BASE_URL = 'http://192.168.1.228:8000'
npx expo run:android --port 8082
```

Notes:

- the URI scheme warning from Expo is not the blocker
- if Expo says `This computer is not authorized for developing on Device ...`, fix ADB authorization first

### 4. Start Frontdesk Metro

After install finishes:

```powershell
cd C:\Users\user\Take-A-Sip\Take-A-Sip\frontdesk
npx expo start --dev-client --host lan --port 8082 --clear
```

Then open the installed frontdesk app manually on the Sunmi.

### 5. Optional: Start Mobile Too

```powershell
cd C:\Users\user\Take-A-Sip\Take-A-Sip\mobile
npx expo start --host lan --port 8081 --clear
```

## Next Day Run

Use this if frontdesk is already installed and the PC IP is still the same.

### 1. Start Backend

```powershell
cd C:\Users\user\Take-A-Sip\Take-A-Sip
docker compose up -d postgres backend
Invoke-RestMethod http://localhost:8000/health
```

### 2. Start Frontdesk Metro

```powershell
cd C:\Users\user\Take-A-Sip\Take-A-Sip\frontdesk
npx expo start --dev-client --host lan --port 8082 --clear
```

### 3. Open Frontdesk on the Sunmi

Open the already installed app.

That is all.

### 4. Optional: Start Mobile Too

```powershell
cd C:\Users\user\Take-A-Sip\Take-A-Sip\mobile
npx expo start --host lan --port 8081 --clear
```

## Rebuild Only If Needed

Run this again only if:

- PC IP changed
- Wi-Fi network changed
- native Android code changed
- frontdesk app was removed from the Sunmi

```powershell
cd C:\Users\user\Take-A-Sip\Take-A-Sip\frontdesk
$env:EXPO_PUBLIC_API_BASE_URL = 'http://192.168.1.228:8000'
npx expo run:android --port 8082
```

## Quick ADB Authorization Fix

Use this only when Expo says the computer is not authorized.

```powershell
$ADB = 'C:\Users\user\AppData\Local\Android\Sdk\platform-tools\adb.exe'
& $ADB kill-server
& $ADB start-server
& $ADB devices -l
```

You must end with the Sunmi in `device` state before `expo run:android` will work.

## Stop Everything

Stop Metro with `Ctrl+C`, then:

```powershell
cd C:\Users\user\Take-A-Sip\Take-A-Sip
docker compose down
```
