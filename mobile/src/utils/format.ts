import { LanguageCode } from '@/types/api';

const getLocale = (language: LanguageCode): string => (language === 'ar' ? 'ar-JO' : 'en-US');

export const formatCurrency = (value: number, language: LanguageCode): string => {
  const formatter = new Intl.NumberFormat(getLocale(language), {
    style: 'currency',
    currency: 'JOD',
    maximumFractionDigits: 2,
  });
  return formatter.format(value);
};

export const formatDateTime = (value: string | number | Date, language: LanguageCode): string =>
  new Intl.DateTimeFormat(getLocale(language), {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));

export const formatDateTimeWithZone = (value: string | number | Date, language: LanguageCode): string =>
  (() => {
    const date = new Date(value);
    try {
      return new Intl.DateTimeFormat(getLocale(language), {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZoneName: 'short',
      }).format(date);
    } catch {
      return formatDateTime(date, language);
    }
  })();

export const getCurrentTimeZone = (): string => Intl.DateTimeFormat().resolvedOptions().timeZone;

export const toNumber = (value: string | number): number => Number(value);
