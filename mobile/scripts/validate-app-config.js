const fs = require('fs');
const path = require('path');

const appConfigPath = path.resolve(__dirname, '..', 'app.base.json');
const raw = fs.readFileSync(appConfigPath, 'utf8');
const config = JSON.parse(raw);
const expo = config.expo ?? {};
const iosInfoPlist = expo.ios?.infoPlist ?? {};
const androidPermissions = expo.android?.permissions ?? [];

const requiredIosStrings = [
  'NSUserNotificationsUsageDescription',
  'NSLocationWhenInUseUsageDescription',
  'NSPhotoLibraryUsageDescription',
];

const requiredAndroidPermissions = [
  'ACCESS_COARSE_LOCATION',
  'ACCESS_FINE_LOCATION',
  'POST_NOTIFICATIONS',
];
const forbiddenAndroidPermissions = [
  'READ_EXTERNAL_STORAGE',
  'READ_MEDIA_IMAGES',
  'READ_MEDIA_VIDEO',
  'WRITE_EXTERNAL_STORAGE',
];

const failures = [];

for (const key of requiredIosStrings) {
  const value = iosInfoPlist[key];
  if (typeof value !== 'string' || value.trim().length < 10) {
    failures.push(`Missing or too-short iOS usage description: ${key}`);
  }
}

for (const permission of requiredAndroidPermissions) {
  if (!androidPermissions.includes(permission)) {
    failures.push(`Missing Android permission declaration: ${permission}`);
  }
}

for (const permission of forbiddenAndroidPermissions) {
  if (androidPermissions.includes(permission)) {
    failures.push(`Forbidden broad Android media permission declaration: ${permission}`);
  }
}

if (failures.length > 0) {
  console.error('Mobile app config validation failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('Mobile app config validation passed.');
