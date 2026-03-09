import { getLocalizedValue } from '@/utils/i18n';

describe('getLocalizedValue', () => {
  const source = {
    name_en: 'Latte',
    name_ar: 'لاتيه',
  };

  it('returns arabic value for ar language', () => {
    expect(getLocalizedValue(source, 'ar', 'name')).toBe('لاتيه');
  });

  it('falls back to english when arabic is missing', () => {
    expect(getLocalizedValue({ name_en: 'Latte', name_ar: null }, 'ar', 'name')).toBe('Latte');
  });
});
