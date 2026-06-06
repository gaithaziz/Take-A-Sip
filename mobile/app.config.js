const baseConfig = require('./app.json');

module.exports = () => {
  const googleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();
  const androidGoogleServicesFile = process.env.EXPO_ANDROID_GOOGLE_SERVICES_FILE?.trim();
  const iosGoogleServicesFile = process.env.EXPO_IOS_GOOGLE_SERVICES_FILE?.trim();
  const iosNotificationsMode =
    process.env.EXPO_NOTIFICATIONS_IOS_MODE?.trim() ||
    (process.env.EAS_BUILD_PROFILE === 'production' ? 'production' : 'development');
  const androidConfig = baseConfig.expo.android ?? {};
  const iosConfig = baseConfig.expo.ios ?? {};
  const plugins = (baseConfig.expo.plugins ?? []).map((plugin) =>
    plugin === 'expo-notifications'
      ? [
          'expo-notifications',
          {
            mode: iosNotificationsMode,
          },
        ]
      : plugin,
  );

  return {
    expo: {
      ...baseConfig.expo,
      plugins,
      android: {
        ...androidConfig,
        config: googleMapsApiKey
          ? {
              ...(androidConfig.config ?? {}),
              googleMaps: {
                apiKey: googleMapsApiKey,
              },
            }
          : androidConfig.config,
        googleServicesFile: androidGoogleServicesFile || androidConfig.googleServicesFile,
      },
      ios: {
        ...iosConfig,
        bundleIdentifier: iosConfig.bundleIdentifier ?? 'com.takeasip.mobile',
        googleServicesFile: iosGoogleServicesFile || iosConfig.googleServicesFile,
        config: googleMapsApiKey
          ? {
              ...(iosConfig.config ?? {}),
              googleMapsApiKey,
            }
          : iosConfig.config,
      },
    },
  };
};
