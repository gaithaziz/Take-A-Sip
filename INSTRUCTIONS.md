cd C:\Users\user\Take-A-Sip\Take-A-Sip
docker compose up -d --build

cd C:\Users\user\Take-A-Sip\Take-A-Sip\mobile
$env:EXPO_PUBLIC_API_BASE_URL="http://192.168.1.228:8000"
npm run start -- --host lan --clear

