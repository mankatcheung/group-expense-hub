import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { FastifyInstance, FastifyRequest } from 'fastify';
import { buildTestApp } from '../../test/test-app.js';
import { createUserPlugin, type UserPluginDeps } from './user.routes.js';

const user = { id: 'user-1', name: 'Test User', email: 'test@example.com', image: null };
const mockRequireAuth = vi.fn(async (request: FastifyRequest) => { (request as any).user = user; }); // eslint-disable-line @typescript-eslint/no-explicit-any

function makeDeps(overrides: Partial<UserPluginDeps> = {}): UserPluginDeps {
  return {
    requireAuth: mockRequireAuth,
    updateProfile: vi.fn().mockResolvedValue({ type: 'success' }),
    authRateLimiter: { limit: vi.fn().mockResolvedValue({ success: true, remaining: 19, reset: 0 }) },
    ...overrides,
  };
}

describe('createUserPlugin', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = await buildTestApp(createUserPlugin(makeDeps()), '/api/user');
  });

  afterAll(() => app?.close());

  describe('PUT /profile', () => {
    it('returns 400 for invalid body', async () => {
      const res = await app.inject({ method: 'PUT', url: '/api/user/profile', payload: { name: 123 } });
      expect(res.statusCode).toBe(400);
    });

    it('returns 429 when rate limited', async () => {
      const localApp = await buildTestApp(createUserPlugin(makeDeps({ authRateLimiter: { limit: vi.fn().mockResolvedValue({ success: false, remaining: 0, reset: 0 }) } })), '/api/user');
      const res = await localApp.inject({ method: 'PUT', url: '/api/user/profile', payload: { name: 'New Name' } });
      expect(res.statusCode).toBe(429);
      await localApp.close();
    });

    it('returns 400 when email is already taken', async () => {
      const localApp = await buildTestApp(createUserPlugin(makeDeps({ updateProfile: vi.fn().mockResolvedValue({ type: 'error', reason: 'email_taken' }) })), '/api/user');
      const res = await localApp.inject({ method: 'PUT', url: '/api/user/profile', payload: { email: 'taken@example.com' } });
      expect(res.statusCode).toBe(400);
      expect(res.json()).toEqual({ error: 'Email already in use' });
      await localApp.close();
    });

    it('returns 200 on success', async () => {
      const mockUpdate = vi.fn().mockResolvedValue({ type: 'success' });
      const localApp = await buildTestApp(createUserPlugin(makeDeps({ updateProfile: mockUpdate })), '/api/user');
      const res = await localApp.inject({ method: 'PUT', url: '/api/user/profile', payload: { name: 'New Name' } });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({ success: true });
      expect(mockUpdate).toHaveBeenCalledWith(user, { name: 'New Name', email: undefined });
      await localApp.close();
    });
  });

  describe('POST /password', () => {
    it('returns 200', async () => {
      const res = await app.inject({ method: 'POST', url: '/api/user/password' });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({ success: true });
    });
  });
});
