# Mobile App (Phase 2)

## Run

1. Install dependencies:
   - `npm install`
2. Set API URL for your LAN backend:
   - PowerShell: `$env:EXPO_PUBLIC_API_BASE_URL="http://<YOUR_PC_IP>:8000"`
3. Start Expo:
   - `npm run start -- --host lan --clear`
4. Scan QR from Expo Go on iPhone/Android.

## Notes

- This app targets Expo SDK 54.
- If backend runs in Docker from repo root, use:
  - `docker compose up -d --build`
