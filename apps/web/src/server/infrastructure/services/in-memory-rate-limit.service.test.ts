import { describe, it, expect } from 'vitest';
import { createInMemoryRateLimitService } from './in-memory-rate-limit.service';

describe('createInMemoryRateLimitService', () => {
  it('allows up to the limit per identifier, then rejects', async () => {
    const limiter = createInMemoryRateLimitService(2, 60_000);

    expect((await limiter.limit('a')).success).toBe(true);
    expect((await limiter.limit('a')).success).toBe(true);
    expect((await limiter.limit('a')).success).toBe(false);
    expect((await limiter.limit('b')).success).toBe(true);
  });

  it('keeps separate state per service instance', async () => {
    const first = createInMemoryRateLimitService(1, 60_000);
    const second = createInMemoryRateLimitService(1, 60_000);

    await first.limit('a');
    expect((await second.limit('a')).success).toBe(true);
  });
});
