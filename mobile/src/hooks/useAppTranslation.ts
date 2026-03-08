import { useTranslation } from 'react-i18next';

import { useLanguage } from '@/state/LanguageContext';

export const useAppTranslation = () => {
  const { t } = useTranslation();
  const { language, isRTL } = useLanguage();
  return { t, language, isRTL };
};
