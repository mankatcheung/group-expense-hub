import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildTestApp } from '../test/test-app.js';
import membersRouter from './members.js';
import { prisma } from '../auth.js';
import { getUserFromRequest } from '../lib/get-session.js';
import { canEditTrip } from './trips.js';
import { rateLimit } from '../plugins/ratelimit.js';

vi.mock('../auth.js', () => ({
  prisma: {
    member: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    expense: {
      count: vi.fn(),
    },
  },
}));

vi.mock('../lib/get-session.js', () => ({
  getUserFromRequest: vi.fn(),
}));

vi.mock('./trips.js', () => ({
  canEditTrip: vi.fn(),
}));

vi.mock('../plugins/ratelimit.js', () => ({
  rateLimit: {
    api: { limit: vi.fn() },
  },
}));

const user = { id: 'user-1', name: 'Test User', email: 'test@example.com', image: null };

describe('membersRouter', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    vi.resetAllMocks();
    vi.mocked(getUserFromRequest).mockResolvedValue(user as never);
    vi.mocked(rateLimit.api.limit).mockResolvedValue({ success: true, remaining: 99, reset: 0 });
    app = await buildTestApp(membersRouter, '/api/trips');
  });

  afterAll(async () => {
    await app?.close();
  });

  describe('POST /:id/members', () => {
    const validBody = { id: '11111111-1111-1111-1111-111111111111', name: 'Alice', color: '#EF4444' };

    it('returns 400 for an invalid body', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/trips/trip-1/members',
        payload: { id: 'not-a-uuid', name: '', color: 'red' },
      });

      expect(res.statusCode).toBe(400);
    });

    it('returns 429 when rate limited', async () => {
      vi.mocked(rateLimit.api.limit).mockResolvedValue({ success: false, remaining: 0, reset: 0 });

      const res = await app.inject({
        method: 'POST',
        url: '/api/trips/trip-1/members',
        payload: validBody,
      });

      expect(res.statusCode).toBe(429);
    });

    it('returns 403 when the user cannot edit the trip', async () => {
      vi.mocked(canEditTrip).mockResolvedValue(false);

      const res = await app.inject({
        method: 'POST',
        url: '/api/trips/trip-1/members',
        payload: validBody,
      });

      expect(res.statusCode).toBe(403);
    });

    it('creates the member when authorized', async () => {
      vi.mocked(canEditTrip).mockResolvedValue(true);
      vi.mocked(prisma.member.create).mockResolvedValue({ ...validBody, tripId: 'trip-1' } as never);

      const res = await app.inject({
        method: 'POST',
        url: '/api/trips/trip-1/members',
        payload: validBody,
      });

      expect(res.statusCode).toBe(200);
      expect(prisma.member.create).toHaveBeenCalledWith({
        data: { id: validBody.id, name: validBody.name, color: validBody.color, tripId: 'trip-1' },
      });
    });
  });

  describe('PUT /:id/members/:memberId', () => {
    it('returns 403 when the user cannot edit the trip', async () => {
      vi.mocked(canEditTrip).mockResolvedValue(false);

      const res = await app.inject({
        method: 'PUT',
        url: '/api/trips/trip-1/members/member-1',
        payload: { name: 'New Name' },
      });

      expect(res.statusCode).toBe(403);
    });

    it('returns 404 when the member does not belong to the trip', async () => {
      vi.mocked(canEditTrip).mockResolvedValue(true);
      vi.mocked(prisma.member.findUnique).mockResolvedValue({
        id: 'member-1',
        tripId: 'other-trip',
      } as never);

      const res = await app.inject({
        method: 'PUT',
        url: '/api/trips/trip-1/members/member-1',
        payload: { name: 'New Name' },
      });

      expect(res.statusCode).toBe(404);
    });

    it('returns 404 when the member does not exist', async () => {
      vi.mocked(canEditTrip).mockResolvedValue(true);
      vi.mocked(prisma.member.findUnique).mockResolvedValue(null);

      const res = await app.inject({
        method: 'PUT',
        url: '/api/trips/trip-1/members/member-1',
        payload: { name: 'New Name' },
      });

      expect(res.statusCode).toBe(404);
    });

    it('updates the member when authorized and found', async () => {
      vi.mocked(canEditTrip).mockResolvedValue(true);
      vi.mocked(prisma.member.findUnique).mockResolvedValue({
        id: 'member-1',
        tripId: 'trip-1',
      } as never);
      vi.mocked(prisma.member.update).mockResolvedValue({
        id: 'member-1',
        name: 'New Name',
      } as never);

      const res = await app.inject({
        method: 'PUT',
        url: '/api/trips/trip-1/members/member-1',
        payload: { name: 'New Name' },
      });

      expect(res.statusCode).toBe(200);
      expect(prisma.member.update).toHaveBeenCalledWith({
        where: { id: 'member-1' },
        data: { name: 'New Name' },
      });
    });
  });

  describe('DELETE /:id/members/:memberId', () => {
    it('returns 403 when the user cannot edit the trip', async () => {
      vi.mocked(canEditTrip).mockResolvedValue(false);

      const res = await app.inject({
        method: 'DELETE',
        url: '/api/trips/trip-1/members/member-1',
      });

      expect(res.statusCode).toBe(403);
    });

    it('returns 404 when the member does not belong to the trip', async () => {
      vi.mocked(canEditTrip).mockResolvedValue(true);
      vi.mocked(prisma.member.findUnique).mockResolvedValue({
        id: 'member-1',
        tripId: 'other-trip',
      } as never);

      const res = await app.inject({
        method: 'DELETE',
        url: '/api/trips/trip-1/members/member-1',
      });

      expect(res.statusCode).toBe(404);
    });

    it('refuses to delete a member with expenses and reports the count', async () => {
      vi.mocked(canEditTrip).mockResolvedValue(true);
      vi.mocked(prisma.member.findUnique).mockResolvedValue({
        id: 'member-1',
        tripId: 'trip-1',
        name: 'Alice',
      } as never);
      vi.mocked(prisma.expense.count).mockResolvedValue(3);

      const res = await app.inject({
        method: 'DELETE',
        url: '/api/trips/trip-1/members/member-1',
      });

      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({ error: 'Member has expenses', expenseCount: 3, memberName: 'Alice' });
      expect(prisma.member.delete).not.toHaveBeenCalled();
    });

    it('deletes the member when there are no expenses', async () => {
      vi.mocked(canEditTrip).mockResolvedValue(true);
      vi.mocked(prisma.member.findUnique).mockResolvedValue({
        id: 'member-1',
        tripId: 'trip-1',
        name: 'Alice',
      } as never);
      vi.mocked(prisma.expense.count).mockResolvedValue(0);
      vi.mocked(prisma.member.delete).mockResolvedValue({} as never);

      const res = await app.inject({
        method: 'DELETE',
        url: '/api/trips/trip-1/members/member-1',
      });

      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({ success: true });
      expect(prisma.member.delete).toHaveBeenCalledWith({ where: { id: 'member-1' } });
    });
  });
});
