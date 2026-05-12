import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';
import i18n from 'i18next';

import { LanguageCode } from '@/types/api';

type LanguageContextValue = {
  language: LanguageCode;
  isRTL: boolean;
  toggleLanguage: () => Promise<void>;
};

const STORAGE_KEY = 'take_a_sip_language';
const DEFAULT_LANGUAGE: LanguageCode = 'ar';
const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

export const LanguageProvider = ({ children }: PropsWithChildren) => {
  const [language, setLanguage] = useState<LanguageCode>(DEFAULT_LANGUAGE);

  useEffect(() => {
    const run = async () => {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      const next = saved === 'en' || saved === 'ar' ? saved : DEFAULT_LANGUAGE;
      setLanguage(next);
      await i18n.changeLanguage(next);
    };
    void run();
  }, []);

  const toggleLanguage = async () => {
    const next: LanguageCode = language === 'en' ? 'ar' : 'en';
    setLanguage(next);
    await i18n.changeLanguage(next);
    await AsyncStorage.setItem(STORAGE_KEY, next);
  };

  const value = useMemo(
    () => ({ language, isRTL: language === 'ar', toggleLanguage }),
    [language],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used inside LanguageProvider');
  }
  return context;
};
