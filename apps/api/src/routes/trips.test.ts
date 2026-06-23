import { describe, it, expect, vi, beforeEach, afterAll, type Mock } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildTestApp } from '../test/test-app.js';
import tripsRouter, { getTripAccessLevel, canEditTrip } from './trips.js';
import { prisma } from '../auth.js';
import { getUserFromRequest } from '../lib/get-session.js';
import { rateLimit } from '../plugins/ratelimit.js';
import { sendTripInvitationEmail, sendTripAddedNotification } from '../services/email.js';

vi.mock('../auth.js', () => ({
  prisma: {
    trip: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    tripMember: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    tripInvitation: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
    },
    member: {
      create: vi.fn(),
      deleteMany: vi.fn(),
      findMany: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
  },
}));

vi.mock('../lib/get-session.js', () => ({
  getUserFromRequest: vi.fn(),
}));

vi.mock('../plugins/ratelimit.js', () => ({
  rateLimit: {
    auth: { limit: vi.fn() },
    api: { limit: vi.fn() },
    email: { limit: vi.fn() },
  },
}));

vi.mock('../services/email.js', () => ({
  sendTripInvitationEmail: vi.fn(),
  sendTripAddedNotification: vi.fn(),
  getAppUrl: vi.fn(() => 'https://app.example.com'),
}));

const user = { id: 'user-1', name: 'Test User', email: 'test@example.com', image: null };

describe('getTripAccessLevel', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns null when the trip does not exist', async () => {
    vi.mocked(prisma.trip.findUnique).mockResolvedValue(null);

    const access = await getTripAccessLevel('trip-1', 'user-1');

    expect(access).toBeNull();
  });

  it('returns owner when the user owns the trip', async () => {
    vi.mocked(prisma.trip.findUnique).mockResolvedValue({
      userId: 'user-1',
      tripMembers: [],
    } as never);

    const access = await getTripAccessLevel('trip-1', 'user-1');

    expect(access).toBe('owner');
  });

  it('returns collaborator when the user is a trip member but not the owner', async () => {
    vi.mocked(prisma.trip.findUnique).mockResolvedValue({
      userId: 'owner-1',
      tripMembers: [{ id: 'tm-1' }],
    } as never);

    const access = await getTripAccessLevel('trip-1', 'user-2');

    expect(access).toBe('collaborator');
  });

  it('returns null when the user is neither the owner nor a member', async () => {
    vi.mocked(prisma.trip.findUnique).mockResolvedValue({
      userId: 'owner-1',
      tripMembers: [],
    } as never);

    const access = await getTripAccessLevel('trip-1', 'stranger');

    expect(access).toBeNull();
  });
});

describe('canEditTrip', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns true for the owner', async () => {
    vi.mocked(prisma.trip.findUnique).mockResolvedValue({
      userId: 'user-1',
      tripMembers: [],
    } as never);

    await expect(canEditTrip('trip-1', 'user-1')).resolves.toBe(true);
  });

  it('returns true for a collaborator', async () => {
    vi.mocked(prisma.trip.findUnique).mockResolvedValue({
      userId: 'owner-1',
      tripMembers: [{ id: 'tm-1' }],
    } as never);

    await expect(canEditTrip('trip-1', 'user-2')).resolves.toBe(true);
  });

  it('returns false for an unrelated user', async () => {
    vi.mocked(prisma.trip.findUnique).mockResolvedValue({
      userId: 'owner-1',
      tripMembers: [],
    } as never);

    await expect(canEditTrip('trip-1', 'stranger')).resolves.toBe(false);
  });

  it('returns false when the trip does not exist', async () => {
    vi.mocked(prisma.trip.findUnique).mockResolvedValue(null);

    await expect(canEditTrip('missing-trip', 'user-1')).resolves.toBe(false);
  });
});

