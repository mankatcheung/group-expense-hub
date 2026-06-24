import { describe, it, expect, vi, beforeEach } from 'vitest';
import { emailBloomFilter, seedEmailBloomFilter } from './email-bloom-filter.js';

describe('emailBloomFilter', () => {
  it('reports an added email as present', () => {
    emailBloomFilter.add('present@example.com');

    expect(emailBloomFilter.has('present@example.com')).toBe(true);
  });

  it('reports a never-added email as absent', () => {
    expect(emailBloomFilter.has('definitely-never-added@example.com')).toBe(false);
  });
});

describe('seedEmailBloomFilter', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('adds every existing user email to the filter', async () => {
    const findMany = vi.fn().mockResolvedValue([
      { email: 'seeded-one@example.com' },
      { email: 'seeded-two@example.com' },
    ]);

    await seedEmailBloomFilter({ user: { findMany } } as never);

    expect(findMany).toHaveBeenCalledWith({ select: { email: true } });
    expect(emailBloomFilter.has('seeded-one@example.com')).toBe(true);
    expect(emailBloomFilter.has('seeded-two@example.com')).toBe(true);
  });

  it('does not throw when there are no existing users', async () => {
    const findMany = vi.fn().mockResolvedValue([]);

    await expect(seedEmailBloomFilter({ user: { findMany } } as never)).resolves.toBeUndefined();
  });
});
