import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { resources } from './translations';

const LANGUAGE_KEY = 'frontdesk_language';

i18next.use(initReactI18next).init({
  compatibilityJSON: 'v4',
  resources,
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

i18next.on('languageChanged', (lang) => {
  void AsyncStorage.setItem(LANGUAGE_KEY, lang);
});

void AsyncStorage.getItem(LANGUAGE_KEY).then((savedLanguage) => {
  if (savedLanguage && savedLanguage !== i18next.language) {
    void i18next.changeLanguage(savedLanguage);
  }
});

export default i18next;
