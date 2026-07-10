import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { FastifyInstance, FastifyRequest } from 'fastify';
import { buildTestApp } from '../../test/test-app.js';
import { createMembersPlugin } from './members.routes.js';

const user = { id: 'user-1', name: 'Test User', email: 'test@example.com', image: null };
const mockRequireAuth = vi.fn(async (request: FastifyRequest) => { (request as any).user = user; });
const validBody = { id: '11111111-1111-1111-1111-111111111111', name: 'Alice', color: '#EF4444' };
const apiRateLimiter = { limit: vi.fn().mockResolvedValue({ success: true, remaining: 99, reset: 0 }) };

function makeDeps(overrides: Record<string, unknown> = {}) {
  return { requireAuth: mockRequireAuth, createMember: vi.fn(), updateMember: vi.fn(), deleteMember: vi.fn(), apiRateLimiter, ...overrides };
}

describe('createMembersPlugin', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = await buildTestApp(createMembersPlugin(makeDeps() as any), '/api/trips');
  });

  afterAll(() => app?.close());

  describe('POST /:id/members', () => {
    it('returns 400 for an invalid body', async () => {
      const res = await app.inject({ method: 'POST', url: '/api/trips/trip-1/members', payload: { id: 'bad', name: '', color: 'red' } });
      expect(res.statusCode).toBe(400);
    });

    it('returns 429 when rate limited', async () => {
      const localApp = await buildTestApp(createMembersPlugin(makeDeps({ apiRateLimiter: { limit: vi.fn().mockResolvedValue({ success: false, remaining: 0, reset: 0 }) } }) as any), '/api/trips');
      const res = await localApp.inject({ method: 'POST', url: '/api/trips/trip-1/members', payload: validBody });
      expect(res.statusCode).toBe(429);
      await localApp.close();
    });

    it('returns 403 when forbidden', async () => {
      const localApp = await buildTestApp(createMembersPlugin(makeDeps({ createMember: vi.fn().mockResolvedValue({ type: 'error', reason: 'forbidden' }) }) as any), '/api/trips');
      const res = await localApp.inject({ method: 'POST', url: '/api/trips/trip-1/members', payload: validBody });
      expect(res.statusCode).toBe(403);
      await localApp.close();
    });

    it('creates and returns the member', async () => {
      const member = { ...validBody, tripId: 'trip-1' };
      const localApp = await buildTestApp(createMembersPlugin(makeDeps({ createMember: vi.fn().mockResolvedValue({ type: 'success', member }) }) as any), '/api/trips');
      const res = await localApp.inject({ method: 'POST', url: '/api/trips/trip-1/members', payload: validBody });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual(member);
      await localApp.close();
    });
  });

  describe('PUT /:id/members/:memberId', () => {
    it('returns 403 when forbidden', async () => {
      const localApp = await buildTestApp(createMembersPlugin(makeDeps({ updateMember: vi.fn().mockResolvedValue({ type: 'error', reason: 'forbidden' }) }) as any), '/api/trips');
      const res = await localApp.inject({ method: 'PUT', url: '/api/trips/trip-1/members/member-1', payload: { name: 'New Name' } });
      expect(res.statusCode).toBe(403);
      await localApp.close();
    });

    it('returns 404 when not found', async () => {
      const localApp = await buildTestApp(createMembersPlugin(makeDeps({ updateMember: vi.fn().mockResolvedValue({ type: 'error', reason: 'not_found' }) }) as any), '/api/trips');
      const res = await localApp.inject({ method: 'PUT', url: '/api/trips/trip-1/members/member-1', payload: { name: 'New Name' } });
      expect(res.statusCode).toBe(404);
      await localApp.close();
    });

    it('updates and returns the member', async () => {
      const member = { id: 'member-1', name: 'New Name', color: '#aaa', tripId: 'trip-1' };
      const localApp = await buildTestApp(createMembersPlugin(makeDeps({ updateMember: vi.fn().mockResolvedValue({ type: 'success', member }) }) as any), '/api/trips');
      const res = await localApp.inject({ method: 'PUT', url: '/api/trips/trip-1/members/member-1', payload: { name: 'New Name' } });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual(member);
      await localApp.close();
    });
  });

  describe('DELETE /:id/members/:memberId', () => {
    it('returns 403 when forbidden', async () => {
      const localApp = await buildTestApp(createMembersPlugin(makeDeps({ deleteMember: vi.fn().mockResolvedValue({ type: 'error', reason: 'forbidden' }) }) as any), '/api/trips');
      const res = await localApp.inject({ method: 'DELETE', url: '/api/trips/trip-1/members/member-1' });
      expect(res.statusCode).toBe(403);
      await localApp.close();
    });

    it('returns the expense warning when member has expenses', async () => {
      const localApp = await buildTestApp(createMembersPlugin(makeDeps({ deleteMember: vi.fn().mockResolvedValue({ type: 'has_expenses', expenseCount: 3, memberName: 'Alice' }) }) as any), '/api/trips');
      const res = await localApp.inject({ method: 'DELETE', url: '/api/trips/trip-1/members/member-1' });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({ error: 'Member has expenses', expenseCount: 3, memberName: 'Alice' });
      await localApp.close();
    });

    it('deletes and returns success', async () => {
      const localApp = await buildTestApp(createMembersPlugin(makeDeps({ deleteMember: vi.fn().mockResolvedValue({ type: 'success' }) }) as any), '/api/trips');
      const res = await localApp.inject({ method: 'DELETE', url: '/api/trips/trip-1/members/member-1' });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({ success: true });
      await localApp.close();
    });
  });
});
