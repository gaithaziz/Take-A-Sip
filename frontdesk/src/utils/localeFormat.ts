const ARABIC_LOCALE = 'ar-JO';
const ENGLISH_LOCALE = 'en-US';
const LTR_ISOLATE = '\u2066';
const PDI = '\u2069';

const localeFromLanguage = (language: string) => (language.startsWith('ar') ? ARABIC_LOCALE : ENGLISH_LOCALE);
const isArabicLanguage = (language: string) => language.startsWith('ar');

export const formatLocalizedNumber = (value: number, language: string) =>
  new Intl.NumberFormat(localeFromLanguage(language), { maximumFractionDigits: 0 }).format(value);

export const formatLocalizedTime = (iso: string, language: string) =>
  new Date(iso).toLocaleTimeString(localeFromLanguage(language), {
    hour: '2-digit',
    minute: '2-digit',
  });

export const isolateLtrText = (value: string, language: string) =>
  isArabicLanguage(language) ? `${LTR_ISOLATE}${value}${PDI}` : value;

export const formatOrderReference = (orderNumber: string | number, language: string) =>
  isolateLtrText(`#${orderNumber}`, language);
