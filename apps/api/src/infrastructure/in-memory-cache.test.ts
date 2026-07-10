import { describe, it, expect, vi, afterEach } from 'vitest';
import { createInMemoryCache } from './in-memory-cache.js';

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('createInMemoryCache', () => {
  describe('getOrFetch — basic', () => {
    it('calls fetcher on miss and returns result', async () => {
      const cache = createInMemoryCache();
      const result = await cache.getOrFetch('k', () => Promise.resolve(42), 5_000);
      expect(result).toBe(42);
    });

    it('returns cached value on hit without calling fetcher again', async () => {
      const cache = createInMemoryCache();
      const fetcher = vi.fn().mockResolvedValue('data');
      await cache.getOrFetch('k', fetcher, 5_000);
      const result = await cache.getOrFetch('k', fetcher, 5_000);
      expect(result).toBe('data');
      expect(fetcher).toHaveBeenCalledTimes(1);
    });

    it('re-fetches after TTL expires', async () => {
      vi.useFakeTimers();
      // Math.random = 0.5 → jitter factor = 1.0 (no change)
      vi.spyOn(Math, 'random').mockReturnValue(0.5);

      const cache = createInMemoryCache();
      const fetcher = vi.fn().mockResolvedValue('v1');
      await cache.getOrFetch('k', fetcher, 1_000);

      vi.advanceTimersByTime(1_001);
      fetcher.mockResolvedValue('v2');
      const result = await cache.getOrFetch('k', fetcher, 1_000);

      expect(result).toBe('v2');
      expect(fetcher).toHaveBeenCalledTimes(2);
    });

    it('caches null results', async () => {
      const cache = createInMemoryCache();
      const fetcher = vi.fn().mockResolvedValue(null);
      await cache.getOrFetch('k', fetcher, 5_000);
      await cache.getOrFetch('k', fetcher, 5_000);
      expect(fetcher).toHaveBeenCalledTimes(1);
    });
  });

  describe('coalescing', () => {
    it('deduplicates concurrent requests for the same key', async () => {
      const cache = createInMemoryCache();
      let resolve: (v: string) => void;
      const fetcher = vi.fn(() => new Promise<string>((r) => { resolve = r; }));

      const p1 = cache.getOrFetch('k', fetcher, 5_000);
      const p2 = cache.getOrFetch('k', fetcher, 5_000);
      const p3 = cache.getOrFetch('k', fetcher, 5_000);

      expect(fetcher).toHaveBeenCalledTimes(1);
      resolve!('result');

      const results = await Promise.all([p1, p2, p3]);
      expect(results).toEqual(['result', 'result', 'result']);
      expect(fetcher).toHaveBeenCalledTimes(1);
    });

    it('does not coalesce requests for different keys', async () => {
      const cache = createInMemoryCache();
      const fetcher = vi.fn().mockResolvedValue('v');
      await Promise.all([
        cache.getOrFetch('a', fetcher, 5_000),
        cache.getOrFetch('b', fetcher, 5_000),
      ]);
      expect(fetcher).toHaveBeenCalledTimes(2);
    });

    it('releases coalescing lock after rejection so the next request retries', async () => {
      const cache = createInMemoryCache();
      const fetcher = vi.fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValue('ok');

      await expect(cache.getOrFetch('k', fetcher, 5_000)).rejects.toThrow('fail');
      const result = await cache.getOrFetch('k', fetcher, 5_000);

      expect(result).toBe('ok');
      expect(fetcher).toHaveBeenCalledTimes(2);
    });
  });

  describe('XFetch probabilistic early refresh', () => {
    // XFetch triggers when: gap <= delta * beta * -ln(random)
    // Test setup: fetcher advances fake clock by 50ms → delta = 50ms.
    // After advancing to 9960ms past start, gap = 40ms.
    // With Math.random() = 0.001: threshold = 50 * 1 * -ln(0.001) ≈ 345ms > 40ms → triggers.

    it('starts background refresh when near expiry without blocking the caller', async () => {
      vi.useFakeTimers();
      vi.spyOn(Math, 'random')
        .mockReturnValueOnce(0.5)   // jitter for first fetch: factor = 1.0
        .mockReturnValueOnce(0.001); // XFetch check: tiny random → large threshold → triggers

      const cache = createInMemoryCache();
      let call = 0;
      const fetcher = vi.fn().mockImplementation(() => {
        vi.advanceTimersByTime(50); // delta = 50ms
        return Promise.resolve(`v${++call}`);
      });

      await cache.getOrFetch('k', fetcher, 10_000);
      expect(call).toBe(1);

      // gap after advance: expiresAt = (t0+50) + 10000 = t0+10050; now = t0+50+9960 = t0+10010; gap = 40ms
      vi.advanceTimersByTime(9_960);

      const result = await cache.getOrFetch('k', fetcher, 10_000);

      expect(result).toBe('v1');  // serves current cached value
      expect(call).toBe(2);       // background refresh has started
    });

    it('does not trigger background refresh when well before expiry', async () => {
      vi.useFakeTimers();
      vi.spyOn(Math, 'random')
        .mockReturnValueOnce(0.5)  // jitter: factor = 1.0
        .mockReturnValueOnce(0.99); // XFetch check: near-1 random → tiny threshold → no trigger

      const cache = createInMemoryCache();
      let call = 0;
      const fetcher = vi.fn().mockImplementation(() => {
        vi.advanceTimersByTime(50);
        return Promise.resolve(`v${++call}`);
      });

      await cache.getOrFetch('k', fetcher, 10_000);
      vi.advanceTimersByTime(500); // 500ms into 10s TTL — far from expiry

      await cache.getOrFetch('k', fetcher, 10_000);
      expect(call).toBe(1); // no background refresh
    });

    it('coalesces XFetch background refresh with concurrent misses', async () => {
      vi.useFakeTimers();
      vi.spyOn(Math, 'random')
        .mockReturnValueOnce(0.5)   // jitter
        .mockReturnValueOnce(0.001) // first XFetch check → triggers
        .mockReturnValueOnce(0.001); // second XFetch check → would trigger but inflight exists

      const cache = createInMemoryCache();
      let call = 0;
      const fetcher = vi.fn().mockImplementation(() => {
        vi.advanceTimersByTime(50);
        return Promise.resolve(`v${++call}`);
      });

      await cache.getOrFetch('k', fetcher, 10_000);
      vi.advanceTimersByTime(9_960);

      // Both callers see XFetch trigger, but only one background refresh starts
      await cache.getOrFetch('k', fetcher, 10_000);
      await cache.getOrFetch('k', fetcher, 10_000);
      expect(call).toBe(2); // only one background refresh, not two
    });
  });

  describe('jitter', () => {
    it('shortens TTL when Math.random() returns 0 (–10%)', async () => {
      vi.useFakeTimers();
      vi.spyOn(Math, 'random').mockReturnValue(0); // factor = 1 + (0*2 - 1)*0.1 = 0.9

      const cache = createInMemoryCache();
      const fetcher = vi.fn().mockResolvedValue('v');
      await cache.getOrFetch('k', fetcher, 1_000); // effective TTL = 900ms

      vi.advanceTimersByTime(900); // still valid
      await cache.getOrFetch('k', fetcher, 1_000);
      expect(fetcher).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(1); // expired
      await cache.getOrFetch('k', fetcher, 1_000);
      expect(fetcher).toHaveBeenCalledTimes(2);
    });

    it('extends TTL when Math.random() returns near 1 (+10%)', async () => {
      vi.useFakeTimers();
      vi.spyOn(Math, 'random').mockReturnValue(1 - Number.EPSILON); // factor ≈ 1.1

      const cache = createInMemoryCache();
      const fetcher = vi.fn().mockResolvedValue('v');
      await cache.getOrFetch('k', fetcher, 1_000); // effective TTL ≈ 1100ms

      vi.advanceTimersByTime(1_050); // within extended TTL
      await cache.getOrFetch('k', fetcher, 1_000);
      expect(fetcher).toHaveBeenCalledTimes(1);
    });
  });

  describe('delete', () => {
    it('removes a specific entry so the next read re-fetches', async () => {
      const cache = createInMemoryCache();
      const fetcher = vi.fn().mockResolvedValue('v');
      await cache.getOrFetch('k', fetcher, 5_000);
      cache.delete('k');
      await cache.getOrFetch('k', fetcher, 5_000);
      expect(fetcher).toHaveBeenCalledTimes(2);
    });
  });

  describe('deleteByPrefix', () => {
    it('removes all entries with the given prefix and leaves others intact', async () => {
      const cache = createInMemoryCache();
      const fetcher = vi.fn().mockResolvedValue('v');
      await Promise.all([
        cache.getOrFetch('trips:user:u1', fetcher, 5_000),
        cache.getOrFetch('trips:user:u2', fetcher, 5_000),
        cache.getOrFetch('trip:full:t1', fetcher, 5_000),
      ]);
      expect(fetcher).toHaveBeenCalledTimes(3);

      cache.deleteByPrefix('trips:user:');

      await Promise.all([
        cache.getOrFetch('trips:user:u1', fetcher, 5_000), // miss — re-fetched
        cache.getOrFetch('trips:user:u2', fetcher, 5_000), // miss — re-fetched
        cache.getOrFetch('trip:full:t1', fetcher, 5_000),  // hit — no re-fetch
      ]);
      expect(fetcher).toHaveBeenCalledTimes(5);
    });
  });
});
