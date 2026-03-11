import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

const redis = redisUrl && redisToken ? new Redis({ url: redisUrl, token: redisToken }) : null;

export const rateLimit = {
  auth: redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(5, '60 s'),
        prefix: 'rate:auth',
      })
    : {
        limit: async () => ({ success: true, remaining: 5, reset: 0 }),
      },

  api: redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(30, '60 s'),
        prefix: 'rate:api',
      })
    : {
        limit: async () => ({ success: true, remaining: 30, reset: 0 }),
      },

  email: redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(3, '60 s'),
        prefix: 'rate:email',
      })
    : {
        limit: async () => ({ success: true, remaining: 3, reset: 0 }),
      },
};
