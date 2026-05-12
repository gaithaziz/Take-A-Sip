import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import { ar, en } from './translations';

void i18n.use(initReactI18next).init({
  compatibilityJSON: 'v4',
  fallbackLng: 'en',
  lng: 'ar',
  interpolation: { escapeValue: false },
  resources: {
    en: { translation: en },
    ar: { translation: ar },
  },
});

export default i18n;
