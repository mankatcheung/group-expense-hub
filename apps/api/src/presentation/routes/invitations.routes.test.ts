import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { FastifyInstance, FastifyRequest } from 'fastify';
import { buildTestApp } from '../../test/test-app.js';
import { createInvitationsPlugin } from './invitations.routes.js';

const user = { id: 'user-1', name: 'Test User', email: 'test@example.com', image: null };
const mockRequireAuth = vi.fn(async (request: FastifyRequest) => { (request as any).user = user; });
const apiRateLimiter = { limit: vi.fn().mockResolvedValue({ success: true, remaining: 99, reset: 0 }) };

const pendingInvitation = {
  id: 'inv-1', token: 'token-1', tripId: 'trip-1',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  trip: { name: 'Bali', user: { id: 'owner-1', name: 'Owner', email: 'owner@example.com', image: null } },
};

function makeDeps(overrides: Record<string, unknown> = {}) {
  return { requireAuth: mockRequireAuth, getInvitations: vi.fn().mockResolvedValue([]), acceptInvitation: vi.fn(), apiRateLimiter, ...overrides };
}

describe('createInvitationsPlugin', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = await buildTestApp(createInvitationsPlugin(makeDeps() as any), '/api/invitations');
  });

  afterAll(() => app?.close());

  describe('GET /', () => {
    it('returns formatted pending invitations', async () => {
      const localApp = await buildTestApp(createInvitationsPlugin(makeDeps({ getInvitations: vi.fn().mockResolvedValue([pendingInvitation]) }) as any), '/api/invitations');
      const res = await localApp.inject({ method: 'GET', url: '/api/invitations' });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual([{
        id: 'inv-1', token: 'token-1', tripId: 'trip-1', tripName: 'Bali',
        inviter: { id: 'owner-1', name: 'Owner', email: 'owner@example.com', image: null },
        createdAt: '2026-01-01T00:00:00.000Z',
      }]);
      await localApp.close();
    });

    it('returns empty array when no invitations', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/invitations' });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual([]);
    });
  });

  describe('POST /:id/accept', () => {
    it('returns 429 when rate limited', async () => {
      const localApp = await buildTestApp(createInvitationsPlugin(makeDeps({ apiRateLimiter: { limit: vi.fn().mockResolvedValue({ success: false, remaining: 0, reset: 0 }) } }) as any), '/api/invitations');
      const res = await localApp.inject({ method: 'POST', url: '/api/invitations/inv-1/accept' });
      expect(res.statusCode).toBe(429);
      await localApp.close();
    });

    it('returns 404 when not found', async () => {
      const localApp = await buildTestApp(createInvitationsPlugin(makeDeps({ acceptInvitation: vi.fn().mockResolvedValue({ type: 'error', reason: 'not_found' }) }) as any), '/api/invitations');
      const res = await localApp.inject({ method: 'POST', url: '/api/invitations/inv-1/accept' });
      expect(res.statusCode).toBe(404);
      await localApp.close();
    });

    it('returns 403 when wrong user', async () => {
      const localApp = await buildTestApp(createInvitationsPlugin(makeDeps({ acceptInvitation: vi.fn().mockResolvedValue({ type: 'error', reason: 'wrong_user' }) }) as any), '/api/invitations');
      const res = await localApp.inject({ method: 'POST', url: '/api/invitations/inv-1/accept' });
      expect(res.statusCode).toBe(403);
      await localApp.close();
    });

    it('returns 400 for expired or used invitations', async () => {
      for (const reason of ['expired', 'already_used', 'already_member'] as const) {
        const localApp = await buildTestApp(createInvitationsPlugin(makeDeps({ acceptInvitation: vi.fn().mockResolvedValue({ type: 'error', reason }) }) as any), '/api/invitations');
        const res = await localApp.inject({ method: 'POST', url: '/api/invitations/inv-1/accept' });
        expect(res.statusCode).toBe(400);
        await localApp.close();
      }
    });

    it('accepts and returns tripId', async () => {
      const mockAccept = vi.fn().mockResolvedValue({ type: 'success', tripId: 'trip-1' });
      const localApp = await buildTestApp(createInvitationsPlugin(makeDeps({ acceptInvitation: mockAccept }) as any), '/api/invitations');
      const res = await localApp.inject({ method: 'POST', url: '/api/invitations/inv-1/accept' });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({ success: true, tripId: 'trip-1' });
      expect(mockAccept).toHaveBeenCalledWith('inv-1', user);
      await localApp.close();
    });
  });
});
