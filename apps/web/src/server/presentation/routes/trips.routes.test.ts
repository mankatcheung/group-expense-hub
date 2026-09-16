import { describe, it, expect, vi } from 'vitest';
import { createTripRoutes, type TripRouteDeps } from './trips.routes';
import { authedService, ctx, makeLimiter, makeRequest, testUser, unauthedService } from './test-helpers';

function makeDeps(overrides: Partial<TripRouteDeps> = {}): TripRouteDeps {
  return {
    authService: authedService(),
    getTrips: vi.fn().mockResolvedValue([]),
    createTrip: vi.fn(),
    getTrip: vi.fn().mockResolvedValue(null),
    updateTrip: vi.fn(),
    deleteTrip: vi.fn().mockResolvedValue(undefined),
    inviteMember: vi.fn(),
    joinTrip: vi.fn(),
    removeCollaborator: vi.fn(),
    apiRateLimiter: makeLimiter(),
    authRateLimiter: makeLimiter(),
    emailRateLimiter: makeLimiter(),
    ...overrides,
  };
}

const tripCtx = ctx({ id: 'trip-1' });

describe('createTripRoutes', () => {
  describe('list (GET /api/trips)', () => {
    it('returns 401 when not authenticated', async () => {
      const routes = createTripRoutes(makeDeps({ authService: unauthedService() }));
      const res = await routes.list(makeRequest('GET', '/api/trips'));
      expect(res.status).toBe(401);
      expect(await res.json()).toEqual({ error: 'Unauthorized' });
    });

    it('returns formatted trip summaries from the use case', async () => {
      const tripRow = {
        id: 'trip-1', name: 'Bali', createdAt: new Date('2026-01-01T00:00:00.000Z'),
        userId: testUser.id, user: { id: testUser.id, name: testUser.name, email: testUser.email, image: null },
        members: [{ id: 'm1' }], expenses: [{ amount: 10, currency: 'USD' }],
      };
      const routes = createTripRoutes(makeDeps({ getTrips: vi.fn().mockResolvedValue([tripRow]) }));
      const res = await routes.list(makeRequest('GET', '/api/trips'));
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual([
        expect.objectContaining({ id: 'trip-1', isOwner: true, memberCount: 1, expenseCount: 1, totalsByCurrency: { USD: 10 } }),
      ]);
    });
  });

  describe('create (POST /api/trips)', () => {
    const validBody = { id: '11111111-1111-1111-1111-111111111111', name: 'New Trip' };

    it('returns 400 for an invalid body', async () => {
      const routes = createTripRoutes(makeDeps());
      const res = await routes.create(makeRequest('POST', '/api/trips', { id: 'not-a-uuid', name: '' }));
      expect(res.status).toBe(400);
    });

    it('returns 400 for a missing body', async () => {
      const routes = createTripRoutes(makeDeps());
      const res = await routes.create(makeRequest('POST', '/api/trips'));
      expect(res.status).toBe(400);
    });

    it('returns 429 when rate limited', async () => {
      const routes = createTripRoutes(makeDeps({ apiRateLimiter: makeLimiter(false) }));
      const res = await routes.create(makeRequest('POST', '/api/trips', validBody));
      expect(res.status).toBe(429);
    });

    it('creates the trip and returns it', async () => {
      const createTrip = vi.fn().mockResolvedValue({ id: validBody.id, name: validBody.name, createdAt: new Date('2026-01-01') });
      const routes = createTripRoutes(makeDeps({ createTrip }));
      const res = await routes.create(makeRequest('POST', '/api/trips', validBody));
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({
        id: validBody.id, name: validBody.name, members: [], tripMembers: [], expenses: [],
        createdAt: '2026-01-01T00:00:00.000Z', isOwner: true, owner: null,
      });
      expect(createTrip).toHaveBeenCalledWith({ id: validBody.id, name: validBody.name, createdAt: undefined }, testUser.id);
    });
  });

  describe('get (GET /api/trips/:id)', () => {
    it('returns 404 when the use case returns null', async () => {
      const routes = createTripRoutes(makeDeps());
      const res = await routes.get(makeRequest('GET', '/api/trips/trip-1'), tripCtx);
      expect(res.status).toBe(404);
      expect(await res.json()).toEqual({ error: 'Trip not found' });
    });

    it('returns the formatted trip when found', async () => {
      const tripFull = {
        id: 'trip-1', name: 'Bali', createdAt: new Date('2026-01-01'), userId: testUser.id,
        user: { id: testUser.id, name: testUser.name, email: testUser.email, image: null },
        members: [], tripMembers: [], expenses: [],
      };
      const getTrip = vi.fn().mockResolvedValue(tripFull);
      const routes = createTripRoutes(makeDeps({ getTrip }));
      const res = await routes.get(makeRequest('GET', '/api/trips/trip-1'), tripCtx);
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual(expect.objectContaining({ id: 'trip-1', isOwner: true }));
      expect(getTrip).toHaveBeenCalledWith('trip-1', testUser.id);
    });
  });

  describe('update (PUT /api/trips/:id)', () => {
    it('returns 429 when rate limited', async () => {
      const routes = createTripRoutes(makeDeps({ apiRateLimiter: makeLimiter(false) }));
      const res = await routes.update(makeRequest('PUT', '/api/trips/trip-1', { name: 'Renamed' }), tripCtx);
      expect(res.status).toBe(429);
    });

    it('returns 403 when the use case returns forbidden', async () => {
      const routes = createTripRoutes(makeDeps({ updateTrip: vi.fn().mockResolvedValue({ error: 'forbidden' }) }));
      const res = await routes.update(makeRequest('PUT', '/api/trips/trip-1', { name: 'Renamed' }), tripCtx);
      expect(res.status).toBe(403);
      expect(await res.json()).toEqual({ error: 'Not authorized to edit this trip' });
    });

    it('returns 200 with the updated trip', async () => {
      const updateTrip = vi.fn().mockResolvedValue({ id: 'trip-1', name: 'Renamed', createdAt: new Date('2026-01-01') });
      const routes = createTripRoutes(makeDeps({ updateTrip }));
      const res = await routes.update(makeRequest('PUT', '/api/trips/trip-1', { name: 'Renamed' }), tripCtx);
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ id: 'trip-1', name: 'Renamed', createdAt: '2026-01-01T00:00:00.000Z' });
      expect(updateTrip).toHaveBeenCalledWith('trip-1', 'Renamed', testUser.id);
    });
  });

  describe('remove (DELETE /api/trips/:id)', () => {
    it('returns 429 when rate limited', async () => {
      const routes = createTripRoutes(makeDeps({ apiRateLimiter: makeLimiter(false) }));
      const res = await routes.remove(makeRequest('DELETE', '/api/trips/trip-1'), tripCtx);
      expect(res.status).toBe(429);
    });

    it('deletes the trip and returns success', async () => {
      const deleteTrip = vi.fn().mockResolvedValue(undefined);
      const routes = createTripRoutes(makeDeps({ deleteTrip }));
      const res = await routes.remove(makeRequest('DELETE', '/api/trips/trip-1'), tripCtx);
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ success: true });
      expect(deleteTrip).toHaveBeenCalledWith('trip-1', testUser.id);
    });
  });

  describe('invite (POST /api/trips/:id/invite)', () => {
    const invite = (deps: Partial<TripRouteDeps>, body: unknown = { email: 'a@b.com' }) =>
      createTripRoutes(makeDeps(deps)).invite(makeRequest('POST', '/api/trips/trip-1/invite', body), tripCtx);

    it('returns 400 for an invalid body', async () => {
      expect((await invite({}, { email: 'not-an-email' })).status).toBe(400);
    });

    it('returns 429 when email rate limited', async () => {
      expect((await invite({ emailRateLimiter: makeLimiter(false) })).status).toBe(429);
    });

    it.each([
      ['forbidden', 403, 'Only the owner can invite members'],
      ['trip_not_found', 404, 'Trip not found'],
      ['already_member', 400, 'User is already a member'],
      ['self_invite', 400, 'Cannot invite yourself'],
    ])('maps error reason %s to %i', async (reason, status, message) => {
      const res = await invite({ inviteMember: vi.fn().mockResolvedValue({ type: 'error', reason }) });
      expect(res.status).toBe(status);
      expect(await res.json()).toEqual({ error: message });
    });

    it('returns pending=true when an invitation was already sent', async () => {
      const res = await invite({ inviteMember: vi.fn().mockResolvedValue({ type: 'already_sent' }) });
      expect(await res.json()).toEqual({ success: true, message: 'Invitation already sent', pending: true });
    });

    it('returns pending=true when an invitation is sent', async () => {
      const res = await invite({ inviteMember: vi.fn().mockResolvedValue({ type: 'invitation_sent', email: 'a@b.com' }) });
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ success: true, message: 'Invitation sent to a@b.com', pending: true });
    });

    it('returns user and member info when the user was added directly', async () => {
      const res = await invite(
        { inviteMember: vi.fn().mockResolvedValue({ type: 'user_added', userId: 'u2', userName: 'Bob', userEmail: 'bob@example.com', userImage: null, memberId: 'm1', memberName: 'Bob', memberColor: '#aaa' }) },
        { email: 'bob@example.com' }
      );
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({
        success: true,
        message: 'User added to trip',
        user: { id: 'u2', name: 'Bob', email: 'bob@example.com', image: null },
        member: { id: 'm1', name: 'Bob', color: '#aaa' },
      });
    });
  });

  describe('removeCollaborator (DELETE /api/trips/:id/collaborators/:memberId)', () => {
    const remove = (deps: Partial<TripRouteDeps>) =>
      createTripRoutes(makeDeps(deps)).removeCollaborator(
        makeRequest('DELETE', '/api/trips/trip-1/collaborators/tm-1'),
        ctx({ id: 'trip-1', memberId: 'tm-1' })
      );

    it('returns 403 when not the owner', async () => {
      const res = await remove({ removeCollaborator: vi.fn().mockResolvedValue({ type: 'error', reason: 'forbidden' }) });
      expect(res.status).toBe(403);
      expect(await res.json()).toEqual({ error: 'Only the owner can remove members' });
    });

    it('returns 404 when the collaborator is not found', async () => {
      const res = await remove({ removeCollaborator: vi.fn().mockResolvedValue({ type: 'error', reason: 'not_found' }) });
      expect(res.status).toBe(404);
    });

    it('returns 200 when removal succeeds', async () => {
      const removeCollaborator = vi.fn().mockResolvedValue({ type: 'success' });
      const res = await remove({ removeCollaborator });
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ success: true });
      expect(removeCollaborator).toHaveBeenCalledWith('trip-1', 'tm-1', testUser.id);
    });
  });

  describe('join (POST /api/trips/join/:token)', () => {
    const join = (deps: Partial<TripRouteDeps>) =>
      createTripRoutes(makeDeps(deps)).join(makeRequest('POST', '/api/trips/join/token-1'), ctx({ token: 'token-1' }));

    it('returns 429 when auth rate limited', async () => {
      expect((await join({ authRateLimiter: makeLimiter(false) })).status).toBe(429);
    });

    it.each([
      ['not_found', 404, 'Invalid invitation'],
      ['expired', 400, 'Invitation expired'],
      ['already_used', 400, 'Invitation already used'],
      ['already_member', 400, 'Already a member'],
    ])('maps error reason %s to %i', async (reason, status, message) => {
      const res = await join({ joinTrip: vi.fn().mockResolvedValue({ type: 'error', reason }) });
      expect(res.status).toBe(status);
      expect(await res.json()).toEqual({ error: message });
    });

    it('returns 200 and tripId on success, without needing a request body', async () => {
      const joinTrip = vi.fn().mockResolvedValue({ type: 'success', tripId: 'trip-1' });
      const res = await join({ joinTrip });
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ success: true, tripId: 'trip-1' });
      expect(joinTrip).toHaveBeenCalledWith('token-1', testUser.id);
    });
  });
});
