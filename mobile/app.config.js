const baseConfig = require('./app.json');

module.exports = () => {
  const googleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();
  const androidConfig = baseConfig.expo.android ?? {};
  const iosConfig = baseConfig.expo.ios ?? {};

  return {
    expo: {
      ...baseConfig.expo,
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
      },
      ios: {
        ...iosConfig,
        bundleIdentifier: iosConfig.bundleIdentifier ?? 'com.takeasip.mobile',
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