describe('tripsRouter', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    vi.resetAllMocks();
    vi.mocked(getUserFromRequest).mockResolvedValue(user as never);
    vi.mocked(rateLimit.auth.limit).mockResolvedValue({ success: true, remaining: 19, reset: 0 });
    vi.mocked(rateLimit.api.limit).mockResolvedValue({ success: true, remaining: 99, reset: 0 });
    vi.mocked(rateLimit.email.limit).mockResolvedValue({ success: true, remaining: 4, reset: 0 });
    (prisma.$transaction as unknown as Mock).mockImplementation((values: readonly unknown[]) =>
      Promise.all(values)
    );
    app = await buildTestApp(tripsRouter, '/api/trips');
  });

  afterAll(async () => {
    await app?.close();
  });

  describe('GET /', () => {
    it('returns owned and collaborator trips, formatted as summaries', async () => {
      const ownedTrip = {
        id: 'trip-1',
        name: 'Bali',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        userId: user.id,
        user: { id: user.id, name: user.name, email: user.email, image: null },
        members: [{ id: 'm1' }],
        expenses: [{ amount: 10, currency: 'USD' }],
      };
      const collabTrip = {
        id: 'trip-2',
        name: 'Tokyo',
        createdAt: new Date('2026-02-01T00:00:00.000Z'),
        userId: 'owner-2',
        user: { id: 'owner-2', name: 'Owner Two', email: 'owner2@example.com', image: null },
        members: [],
        expenses: [],
      };

      vi.mocked(prisma.trip.findMany).mockResolvedValueOnce([ownedTrip] as never);
      vi.mocked(prisma.tripMember.findMany).mockResolvedValue([{ tripId: 'trip-2' }] as never);
      vi.mocked(prisma.trip.findMany).mockResolvedValueOnce([collabTrip] as never);

      const res = await app.inject({ method: 'GET', url: '/api/trips' });

      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual([
        expect.objectContaining({ id: 'trip-1', isOwner: true, memberCount: 1, expenseCount: 1 }),
        expect.objectContaining({ id: 'trip-2', isOwner: false, memberCount: 0, expenseCount: 0 }),
      ]);
    });
  });

  describe('POST /', () => {
    const validBody = { id: '11111111-1111-1111-1111-111111111111', name: 'New Trip' };

    it('returns 400 for an invalid body', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/trips',
        payload: { id: 'not-a-uuid', name: '' },
      });

      expect(res.statusCode).toBe(400);
    });

    it('returns 429 when rate limited', async () => {
      vi.mocked(rateLimit.api.limit).mockResolvedValue({ success: false, remaining: 0, reset: 0 });

      const res = await app.inject({ method: 'POST', url: '/api/trips', payload: validBody });

      expect(res.statusCode).toBe(429);
    });

    it('creates the trip and returns it with the creator as owner', async () => {
      vi.mocked(prisma.trip.create).mockResolvedValue({
        id: validBody.id,
        name: validBody.name,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      } as never);

      const res = await app.inject({ method: 'POST', url: '/api/trips', payload: validBody });

      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual(
        expect.objectContaining({ id: validBody.id, name: validBody.name, isOwner: true, owner: null })
      );
      expect(prisma.trip.create).toHaveBeenCalledWith({
        data: { id: validBody.id, name: validBody.name, createdAt: undefined, userId: user.id },
      });
    });
  });

  describe('GET /:id', () => {
    it('returns 404 when the user has no access', async () => {
      vi.mocked(prisma.trip.findUnique).mockResolvedValue(null);

      const res = await app.inject({ method: 'GET', url: '/api/trips/trip-1' });

      expect(res.statusCode).toBe(404);
    });

    it('returns the formatted trip when access is granted', async () => {
      vi.mocked(prisma.trip.findUnique)
        .mockResolvedValueOnce({ userId: user.id, tripMembers: [] } as never)
        .mockResolvedValueOnce({
          id: 'trip-1',
          name: 'Bali',
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          userId: user.id,
          user: { id: user.id, name: user.name, email: user.email, image: null },
          members: [],
          tripMembers: [],
          expenses: [],
        } as never);

      const res = await app.inject({ method: 'GET', url: '/api/trips/trip-1' });

      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual(
        expect.objectContaining({ id: 'trip-1', name: 'Bali', isOwner: true })
      );
    });
  });

  describe('PUT /:id', () => {
    it('returns 429 when rate limited', async () => {
      vi.mocked(rateLimit.api.limit).mockResolvedValue({ success: false, remaining: 0, reset: 0 });

      const res = await app.inject({
        method: 'PUT',
        url: '/api/trips/trip-1',
        payload: { name: 'Renamed' },
      });

      expect(res.statusCode).toBe(429);
    });

    it('returns 403 when the user cannot edit the trip', async () => {
      vi.mocked(prisma.trip.findUnique).mockResolvedValue({
        userId: 'owner-1',
        tripMembers: [],
      } as never);

      const res = await app.inject({
        method: 'PUT',
        url: '/api/trips/trip-1',
        payload: { name: 'Renamed' },
      });

      expect(res.statusCode).toBe(403);
    });

    it('updates the trip name when authorized', async () => {
      vi.mocked(prisma.trip.findUnique).mockResolvedValue({
        userId: user.id,
        tripMembers: [],
      } as never);
      vi.mocked(prisma.trip.update).mockResolvedValue({ id: 'trip-1', name: 'Renamed' } as never);

      const res = await app.inject({
        method: 'PUT',
        url: '/api/trips/trip-1',
        payload: { name: 'Renamed' },
      });

      expect(res.statusCode).toBe(200);
      expect(prisma.trip.update).toHaveBeenCalledWith({
        where: { id: 'trip-1' },
        data: { name: 'Renamed' },
      });
    });
  });

  describe('DELETE /:id', () => {
    it('returns 429 when rate limited', async () => {
      vi.mocked(rateLimit.api.limit).mockResolvedValue({ success: false, remaining: 0, reset: 0 });

      const res = await app.inject({ method: 'DELETE', url: '/api/trips/trip-1' });

      expect(res.statusCode).toBe(429);
    });

    it('deletes the trip scoped to the requesting user', async () => {
      vi.mocked(prisma.trip.delete).mockResolvedValue({} as never);

      const res = await app.inject({ method: 'DELETE', url: '/api/trips/trip-1' });

      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({ success: true });
      expect(prisma.trip.delete).toHaveBeenCalledWith({ where: { id: 'trip-1', userId: user.id } });
    });
  });

  describe('POST /:id/invite', () => {
    const validBody = { email: 'invitee@example.com' };

    it('returns 400 for an invalid body', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/trips/trip-1/invite',
        payload: { email: 'not-an-email' },
      });

      expect(res.statusCode).toBe(400);
    });

    it('returns 429 when rate limited', async () => {
      vi.mocked(rateLimit.email.limit).mockResolvedValue({ success: false, remaining: 0, reset: 0 });

      const res = await app.inject({
        method: 'POST',
        url: '/api/trips/trip-1/invite',
        payload: validBody,
      });

      expect(res.statusCode).toBe(429);
    });

    it('returns 403 when the requester is not the owner', async () => {
      vi.mocked(prisma.trip.findUnique).mockResolvedValue({
        userId: 'owner-1',
        tripMembers: [{ id: 'tm-1' }],
      } as never);

      const res = await app.inject({
        method: 'POST',
        url: '/api/trips/trip-1/invite',
        payload: validBody,
      });

      expect(res.statusCode).toBe(403);
    });

    it('returns 404 when the trip does not exist', async () => {
      vi.mocked(prisma.trip.findUnique)
        .mockResolvedValueOnce({ userId: user.id, tripMembers: [] } as never)
        .mockResolvedValueOnce(null);

      const res = await app.inject({
        method: 'POST',
        url: '/api/trips/trip-1/invite',
        payload: validBody,
      });

      expect(res.statusCode).toBe(404);
    });

    it('sends an email invitation when the invitee has no account yet', async () => {
      vi.mocked(prisma.trip.findUnique)
        .mockResolvedValueOnce({ userId: user.id, tripMembers: [] } as never)
        .mockResolvedValueOnce({ name: 'Bali', user: { name: user.name, email: user.email } } as never);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.tripInvitation.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.tripInvitation.upsert).mockResolvedValue({} as never);

      const res = await app.inject({
        method: 'POST',
        url: '/api/trips/trip-1/invite',
        payload: validBody,
      });

      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({
        success: true,
        message: `Invitation sent to ${validBody.email}`,
        pending: true,
      });
      expect(sendTripInvitationEmail).toHaveBeenCalledWith(
        expect.objectContaining({ to: validBody.email, tripName: 'Bali' })
      );
    });

    it('reports an already-pending invitation without re-sending', async () => {
      vi.mocked(prisma.trip.findUnique)
        .mockResolvedValueOnce({ userId: user.id, tripMembers: [] } as never)
        .mockResolvedValueOnce({ name: 'Bali', user: { name: user.name, email: user.email } } as never);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.tripInvitation.findUnique).mockResolvedValue({
        expiresAt: new Date(Date.now() + 60_000),
      } as never);

      const res = await app.inject({
        method: 'POST',
        url: '/api/trips/trip-1/invite',
        payload: validBody,
      });

      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({ success: true, message: 'Invitation already sent', pending: true });
      expect(sendTripInvitationEmail).not.toHaveBeenCalled();
    });

    it('returns 400 when the invitee is already a member', async () => {
      vi.mocked(prisma.trip.findUnique)
        .mockResolvedValueOnce({ userId: user.id, tripMembers: [] } as never)
        .mockResolvedValueOnce({ name: 'Bali', user: { name: user.name, email: user.email } } as never);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'invitee-1',
        name: 'Invitee',
        email: validBody.email,
      } as never);
      vi.mocked(prisma.tripMember.findUnique).mockResolvedValue({ id: 'tm-existing' } as never);

      const res = await app.inject({
        method: 'POST',
        url: '/api/trips/trip-1/invite',
        payload: validBody,
      });

      expect(res.statusCode).toBe(400);
      expect(res.json()).toEqual({ error: 'User is already a member' });
    });

    it('returns 400 when inviting yourself', async () => {
      vi.mocked(prisma.trip.findUnique)
        .mockResolvedValueOnce({ userId: user.id, tripMembers: [] } as never)
        .mockResolvedValueOnce({ name: 'Bali', user: { name: user.name, email: user.email } } as never);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: user.id,
        name: user.name,
        email: validBody.email,
      } as never);
      vi.mocked(prisma.tripMember.findUnique).mockResolvedValue(null);

      const res = await app.inject({
        method: 'POST',
        url: '/api/trips/trip-1/invite',
        payload: validBody,
      });

      expect(res.statusCode).toBe(400);
      expect(res.json()).toEqual({ error: 'Cannot invite yourself' });
    });

    it('adds an existing user directly as a collaborator', async () => {
      vi.mocked(prisma.trip.findUnique)
        .mockResolvedValueOnce({ userId: user.id, tripMembers: [] } as never)
        .mockResolvedValueOnce({ name: 'Bali', user: { name: user.name, email: user.email } } as never);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'invitee-1',
        name: 'Invitee',
        email: validBody.email,
        image: null,
      } as never);
      vi.mocked(prisma.tripMember.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.tripMember.create).mockResolvedValue({} as never);
      vi.mocked(prisma.member.create).mockResolvedValue({
        id: 'member-1',
        name: 'Invitee',
        color: '#EF4444',
      } as never);

      const res = await app.inject({
        method: 'POST',
        url: '/api/trips/trip-1/invite',
        payload: validBody,
      });

      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({
        success: true,
        message: 'User added to trip',
        user: { id: 'invitee-1', name: 'Invitee', email: validBody.email, image: null },
        member: { id: 'member-1', name: 'Invitee', color: '#EF4444' },
      });
      expect(sendTripAddedNotification).toHaveBeenCalledWith(
        expect.objectContaining({ to: validBody.email, tripName: 'Bali' })
      );
    });
  });

  describe('DELETE /:id/collaborators/:memberId', () => {
    it('returns 403 when the requester is not the owner', async () => {
      vi.mocked(prisma.trip.findUnique).mockResolvedValue({
        userId: 'owner-1',
        tripMembers: [{ id: 'tm-1' }],
      } as never);

      const res = await app.inject({
        method: 'DELETE',
        url: '/api/trips/trip-1/collaborators/tm-1',
      });

      expect(res.statusCode).toBe(403);
    });

    it('returns 404 when the collaborator does not exist', async () => {
      vi.mocked(prisma.trip.findUnique).mockResolvedValue({
        userId: user.id,
        tripMembers: [],
      } as never);
      vi.mocked(prisma.tripMember.findUnique).mockResolvedValue(null);

      const res = await app.inject({
        method: 'DELETE',
        url: '/api/trips/trip-1/collaborators/tm-1',
      });

      expect(res.statusCode).toBe(404);
    });

    it('removes the collaborator and their derived member record', async () => {
      vi.mocked(prisma.trip.findUnique).mockResolvedValue({
        userId: user.id,
        tripMembers: [],
      } as never);
      vi.mocked(prisma.tripMember.findUnique).mockResolvedValue({
        user: { name: 'Collaborator', email: 'collab@example.com' },
      } as never);
      vi.mocked(prisma.tripMember.delete).mockResolvedValue({} as never);
      vi.mocked(prisma.member.deleteMany).mockResolvedValue({ count: 1 } as never);

      const res = await app.inject({
        method: 'DELETE',
        url: '/api/trips/trip-1/collaborators/tm-1',
      });

      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({ success: true });
      expect(prisma.tripMember.delete).toHaveBeenCalledWith({ where: { id: 'tm-1' } });
    });
  });

  describe('POST /join/:token', () => {
    const baseInvitation = {
      id: 'inv-1',
      tripId: 'trip-1',
      status: 'pending',
      expiresAt: new Date(Date.now() + 60_000),
      role: 'collaborator',
    };

    it('returns 429 when rate limited', async () => {
      vi.mocked(rateLimit.auth.limit).mockResolvedValue({ success: false, remaining: 0, reset: 0 });

      const res = await app.inject({ method: 'POST', url: '/api/trips/join/token-1' });

      expect(res.statusCode).toBe(429);
    });

    it('returns 404 for an invalid token', async () => {
      vi.mocked(prisma.tripInvitation.findUnique).mockResolvedValue(null);

      const res = await app.inject({ method: 'POST', url: '/api/trips/join/token-1' });

      expect(res.statusCode).toBe(404);
    });

    it('returns 400 when the invitation has expired', async () => {
      vi.mocked(prisma.tripInvitation.findUnique).mockResolvedValue({
        ...baseInvitation,
        expiresAt: new Date(Date.now() - 60_000),
      } as never);

      const res = await app.inject({ method: 'POST', url: '/api/trips/join/token-1' });

      expect(res.statusCode).toBe(400);
      expect(res.json()).toEqual({ error: 'Invitation expired' });
    });

    it('returns 400 when the invitation was already used', async () => {
      vi.mocked(prisma.tripInvitation.findUnique).mockResolvedValue({
        ...baseInvitation,
        status: 'accepted',
      } as never);

      const res = await app.inject({ method: 'POST', url: '/api/trips/join/token-1' });

      expect(res.statusCode).toBe(400);
      expect(res.json()).toEqual({ error: 'Invitation already used' });
    });

    it('returns 400 when the user is already a member', async () => {
      vi.mocked(prisma.tripInvitation.findUnique).mockResolvedValue(baseInvitation as never);
      vi.mocked(prisma.tripMember.findUnique).mockResolvedValue({ id: 'tm-1' } as never);

      const res = await app.inject({ method: 'POST', url: '/api/trips/join/token-1' });

      expect(res.statusCode).toBe(400);
      expect(res.json()).toEqual({ error: 'Already a member' });
    });

    it('joins the trip, deduping the member name against existing members', async () => {
      vi.mocked(prisma.tripInvitation.findUnique).mockResolvedValue(baseInvitation as never);
      vi.mocked(prisma.tripMember.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        name: 'Test User',
        email: user.email,
      } as never);
      vi.mocked(prisma.member.findMany).mockResolvedValue([{ name: 'Test User' }] as never);
      vi.mocked(prisma.tripMember.create).mockResolvedValue({} as never);
      vi.mocked(prisma.member.create).mockResolvedValue({} as never);
      vi.mocked(prisma.tripInvitation.update).mockResolvedValue({} as never);

      const res = await app.inject({ method: 'POST', url: '/api/trips/join/token-1' });

      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({ success: true, tripId: 'trip-1' });
      expect(prisma.member.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ name: 'test', tripId: 'trip-1' }),
      });
      expect(prisma.tripInvitation.update).toHaveBeenCalledWith({
        where: { id: 'inv-1' },
        data: { status: 'accepted' },
      });
    });
  });
});
