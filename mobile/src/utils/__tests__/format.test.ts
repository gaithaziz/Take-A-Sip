import { formatCurrency, formatDateTime, formatDateTimeWithZone, getCurrentTimeZone, toNumber } from '@/utils/format';

describe('format utils', () => {
  it('converts string to number', () => {
    expect(toNumber('12.5')).toBe(12.5);
  });

  it('formats currency in english', () => {
    const result = formatCurrency(3.5, 'en');
    expect(result).toContain('3.50');
  });

  it('formats datetime based on language locale', () => {
    const date = '2026-03-10T15:30:00.000Z';
    const en = formatDateTime(date, 'en');
    const ar = formatDateTime(date, 'ar');

    expect(typeof en).toBe('string');
    expect(typeof ar).toBe('string');
    expect(en).not.toEqual(ar);
  });

  it('formats datetime with timezone and exposes current zone', () => {
    const date = '2026-03-10T15:30:00.000Z';
    const value = formatDateTimeWithZone(date, 'en');
    const zone = getCurrentTimeZone();

    expect(typeof value).toBe('string');
    expect(typeof zone).toBe('string');
    expect(zone.length).toBeGreaterThan(0);
  });
});
