const baseConfig = require('./app.base.json');

module.exports = () => ({
  expo: {
    ...baseConfig.expo,
    android: {
      ...baseConfig.expo.android,
      googleServicesFile:
        process.env.EXPO_ANDROID_GOOGLE_SERVICES_FILE?.trim() ||
        baseConfig.expo.android?.googleServicesFile ||
        './google-services.json',
    },
  },
});
