import type { IRateLimitService } from '../../application/ports/services/rate-limit.service';
import { InMemoryRateLimiter } from '../../plugins/ratelimit';

export function createInMemoryRateLimitService(max: number, windowMs: number): IRateLimitService {
  const limiter = new InMemoryRateLimiter(max, windowMs);
  return {
    limit(identifier: string) {
      return limiter.limit(identifier);
    },
  };
}
