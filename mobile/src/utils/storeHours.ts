import { LanguageCode, StoreStatus, WorkingHoursDay } from '@/types/api';

const dayKeys = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

export const getWorkingDayLabel = (day: number, t: (key: string) => string) =>
  t(`storeHours.${dayKeys[day] ?? dayKeys[0]}`);

export const formatStoreTime = (value: string | null | undefined, language: LanguageCode) => {
  if (!value) return '';
  const [hour, minute] = value.split(':').map(Number);
  const date = new Date(2026, 0, 1, hour, minute);
  return new Intl.DateTimeFormat(language === 'ar' ? 'ar-JO' : 'en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
};

export const formatStoreDateTime = (value: string, language: LanguageCode, timezone = 'Asia/Amman') =>
  new Intl.DateTimeFormat(language === 'ar' ? 'ar-JO' : 'en-US', {
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: timezone,
  }).format(new Date(value));

export const formatWorkingHoursDay = (
  entry: WorkingHoursDay,
  language: LanguageCode,
  t: (key: string) => string,
) =>
  entry.is_open
    ? `${formatStoreTime(entry.opens_at, language)} - ${formatStoreTime(entry.closes_at, language)}`
    : t('storeHours.closed');

export const todayWorkingHours = (status: StoreStatus) => {
  if (!status.working_hours) return null;
  const weekdayName = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: status.timezone }).format(new Date());
  const weekday = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(weekdayName);
  return status.working_hours.find((entry) => entry.day_of_week === weekday) ?? null;
};
