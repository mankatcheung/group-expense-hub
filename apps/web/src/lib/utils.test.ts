import { describe, it, expect } from 'vitest';
import { cn } from '@/lib/utils';

describe('utils', () => {
  describe('cn', () => {
    it('should merge class names', () => {
      expect(cn('foo', 'bar')).toBe('foo bar');
    });

    it('should handle conditional classes', () => {
      const condition = true;
      expect(cn('foo', condition && 'bar', 'baz')).toBe('foo bar baz');
      expect(cn('foo', condition && '', 'baz')).toBe('foo baz');
    });

    it('should handle arrays', () => {
      expect(cn(['foo', 'bar'])).toBe('foo bar');
    });

    it('should handle objects', () => {
      expect(cn({ foo: true, bar: false, baz: true })).toBe('foo baz');
    });

    it('should handle mixed inputs', () => {
      expect(cn('foo', { bar: true }, ['baz', { qux: false }])).toBe('foo bar baz');
    });

    it('should handle empty inputs', () => {
      expect(cn()).toBe('');
      expect(cn('')).toBe('');
      expect(cn('', '', '')).toBe('');
    });

    it('should deduplicate tailwind classes', () => {
      expect(cn('px-4 p-4')).toBe('p-4');
    });
  });
});
