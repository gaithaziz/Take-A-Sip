import { LanguageCode } from '@/types/api';

export const formatCurrency = (value: number, language: LanguageCode): string => {
  const formatter = new Intl.NumberFormat(language === 'ar' ? 'ar-JO' : 'en-US', {
    style: 'currency',
    currency: 'JOD',
    maximumFractionDigits: 2,
  });
  return formatter.format(value);
};

export const toNumber = (value: string | number): number => Number(value);
