interface RateLimitResult {
  success: boolean;
  remaining: number;
  reset: number;
}

interface WindowEntry {
  count: number;
  windowStart: number;
}

/**
 * Fixed-window rate limiter backed by an in-memory Map, scoped to this
 * process. Each limiter sweeps its own expired entries on an interval sized
 * to its window so memory doesn't grow unbounded with one-off identifiers.
 *
 * Note: state isn't shared across instances, so limits are per-process. If
 * the API ever runs with multiple replicas, each replica enforces its own
 * limit independently rather than a single shared limit.
 */
export class InMemoryRateLimiter {
  private readonly hits = new Map<string, WindowEntry>();

  constructor(
    private readonly max: number,
    private readonly windowMs: number
  ) {
    const sweep = setInterval(() => this.sweepExpired(), this.windowMs);
    sweep.unref?.();
  }

  private sweepExpired() {
    const now = Date.now();
    for (const [key, entry] of this.hits) {
      if (now - entry.windowStart >= this.windowMs) {
        this.hits.delete(key);
      }
    }
  }

  async limit(identifier: string): Promise<RateLimitResult> {
    const now = Date.now();
    const entry = this.hits.get(identifier);

    if (!entry || now - entry.windowStart >= this.windowMs) {
      this.hits.set(identifier, { count: 1, windowStart: now });
      return { success: true, remaining: this.max - 1, reset: now + this.windowMs };
    }

    if (entry.count >= this.max) {
      return { success: false, remaining: 0, reset: entry.windowStart + this.windowMs };
    }

    entry.count += 1;
    return {
      success: true,
      remaining: this.max - entry.count,
      reset: entry.windowStart + this.windowMs,
    };
  }
}

const WINDOW_MS = 60_000;

export const rateLimit = {
  auth: new InMemoryRateLimiter(20, WINDOW_MS),
  api: new InMemoryRateLimiter(100, WINDOW_MS),
  email: new InMemoryRateLimiter(5, WINDOW_MS),
};
