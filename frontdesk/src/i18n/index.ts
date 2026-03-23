import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { I18nManager } from 'react-native';

import { resources } from './translations';

const LANGUAGE_KEY = 'frontdesk_language';
const DEFAULT_LANGUAGE = 'en';
export const isRtlLanguage = (lang: string) => lang.toLowerCase().startsWith('ar');
const normalizeLanguage = (lang: string | null | undefined) => (isRtlLanguage(lang ?? '') ? 'ar' : DEFAULT_LANGUAGE);

const normalizeNativeLayoutDirection = () => {
  I18nManager.allowRTL(false);
  I18nManager.swapLeftAndRightInRTL(false);
  if (I18nManager.isRTL) {
    I18nManager.forceRTL(false);
  }
};

let initializationPromise: Promise<void> | null = null;
let hasRegisteredLanguageListener = false;

const registerLanguageListener = () => {
  if (hasRegisteredLanguageListener) {
    return;
  }

  i18next.on('languageChanged', (lang) => {
    const normalizedLanguage = normalizeLanguage(lang);
    void AsyncStorage.setItem(LANGUAGE_KEY, normalizedLanguage);
  });

  hasRegisteredLanguageListener = true;
};

export const initializeI18n = async () => {
  if (initializationPromise) {
    return initializationPromise;
  }

  initializationPromise = (async () => {
    const savedLanguage = normalizeLanguage(await AsyncStorage.getItem(LANGUAGE_KEY));
    normalizeNativeLayoutDirection();

    if (!i18next.isInitialized) {
      await i18next.use(initReactI18next).init({
        compatibilityJSON: 'v4',
        resources,
        lng: savedLanguage,
        fallbackLng: DEFAULT_LANGUAGE,
        interpolation: { escapeValue: false },
      });
    } else if (i18next.language !== savedLanguage) {
      await i18next.changeLanguage(savedLanguage);
    }

    registerLanguageListener();
  })();

  return initializationPromise;
};

void initializeI18n();

export default i18next;
