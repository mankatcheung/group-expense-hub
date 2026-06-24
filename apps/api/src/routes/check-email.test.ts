import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildTestApp } from '../test/test-app.js';
import checkEmailRouter from './check-email.js';
import { prisma } from '../auth.js';
import { rateLimit } from '../plugins/ratelimit.js';
import { emailBloomFilter } from '../plugins/email-bloom-filter.js';

vi.mock('../auth.js', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('../plugins/ratelimit.js', () => ({
  rateLimit: {
    api: { limit: vi.fn() },
  },
}));

vi.mock('../plugins/email-bloom-filter.js', () => ({
  emailBloomFilter: {
    has: vi.fn(),
  },
}));

describe('checkEmailRouter', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    vi.resetAllMocks();
    vi.mocked(rateLimit.api.limit).mockResolvedValue({ success: true, remaining: 99, reset: 0 });
    app = await buildTestApp(checkEmailRouter, '/api');
  });

  afterAll(async () => {
    await app?.close();
  });

  describe('GET /check-email', () => {
    it('returns 429 when rate limited', async () => {
      vi.mocked(rateLimit.api.limit).mockResolvedValue({ success: false, remaining: 0, reset: 0 });

      const res = await app.inject({
        method: 'GET',
        url: '/api/check-email?email=test@example.com',
      });

      expect(res.statusCode).toBe(429);
    });

    it('returns 400 for an invalid email', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/check-email?email=not-an-email',
      });

      expect(res.statusCode).toBe(400);
    });

    it('reports available without a database lookup when the bloom filter says definitely not present', async () => {
      vi.mocked(emailBloomFilter.has).mockReturnValue(false);

      const res = await app.inject({
        method: 'GET',
        url: '/api/check-email?email=new@example.com',
      });

      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({ available: true });
      expect(emailBloomFilter.has).toHaveBeenCalledWith('new@example.com');
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });

    it('falls back to the database when the bloom filter says maybe present, and confirms taken', async () => {
      vi.mocked(emailBloomFilter.has).mockReturnValue(true);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'user-1' } as never);

      const res = await app.inject({
        method: 'GET',
        url: '/api/check-email?email=taken@example.com',
      });

      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({ available: false });
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'taken@example.com' },
        select: { id: true },
      });
    });

    it('falls back to the database when the bloom filter says maybe present, but rules out a false positive', async () => {
      vi.mocked(emailBloomFilter.has).mockReturnValue(true);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const res = await app.inject({
        method: 'GET',
        url: '/api/check-email?email=false-positive@example.com',
      });

      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({ available: true });
    });
  });
});
