import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildTestApp } from '../test/test-app.js';
import userRouter from './user.js';
import { prisma } from '../auth.js';
import { getUserFromRequest } from '../lib/get-session.js';
import { rateLimit } from '../plugins/ratelimit.js';

vi.mock('../auth.js', () => ({
  prisma: {
    user: {
      update: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('../lib/get-session.js', () => ({
  getUserFromRequest: vi.fn(),
}));

vi.mock('../plugins/ratelimit.js', () => ({
  rateLimit: {
    auth: { limit: vi.fn() },
  },
}));

const user = { id: 'user-1', name: 'Test User', email: 'test@example.com', image: null };

describe('userRouter', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    vi.resetAllMocks();
    vi.mocked(getUserFromRequest).mockResolvedValue(user as never);
    vi.mocked(rateLimit.auth.limit).mockResolvedValue({ success: true, remaining: 19, reset: 0 });
    app = await buildTestApp(userRouter, '/api/user');
  });

  afterAll(async () => {
    await app?.close();
  });

  describe('PUT /profile', () => {
    it('returns 429 when rate limited', async () => {
      vi.mocked(rateLimit.auth.limit).mockResolvedValue({ success: false, remaining: 0, reset: 0 });

      const res = await app.inject({
        method: 'PUT',
        url: '/api/user/profile',
        payload: { name: 'New Name' },
      });

      expect(res.statusCode).toBe(429);
    });

    it('returns 400 for an invalid body', async () => {
      const res = await app.inject({
        method: 'PUT',
        url: '/api/user/profile',
        payload: { email: 'not-an-email' },
      });

      expect(res.statusCode).toBe(400);
    });

    it('updates the name when provided', async () => {
      vi.mocked(prisma.user.update).mockResolvedValue({} as never);

      const res = await app.inject({
        method: 'PUT',
        url: '/api/user/profile',
        payload: { name: 'New Name' },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({ success: true });
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: user.id },
        data: { name: 'New Name' },
      });
    });

    it('returns 400 when the new email is already in use', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'other-user' } as never);

      const res = await app.inject({
        method: 'PUT',
        url: '/api/user/profile',
        payload: { email: 'taken@example.com' },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json()).toEqual({ error: 'Email already in use' });
    });

    it('updates the email when it is not taken and differs from the current one', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.user.update).mockResolvedValue({} as never);

      const res = await app.inject({
        method: 'PUT',
        url: '/api/user/profile',
        payload: { email: 'new@example.com' },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({ success: true });
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: user.id },
        data: { email: 'new@example.com' },
      });
    });

    it('does not touch email when it matches the current one', async () => {
      const res = await app.inject({
        method: 'PUT',
        url: '/api/user/profile',
        payload: { email: user.email },
      });

      expect(res.statusCode).toBe(200);
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
      expect(prisma.user.update).not.toHaveBeenCalled();
    });
  });

  describe('POST /password', () => {
    it('returns 429 when rate limited', async () => {
      vi.mocked(rateLimit.auth.limit).mockResolvedValue({ success: false, remaining: 0, reset: 0 });

      const res = await app.inject({ method: 'POST', url: '/api/user/password' });

      expect(res.statusCode).toBe(429);
    });

    it('returns success', async () => {
      const res = await app.inject({ method: 'POST', url: '/api/user/password' });

      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({ success: true });
    });
  });
});
