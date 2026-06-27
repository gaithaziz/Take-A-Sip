const fs = require('fs');
const path = require('path');

const source = process.env.EXPO_ANDROID_GOOGLE_SERVICES_FILE;

if (!source) {
  console.log('EXPO_ANDROID_GOOGLE_SERVICES_FILE is not set; skipping Android google-services.json setup.');
  process.exit(0);
}

const destination = path.join(__dirname, '..', 'android', 'app', 'google-services.json');

fs.mkdirSync(path.dirname(destination), { recursive: true });
fs.copyFileSync(source, destination);

console.log('Android google-services.json prepared for EAS build.');
