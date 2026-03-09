# Mobile App (Phase 2)

Single Expo app for:
- client experience
- admin dashboard (Phase 4)

## Run

1. Install dependencies:
   - `npm install`
2. Set API URL for your LAN backend:
   - PowerShell: `$env:EXPO_PUBLIC_API_BASE_URL="http://<YOUR_PC_IP>:8000"`
3. Start Expo:
   - `npm run start -- --host lan --clear`
4. Scan QR from Expo Go on iPhone/Android.

## Admin access

1. Create an admin user from backend:
   - `python -m scripts.create_admin --phone 0790000000 --first-name Admin --last-name Owner`
2. Login with that phone from the mobile app OTP flow.
3. Open the admin area after authentication (role-based navigation).

## Notes

- This app targets Expo SDK 54.
- Native date/time inputs for admin forms use `@react-native-community/datetimepicker`.
- If backend runs in Docker from repo root, use:
  - `docker compose up -d --build`
