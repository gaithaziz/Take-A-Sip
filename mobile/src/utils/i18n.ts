import { LanguageCode } from '@/types/api';

type Bilingual = {
  name_en?: string | null;
  name_ar?: string | null;
  title_en?: string | null;
  title_ar?: string | null;
  description_en?: string | null;
  description_ar?: string | null;
};

export const getLocalizedValue = (
  source: Bilingual,
  language: LanguageCode,
  key: 'name' | 'title' | 'description',
): string => {
  const en = source[`${key}_en`];
  const ar = source[`${key}_ar`];
  if (language === 'ar') {
    return (ar ?? en ?? '').trim();
  }
  return (en ?? ar ?? '').trim();
};
