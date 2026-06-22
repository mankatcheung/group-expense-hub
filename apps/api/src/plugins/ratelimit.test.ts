import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { InMemoryRateLimiter } from './ratelimit.js';

describe('InMemoryRateLimiter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('allows requests up to the limit', async () => {
    const limiter = new InMemoryRateLimiter(2, 1000);

    const first = await limiter.limit('user-1');
    const second = await limiter.limit('user-1');

    expect(first.success).toBe(true);
    expect(second.success).toBe(true);
    expect(second.remaining).toBe(0);
  });

  it('blocks requests once the limit is exceeded within the window', async () => {
    const limiter = new InMemoryRateLimiter(2, 1000);

    await limiter.limit('user-1');
    await limiter.limit('user-1');
    const third = await limiter.limit('user-1');

    expect(third.success).toBe(false);
    expect(third.remaining).toBe(0);
  });

  it('tracks identifiers independently', async () => {
    const limiter = new InMemoryRateLimiter(1, 1000);

    const userA = await limiter.limit('user-a');
    const userB = await limiter.limit('user-b');

    expect(userA.success).toBe(true);
    expect(userB.success).toBe(true);
  });

  it('resets the count once the window has elapsed', async () => {
    const limiter = new InMemoryRateLimiter(1, 1000);

    await limiter.limit('user-1');
    const blocked = await limiter.limit('user-1');
    expect(blocked.success).toBe(false);

    vi.advanceTimersByTime(1000);

    const afterWindow = await limiter.limit('user-1');
    expect(afterWindow.success).toBe(true);
  });
});
