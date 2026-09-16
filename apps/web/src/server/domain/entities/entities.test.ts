import { describe, it, expect } from 'vitest';
import { isExpired, isPending } from './invitation';
import { getDisplayName } from './user';
import { getRandomColor } from '../../lib/colors';

describe('invitation', () => {
  it('is expired only once expiresAt is in the past', () => {
    expect(isExpired({ expiresAt: new Date(Date.now() - 1000) })).toBe(true);
    expect(isExpired({ expiresAt: new Date(Date.now() + 60_000) })).toBe(false);
  });

  it('is pending only with status "pending"', () => {
    expect(isPending({ status: 'pending' })).toBe(true);
    expect(isPending({ status: 'accepted' })).toBe(false);
  });
});

describe('getDisplayName', () => {
  it('prefers the name', () => {
    expect(getDisplayName({ name: 'Alice', email: 'alice@example.com' })).toBe('Alice');
  });

  it("falls back to the email's local part", () => {
    expect(getDisplayName({ name: null, email: 'alice.smith@example.com' })).toBe('alice.smith');
  });
});

describe('getRandomColor', () => {
  it('returns a hex color from the member palette', () => {
    for (let i = 0; i < 20; i++) {
      expect(getRandomColor()).toMatch(/^#[0-9A-F]{6}$/);
    }
  });
});
