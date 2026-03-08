cd C:\Users\user\Take-A-Sip\Take-A-Sip
docker compose up -d --build

cd C:\Users\user\Take-A-Sip\Take-A-Sip\mobile
$env:EXPO_PUBLIC_API_BASE_URL="http://192.168.1.228:8000"
npm run start -- --host lan --clear


# 1) Stop Metro by port
netstat -ano | findstr :8081
taskkill /PID <PID_FROM_ABOVE> /F

# 2) Stop frontdesk app on device
$env:ANDROID_HOME="C:\Users\user\AppData\Local\Android\Sdk"
$env:Path="$env:ANDROID_HOME\platform-tools;$env:Path"
adb shell am force-stop com.takeasip.frontdesk

# 3) Stop adb server (optional, full shutdown)
adb kill-server

==================================
# 1) Start backend (from repo root)
cd C:\Users\user\Take-A-Sip\Take-A-Sip
docker compose up -d --build

# 2) Start Metro for frontdesk
cd C:\Users\user\Take-A-Sip\Take-A-Sip\frontdesk
$env:EXPO_PUBLIC_API_BASE_URL="http://192.168.1.228:8000"
npm run start -- --host lan --clear

In a second PowerShell window:

# 3) Connect device + launch app
$env:ANDROID_HOME="C:\Users\user\AppData\Local\Android\Sdk"
$env:Path="$env:ANDROID_HOME\platform-tools;$env:Path"
adb devices
adb shell monkey -p com.takeasip.frontdesk -c android.intent.category.LAUNCHER 1

If app not installed yet:

cd C:\Users\user\Take-A-Sip\Take-A-Sip\frontdesk\android
$env:JAVA_HOME="C:\Program Files\Android\Android Studio\jbr"
.\gradlew.bat installDebug
