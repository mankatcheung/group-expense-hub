import { describe, it, expect } from 'vitest';
import { getCurrencySymbol, CURRENCIES } from '@/lib/currencies';

describe('currencies', () => {
  describe('getCurrencySymbol', () => {
    it('should return symbol for valid currency code', () => {
      expect(getCurrencySymbol('USD')).toBe('$');
      expect(getCurrencySymbol('EUR')).toBe('€');
      expect(getCurrencySymbol('GBP')).toBe('£');
    });

    it('should return code for unknown currency', () => {
      expect(getCurrencySymbol('XYZ')).toBe('XYZ');
      expect(getCurrencySymbol('')).toBe('');
    });
  });

  describe('CURRENCIES', () => {
    it('should contain expected currencies', () => {
      const codes = CURRENCIES.map((c) => c.code);
      expect(codes).toContain('USD');
      expect(codes).toContain('EUR');
      expect(codes).toContain('GBP');
    });
  });
});
