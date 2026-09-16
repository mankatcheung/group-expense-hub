import { describe, it, expect, vi } from 'vitest';
import { createUserRoutes, type UserRouteDeps } from './user.routes';
import { authedService, makeLimiter, makeRequest, testUser, unauthedService } from './test-helpers';

function makeDeps(overrides: Partial<UserRouteDeps> = {}): UserRouteDeps {
  return {
    authService: authedService(),
    updateProfile: vi.fn().mockResolvedValue({ type: 'success' }),
    authRateLimiter: makeLimiter(),
    ...overrides,
  };
}

describe('createUserRoutes', () => {
  describe('updateProfile (PUT /api/user/profile)', () => {
    const update = (deps: Partial<UserRouteDeps>, body: unknown) =>
      createUserRoutes(makeDeps(deps)).updateProfile(makeRequest('PUT', '/api/user/profile', body));

    it('returns 401 when not authenticated', async () => {
      expect((await update({ authService: unauthedService() }, { name: 'New Name' })).status).toBe(401);
    });

    it('returns 400 for an invalid body', async () => {
      expect((await update({}, { name: 123 })).status).toBe(400);
    });

    it('returns 429 when rate limited', async () => {
      expect((await update({ authRateLimiter: makeLimiter(false) }, { name: 'New Name' })).status).toBe(429);
    });

    it('returns 400 when the email is already taken', async () => {
      const res = await update({ updateProfile: vi.fn().mockResolvedValue({ type: 'error', reason: 'email_taken' }) }, { email: 'taken@example.com' });
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: 'Email already in use' });
    });

    it('returns 200 on success', async () => {
      const updateProfile = vi.fn().mockResolvedValue({ type: 'success' });
      const res = await update({ updateProfile }, { name: 'New Name' });
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ success: true });
      expect(updateProfile).toHaveBeenCalledWith(testUser, { name: 'New Name', email: undefined });
    });
  });

  describe('changePassword (POST /api/user/password)', () => {
    it('returns 401 when not authenticated', async () => {
      const res = await createUserRoutes(makeDeps({ authService: unauthedService() })).changePassword(makeRequest('POST', '/api/user/password'));
      expect(res.status).toBe(401);
    });

    it('returns 429 when rate limited', async () => {
      const res = await createUserRoutes(makeDeps({ authRateLimiter: makeLimiter(false) })).changePassword(makeRequest('POST', '/api/user/password'));
      expect(res.status).toBe(429);
    });

    it('returns 200 (stub: the password is not changed)', async () => {
      const res = await createUserRoutes(makeDeps()).changePassword(makeRequest('POST', '/api/user/password'));
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ success: true });
    });
  });
});
