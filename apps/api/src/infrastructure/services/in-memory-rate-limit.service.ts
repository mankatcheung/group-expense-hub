import type { IRateLimitService } from '../../application/ports/services/rate-limit.service.js';
import { InMemoryRateLimiter } from '../../plugins/ratelimit.js';

export function createInMemoryRateLimitService(max: number, windowMs: number): IRateLimitService {
  const limiter = new InMemoryRateLimiter(max, windowMs);
  return {
    limit(identifier: string) {
      return limiter.limit(identifier);
    },
  };
}
