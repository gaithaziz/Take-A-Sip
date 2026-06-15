import { I18nManager } from 'react-native';

export const configureAppLayoutDirection = () => {
  I18nManager.allowRTL(false);
  I18nManager.forceRTL(false);
};
