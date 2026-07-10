import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { FastifyInstance, FastifyRequest } from 'fastify';
import { buildTestApp } from '../../test/test-app.js';
import { createTripsPlugin, type TripPluginDeps } from './trips.routes.js';

const user = { id: 'user-1', name: 'Test User', email: 'test@example.com', image: null };

const mockRequireAuth = vi.fn(async (request: FastifyRequest) => {
  (request as any).user = user; // eslint-disable-line @typescript-eslint/no-explicit-any
});

const makeMockRateLimiter = (success = true) => ({
  limit: vi.fn().mockResolvedValue({ success, remaining: success ? 99 : 0, reset: 0 }),
});

function makeDefaultDeps(overrides: Partial<TripPluginDeps> = {}): TripPluginDeps {
  return {
    requireAuth: mockRequireAuth,
    getTrips: vi.fn().mockResolvedValue([]),
    createTrip: vi.fn(),
    getTrip: vi.fn().mockResolvedValue(null),
    updateTrip: vi.fn(),
    deleteTrip: vi.fn().mockResolvedValue(undefined),
    inviteMember: vi.fn(),
    joinTrip: vi.fn(),
    removeCollaborator: vi.fn(),
    apiRateLimiter: makeMockRateLimiter(),
    authRateLimiter: makeMockRateLimiter(),
    emailRateLimiter: makeMockRateLimiter(),
    ...overrides,
  };
}

