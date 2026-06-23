import { describe, it, expect, vi, beforeEach, afterAll, type Mock } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildTestApp } from '../test/test-app.js';
import invitationsRouter from './invitations.js';
import { prisma } from '../auth.js';
import { getUserFromRequest } from '../lib/get-session.js';
import { rateLimit } from '../plugins/ratelimit.js';

vi.mock('../auth.js', () => ({
  prisma: {
    tripInvitation: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    tripMember: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    member: {
      create: vi.fn(),
    },
    $transaction: vi.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
  },
}));

vi.mock('../lib/get-session.js', () => ({
  getUserFromRequest: vi.fn(),
}));

vi.mock('../plugins/ratelimit.js', () => ({
  rateLimit: {
    api: { limit: vi.fn() },
  },
}));

const user = { id: 'user-1', name: 'Test User', email: 'test@example.com', image: null };

describe('invitationsRouter', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    vi.resetAllMocks();
    vi.mocked(getUserFromRequest).mockResolvedValue(user as never);
    vi.mocked(rateLimit.api.limit).mockResolvedValue({ success: true, remaining: 99, reset: 0 });
    (prisma.$transaction as unknown as Mock).mockImplementation((values: readonly unknown[]) =>
      Promise.all(values)
    );
    app = await buildTestApp(invitationsRouter, '/api/invitations');
  });

  afterAll(async () => {
    await app?.close();
  });

  describe('GET /', () => {
    it('returns the pending invitations for the user, formatted', async () => {
      vi.mocked(prisma.tripInvitation.findMany).mockResolvedValue([
        {
          id: 'inv-1',
          token: 'token-1',
          tripId: 'trip-1',
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          trip: {
            name: 'Bali',
            user: { id: 'owner-1', name: 'Owner', email: 'owner@example.com', image: null },
          },
        },
      ] as never);

      const res = await app.inject({ method: 'GET', url: '/api/invitations' });

      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual([
        {
          id: 'inv-1',
          token: 'token-1',
          tripId: 'trip-1',
          tripName: 'Bali',
          inviter: { id: 'owner-1', name: 'Owner', email: 'owner@example.com', image: null },
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ]);
      expect(prisma.tripInvitation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { email: user.email, status: 'pending', expiresAt: expect.anything() } })
      );
    });

    it('returns an empty array when there are no pending invitations', async () => {
      vi.mocked(prisma.tripInvitation.findMany).mockResolvedValue([]);

      const res = await app.inject({ method: 'GET', url: '/api/invitations' });

      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual([]);
    });
  });

  describe('POST /:id/accept', () => {
    const baseInvitation = {
      id: 'inv-1',
      tripId: 'trip-1',
      email: user.email,
      role: 'collaborator',
      expiresAt: new Date(Date.now() + 60_000),
      status: 'pending',
    };

    it('returns 429 when rate limited', async () => {
      vi.mocked(rateLimit.api.limit).mockResolvedValue({ success: false, remaining: 0, reset: 0 });

      const res = await app.inject({ method: 'POST', url: '/api/invitations/inv-1/accept' });

      expect(res.statusCode).toBe(429);
    });

    it('returns 404 when the invitation does not exist', async () => {
      vi.mocked(prisma.tripInvitation.findUnique).mockResolvedValue(null);

      const res = await app.inject({ method: 'POST', url: '/api/invitations/inv-1/accept' });

      expect(res.statusCode).toBe(404);
    });

    it('returns 403 when the invitation is for a different email', async () => {
      vi.mocked(prisma.tripInvitation.findUnique).mockResolvedValue({
        ...baseInvitation,
        email: 'someone-else@example.com',
      } as never);

      const res = await app.inject({ method: 'POST', url: '/api/invitations/inv-1/accept' });

      expect(res.statusCode).toBe(403);
    });

    it('returns 400 when the invitation has expired', async () => {
      vi.mocked(prisma.tripInvitation.findUnique).mockResolvedValue({
        ...baseInvitation,
        expiresAt: new Date(Date.now() - 60_000),
      } as never);

      const res = await app.inject({ method: 'POST', url: '/api/invitations/inv-1/accept' });

      expect(res.statusCode).toBe(400);
      expect(res.json()).toEqual({ error: 'Invitation expired' });
    });

    it('returns 400 when the invitation was already used', async () => {
      vi.mocked(prisma.tripInvitation.findUnique).mockResolvedValue({
        ...baseInvitation,
        status: 'accepted',
      } as never);

      const res = await app.inject({ method: 'POST', url: '/api/invitations/inv-1/accept' });

      expect(res.statusCode).toBe(400);
      expect(res.json()).toEqual({ error: 'Invitation already used' });
    });

    it('returns 400 when the user is already a member', async () => {
      vi.mocked(prisma.tripInvitation.findUnique).mockResolvedValue(baseInvitation as never);
      vi.mocked(prisma.tripMember.findUnique).mockResolvedValue({ id: 'tm-1' } as never);

      const res = await app.inject({ method: 'POST', url: '/api/invitations/inv-1/accept' });

      expect(res.statusCode).toBe(400);
      expect(res.json()).toEqual({ error: 'Already a member' });
    });

    it('accepts the invitation, creates a member, and marks it accepted', async () => {
      vi.mocked(prisma.tripInvitation.findUnique).mockResolvedValue(baseInvitation as never);
      vi.mocked(prisma.tripMember.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.tripMember.create).mockResolvedValue({} as never);
      vi.mocked(prisma.member.create).mockResolvedValue({} as never);
      vi.mocked(prisma.tripInvitation.update).mockResolvedValue({} as never);

      const res = await app.inject({ method: 'POST', url: '/api/invitations/inv-1/accept' });

      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({ success: true, tripId: 'trip-1' });
      expect(prisma.tripMember.create).toHaveBeenCalledWith({
        data: { tripId: 'trip-1', userId: user.id, role: 'collaborator' },
      });
      expect(prisma.tripInvitation.update).toHaveBeenCalledWith({
        where: { id: 'inv-1' },
        data: { status: 'accepted' },
      });
    });
  });
});
