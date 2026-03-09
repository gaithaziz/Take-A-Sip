import { ar, en } from '@/i18n/translations';

const flatten = (input: Record<string, unknown>, prefix = ''): Record<string, string> => {
  return Object.entries(input).reduce<Record<string, string>>((acc, [key, value]) => {
    const nextKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(acc, flatten(value as Record<string, unknown>, nextKey));
      return acc;
    }
    acc[nextKey] = String(value ?? '');
    return acc;
  }, {});
};

describe('translations parity', () => {
  it('keeps arabic keys aligned with english and non-empty', () => {
    const enMap = flatten(en as unknown as Record<string, unknown>);
    const arMap = flatten(ar as unknown as Record<string, unknown>);
    const enKeys = Object.keys(enMap);
    const missingInArabic = enKeys.filter((key) => !(key in arMap));
    const emptyArabicValues = enKeys.filter((key) => !arMap[key].trim());

    expect(missingInArabic).toEqual([]);
    expect(emptyArabicValues).toEqual([]);
  });
});