describe('createTripsPlugin', () => {
  let app: FastifyInstance;

  afterAll(() => app?.close());

  describe('GET /', () => {
    beforeEach(async () => {
      app = await buildTestApp(createTripsPlugin(makeDefaultDeps()), '/api/trips');
    });

    it('returns 401 when not authenticated', async () => {
      const failAuth = vi.fn(async (_req: FastifyRequest, reply: { status: (n: number) => { send: (b: unknown) => void } }) => {
        reply.status(401).send({ error: 'Unauthorized' });
      });
      const localApp = await buildTestApp(createTripsPlugin(makeDefaultDeps({ requireAuth: failAuth as TripPluginDeps['requireAuth'] })), '/api/trips');
      const res = await localApp.inject({ method: 'GET', url: '/api/trips' });
      expect(res.statusCode).toBe(401);
      await localApp.close();
    });

    it('returns formatted trip summaries from the use case', async () => {
      const tripRow = {
        id: 'trip-1', name: 'Bali', createdAt: new Date('2026-01-01T00:00:00.000Z'),
        userId: user.id, user: { id: user.id, name: user.name, email: user.email, image: null },
        members: [{ id: 'm1' }], expenses: [{ amount: 10, currency: 'USD' }],
      };
      const deps = makeDefaultDeps({ getTrips: vi.fn().mockResolvedValue([tripRow]) });
      const localApp = await buildTestApp(createTripsPlugin(deps), '/api/trips');
      const res = await localApp.inject({ method: 'GET', url: '/api/trips' });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual([
        expect.objectContaining({ id: 'trip-1', isOwner: true, memberCount: 1, expenseCount: 1 }),
      ]);
      await localApp.close();
    });
  });

  describe('POST /', () => {
    const validBody = { id: '11111111-1111-1111-1111-111111111111', name: 'New Trip' };

    it('returns 400 for an invalid body', async () => {
      app = await buildTestApp(createTripsPlugin(makeDefaultDeps()), '/api/trips');
      const res = await app.inject({ method: 'POST', url: '/api/trips', payload: { id: 'not-a-uuid', name: '' } });
      expect(res.statusCode).toBe(400);
    });

    it('returns 429 when rate limited', async () => {
      const deps = makeDefaultDeps({ apiRateLimiter: makeMockRateLimiter(false) });
      app = await buildTestApp(createTripsPlugin(deps), '/api/trips');
      const res = await app.inject({ method: 'POST', url: '/api/trips', payload: validBody });
      expect(res.statusCode).toBe(429);
    });

    it('creates the trip and returns it', async () => {
      const mockCreateTrip = vi.fn().mockResolvedValue({ id: validBody.id, name: validBody.name, createdAt: new Date('2026-01-01') });
      app = await buildTestApp(createTripsPlugin(makeDefaultDeps({ createTrip: mockCreateTrip })), '/api/trips');
      const res = await app.inject({ method: 'POST', url: '/api/trips', payload: validBody });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual(expect.objectContaining({ id: validBody.id, name: validBody.name, isOwner: true, owner: null }));
      expect(mockCreateTrip).toHaveBeenCalledWith({ id: validBody.id, name: validBody.name, createdAt: undefined }, user.id);
    });
  });

  describe('GET /:id', () => {
    it('returns 404 when the use case returns null', async () => {
      app = await buildTestApp(createTripsPlugin(makeDefaultDeps()), '/api/trips');
      const res = await app.inject({ method: 'GET', url: '/api/trips/trip-1' });
      expect(res.statusCode).toBe(404);
    });

    it('returns the formatted trip when found', async () => {
      const tripFull = {
        id: 'trip-1', name: 'Bali', createdAt: new Date('2026-01-01'), userId: user.id,
        user: { id: user.id, name: user.name, email: user.email, image: null },
        members: [], tripMembers: [], expenses: [],
      };
      const deps = makeDefaultDeps({ getTrip: vi.fn().mockResolvedValue(tripFull) });
      app = await buildTestApp(createTripsPlugin(deps), '/api/trips');
      const res = await app.inject({ method: 'GET', url: '/api/trips/trip-1' });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual(expect.objectContaining({ id: 'trip-1', isOwner: true }));
    });
  });

  describe('PUT /:id', () => {
    it('returns 429 when rate limited', async () => {
      const deps = makeDefaultDeps({ apiRateLimiter: makeMockRateLimiter(false) });
      app = await buildTestApp(createTripsPlugin(deps), '/api/trips');
      const res = await app.inject({ method: 'PUT', url: '/api/trips/trip-1', payload: { name: 'Renamed' } });
      expect(res.statusCode).toBe(429);
    });

    it('returns 403 when the use case returns forbidden', async () => {
      const deps = makeDefaultDeps({ updateTrip: vi.fn().mockResolvedValue({ error: 'forbidden' }) });
      app = await buildTestApp(createTripsPlugin(deps), '/api/trips');
      const res = await app.inject({ method: 'PUT', url: '/api/trips/trip-1', payload: { name: 'Renamed' } });
      expect(res.statusCode).toBe(403);
    });

    it('returns 200 when update succeeds', async () => {
      const deps = makeDefaultDeps({ updateTrip: vi.fn().mockResolvedValue({ id: 'trip-1', name: 'Renamed', createdAt: new Date() }) });
      app = await buildTestApp(createTripsPlugin(deps), '/api/trips');
      const res = await app.inject({ method: 'PUT', url: '/api/trips/trip-1', payload: { name: 'Renamed' } });
      expect(res.statusCode).toBe(200);
    });
  });

  describe('DELETE /:id', () => {
    it('returns 429 when rate limited', async () => {
      const deps = makeDefaultDeps({ apiRateLimiter: makeMockRateLimiter(false) });
      app = await buildTestApp(createTripsPlugin(deps), '/api/trips');
      const res = await app.inject({ method: 'DELETE', url: '/api/trips/trip-1' });
      expect(res.statusCode).toBe(429);
    });

    it('deletes the trip and returns success', async () => {
      app = await buildTestApp(createTripsPlugin(makeDefaultDeps()), '/api/trips');
      const res = await app.inject({ method: 'DELETE', url: '/api/trips/trip-1' });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({ success: true });
    });
  });

  describe('POST /:id/invite', () => {
    it('returns 400 for an invalid body', async () => {
      app = await buildTestApp(createTripsPlugin(makeDefaultDeps()), '/api/trips');
      const res = await app.inject({ method: 'POST', url: '/api/trips/trip-1/invite', payload: { email: 'not-an-email' } });
      expect(res.statusCode).toBe(400);
    });

    it('returns 429 when email rate limited', async () => {
      const deps = makeDefaultDeps({ emailRateLimiter: makeMockRateLimiter(false) });
      app = await buildTestApp(createTripsPlugin(deps), '/api/trips');
      const res = await app.inject({ method: 'POST', url: '/api/trips/trip-1/invite', payload: { email: 'a@b.com' } });
      expect(res.statusCode).toBe(429);
    });

    it('returns 403 when not the owner', async () => {
      const deps = makeDefaultDeps({ inviteMember: vi.fn().mockResolvedValue({ type: 'error', reason: 'forbidden' }) });
      app = await buildTestApp(createTripsPlugin(deps), '/api/trips');
      const res = await app.inject({ method: 'POST', url: '/api/trips/trip-1/invite', payload: { email: 'a@b.com' } });
      expect(res.statusCode).toBe(403);
    });

    it('returns 200 with pending=true when invitation is sent', async () => {
      const deps = makeDefaultDeps({ inviteMember: vi.fn().mockResolvedValue({ type: 'invitation_sent', email: 'a@b.com' }) });
      app = await buildTestApp(createTripsPlugin(deps), '/api/trips');
      const res = await app.inject({ method: 'POST', url: '/api/trips/trip-1/invite', payload: { email: 'a@b.com' } });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual(expect.objectContaining({ success: true, pending: true }));
    });

    it('returns user info when user was added directly', async () => {
      const deps = makeDefaultDeps({
        inviteMember: vi.fn().mockResolvedValue({ type: 'user_added', userId: 'u2', userName: 'Bob', userEmail: 'bob@example.com', userImage: null, memberId: 'm1', memberName: 'Bob', memberColor: '#aaa' }),
      });
      app = await buildTestApp(createTripsPlugin(deps), '/api/trips');
      const res = await app.inject({ method: 'POST', url: '/api/trips/trip-1/invite', payload: { email: 'bob@example.com' } });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual(expect.objectContaining({ success: true, message: 'User added to trip' }));
    });
  });

  describe('DELETE /:id/collaborators/:memberId', () => {
    it('returns 403 when not the owner', async () => {
      const deps = makeDefaultDeps({ removeCollaborator: vi.fn().mockResolvedValue({ type: 'error', reason: 'forbidden' }) });
      app = await buildTestApp(createTripsPlugin(deps), '/api/trips');
      const res = await app.inject({ method: 'DELETE', url: '/api/trips/trip-1/collaborators/tm-1' });
      expect(res.statusCode).toBe(403);
    });

    it('returns 404 when the collaborator is not found', async () => {
      const deps = makeDefaultDeps({ removeCollaborator: vi.fn().mockResolvedValue({ type: 'error', reason: 'not_found' }) });
      app = await buildTestApp(createTripsPlugin(deps), '/api/trips');
      const res = await app.inject({ method: 'DELETE', url: '/api/trips/trip-1/collaborators/tm-1' });
      expect(res.statusCode).toBe(404);
    });

    it('returns 200 when removal succeeds', async () => {
      const deps = makeDefaultDeps({ removeCollaborator: vi.fn().mockResolvedValue({ type: 'success' }) });
      app = await buildTestApp(createTripsPlugin(deps), '/api/trips');
      const res = await app.inject({ method: 'DELETE', url: '/api/trips/trip-1/collaborators/tm-1' });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({ success: true });
    });
  });

  describe('POST /join/:token', () => {
    it('returns 429 when rate limited', async () => {
      const deps = makeDefaultDeps({ authRateLimiter: makeMockRateLimiter(false) });
      app = await buildTestApp(createTripsPlugin(deps), '/api/trips');
      const res = await app.inject({ method: 'POST', url: '/api/trips/join/token-1' });
      expect(res.statusCode).toBe(429);
    });

    it('returns 404 for an invalid token', async () => {
      const deps = makeDefaultDeps({ joinTrip: vi.fn().mockResolvedValue({ type: 'error', reason: 'not_found' }) });
      app = await buildTestApp(createTripsPlugin(deps), '/api/trips');
      const res = await app.inject({ method: 'POST', url: '/api/trips/join/token-1' });
      expect(res.statusCode).toBe(404);
    });

    it('returns 400 for an expired invitation', async () => {
      const deps = makeDefaultDeps({ joinTrip: vi.fn().mockResolvedValue({ type: 'error', reason: 'expired' }) });
      app = await buildTestApp(createTripsPlugin(deps), '/api/trips');
      const res = await app.inject({ method: 'POST', url: '/api/trips/join/token-1' });
      expect(res.statusCode).toBe(400);
      expect(res.json().error).toBe('Invitation expired');
    });

    it('returns 200 and tripId on success', async () => {
      const deps = makeDefaultDeps({ joinTrip: vi.fn().mockResolvedValue({ type: 'success', tripId: 'trip-1' }) });
      app = await buildTestApp(createTripsPlugin(deps), '/api/trips');
      const res = await app.inject({ method: 'POST', url: '/api/trips/join/token-1' });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({ success: true, tripId: 'trip-1' });
    });
  });
});
