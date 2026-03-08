import { formatCurrency, toNumber } from '@/utils/format';

describe('format utils', () => {
  it('converts string to number', () => {
    expect(toNumber('12.5')).toBe(12.5);
  });

  it('formats currency in english', () => {
    const result = formatCurrency(3.5, 'en');
    expect(result).toContain('3.50');
  });
});
