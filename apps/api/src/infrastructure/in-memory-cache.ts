import type { ICache } from '../application/ports/cache.js';

const JITTER_FACTOR = 0.1; // ±10%
const DEFAULT_BETA = 1.0;

interface Entry<T> {
  value: T;
  expiresAt: number;
  delta: number; // ms the last fetch took — used for XFetch threshold
}

export function createInMemoryCache(): ICache {
  const store = new Map<string, Entry<unknown>>();
  const inflight = new Map<string, Promise<unknown>>();

  function isExpired(entry: Entry<unknown>): boolean {
    return Date.now() > entry.expiresAt;
  }

  function applyJitter(ttlMs: number): number {
    return ttlMs * (1 + (Math.random() * 2 - 1) * JITTER_FACTOR);
  }

  // XFetch: probabilistic early recompute (Vattani et al. 2015).
  // As expiry approaches, the probability of returning true increases.
  // delta = last observed compute time; beta scales aggressiveness.
  function shouldXFetch(entry: Entry<unknown>, beta: number): boolean {
    if (entry.delta === 0) return false; // instant fetch — no warm-up needed
    const gap = entry.expiresAt - Date.now();
    return gap <= entry.delta * beta * -Math.log(Math.random());
  }

  function refresh<T>(key: string, fetcher: () => Promise<T>, ttlMs: number): Promise<T> {
    const start = Date.now();
    const promise = fetcher()
      .then((value) => {
        const delta = Date.now() - start;
        store.set(key, { value, expiresAt: Date.now() + applyJitter(ttlMs), delta });
        inflight.delete(key);
        return value;
      })
      .catch((err: unknown) => {
        inflight.delete(key);
        throw err;
      });
    inflight.set(key, promise);
    return promise;
  }

  return {
    getOrFetch<T>(key: string, fetcher: () => Promise<T>, ttlMs: number, beta = DEFAULT_BETA): Promise<T> {
      const entry = store.get(key) as Entry<T> | undefined;

      if (entry && !isExpired(entry)) {
        // XFetch: kick off a background refresh without blocking the caller.
        if (shouldXFetch(entry, beta) && !inflight.has(key)) {
          void refresh(key, fetcher, ttlMs);
        }
        return Promise.resolve(entry.value);
      }

      // Coalesce concurrent misses — only one fetch runs.
      if (inflight.has(key)) {
        return inflight.get(key) as Promise<T>;
      }

      return refresh(key, fetcher, ttlMs);
    },

    delete(key: string): void {
      store.delete(key);
    },

    deleteByPrefix(prefix: string): void {
      for (const key of store.keys()) {
        if (key.startsWith(prefix)) store.delete(key);
      }
    },
  };
}
