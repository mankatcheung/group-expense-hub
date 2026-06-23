import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildTestApp } from '../test/test-app.js';
import expensesRouter from './expenses.js';
import { prisma } from '../auth.js';
import { getUserFromRequest } from '../lib/get-session.js';
import { canEditTrip } from './trips.js';
import { rateLimit } from '../plugins/ratelimit.js';

vi.mock('../auth.js', () => ({
  prisma: {
    expense: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
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

const validExpenseBody = {
  id: '11111111-1111-1111-1111-111111111111',
  description: 'Dinner',
  amount: 42.5,
  currency: 'USD',
  paidBy: '22222222-2222-2222-2222-222222222222',
  splitAmong: ['22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333'],
};

describe('expensesRouter', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    vi.resetAllMocks();
    vi.mocked(getUserFromRequest).mockResolvedValue(user as never);
    vi.mocked(rateLimit.api.limit).mockResolvedValue({ success: true, remaining: 99, reset: 0 });
    app = await buildTestApp(expensesRouter, '/api/trips');
  });

  afterAll(async () => {
    await app?.close();
  });

  describe('POST /:id/expenses', () => {
    it('returns 400 for an invalid body', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/trips/trip-1/expenses',
        payload: { ...validExpenseBody, amount: -5 },
      });

      expect(res.statusCode).toBe(400);
    });

    it('returns 429 when rate limited', async () => {
      vi.mocked(rateLimit.api.limit).mockResolvedValue({ success: false, remaining: 0, reset: 0 });

      const res = await app.inject({
        method: 'POST',
        url: '/api/trips/trip-1/expenses',
        payload: validExpenseBody,
      });

      expect(res.statusCode).toBe(429);
    });

    it('returns 403 when the user cannot edit the trip', async () => {
      vi.mocked(canEditTrip).mockResolvedValue(false);

      const res = await app.inject({
        method: 'POST',
        url: '/api/trips/trip-1/expenses',
        payload: validExpenseBody,
      });

      expect(res.statusCode).toBe(403);
    });

    it('creates the expense with splits when authorized', async () => {
      vi.mocked(canEditTrip).mockResolvedValue(true);
      vi.mocked(prisma.expense.create).mockResolvedValue({} as never);

      const res = await app.inject({
        method: 'POST',
        url: '/api/trips/trip-1/expenses',
        payload: validExpenseBody,
      });

      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({ success: true });
      expect(prisma.expense.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          id: validExpenseBody.id,
          description: validExpenseBody.description,
          amount: validExpenseBody.amount,
          currency: validExpenseBody.currency,
          tripId: 'trip-1',
          paidById: validExpenseBody.paidBy,
          splits: { create: validExpenseBody.splitAmong.map(memberId => ({ memberId })) },
        }),
      });
    });
  });

  describe('PUT /:id/expenses/:expenseId', () => {
    it('returns 403 when the user cannot edit the trip', async () => {
      vi.mocked(canEditTrip).mockResolvedValue(false);

      const res = await app.inject({
        method: 'PUT',
        url: '/api/trips/trip-1/expenses/expense-1',
        payload: validExpenseBody,
      });

      expect(res.statusCode).toBe(403);
    });

    it('returns 404 when the expense does not belong to the trip', async () => {
      vi.mocked(canEditTrip).mockResolvedValue(true);
      vi.mocked(prisma.expense.findUnique).mockResolvedValue({
        id: 'expense-1',
        tripId: 'other-trip',
      } as never);

      const res = await app.inject({
        method: 'PUT',
        url: '/api/trips/trip-1/expenses/expense-1',
        payload: validExpenseBody,
      });

      expect(res.statusCode).toBe(404);
    });

    it('returns 404 when the expense does not exist', async () => {
      vi.mocked(canEditTrip).mockResolvedValue(true);
      vi.mocked(prisma.expense.findUnique).mockResolvedValue(null);

      const res = await app.inject({
        method: 'PUT',
        url: '/api/trips/trip-1/expenses/expense-1',
        payload: validExpenseBody,
      });

      expect(res.statusCode).toBe(404);
    });

    it('updates the expense, replacing splits, when authorized and found', async () => {
      vi.mocked(canEditTrip).mockResolvedValue(true);
      vi.mocked(prisma.expense.findUnique).mockResolvedValue({
        id: 'expense-1',
        tripId: 'trip-1',
      } as never);
      vi.mocked(prisma.expense.update).mockResolvedValue({} as never);

      const res = await app.inject({
        method: 'PUT',
        url: '/api/trips/trip-1/expenses/expense-1',
        payload: validExpenseBody,
      });

      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({ success: true });
      expect(prisma.expense.update).toHaveBeenCalledWith({
        where: { id: 'expense-1' },
        data: expect.objectContaining({
          splits: {
            deleteMany: {},
            create: validExpenseBody.splitAmong.map(memberId => ({ memberId })),
          },
        }),
      });
    });
  });

  describe('DELETE /:id/expenses/:expenseId', () => {
    it('returns 403 when the user cannot edit the trip', async () => {
      vi.mocked(canEditTrip).mockResolvedValue(false);

      const res = await app.inject({
        method: 'DELETE',
        url: '/api/trips/trip-1/expenses/expense-1',
      });

      expect(res.statusCode).toBe(403);
    });

    it('returns 404 when the expense does not belong to the trip', async () => {
      vi.mocked(canEditTrip).mockResolvedValue(true);
      vi.mocked(prisma.expense.findUnique).mockResolvedValue({
        id: 'expense-1',
        tripId: 'other-trip',
      } as never);

      const res = await app.inject({
        method: 'DELETE',
        url: '/api/trips/trip-1/expenses/expense-1',
      });

      expect(res.statusCode).toBe(404);
    });

    it('deletes the expense when authorized and found', async () => {
      vi.mocked(canEditTrip).mockResolvedValue(true);
      vi.mocked(prisma.expense.findUnique).mockResolvedValue({
        id: 'expense-1',
        tripId: 'trip-1',
      } as never);
      vi.mocked(prisma.expense.delete).mockResolvedValue({} as never);

      const res = await app.inject({
        method: 'DELETE',
        url: '/api/trips/trip-1/expenses/expense-1',
      });

      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({ success: true });
      expect(prisma.expense.delete).toHaveBeenCalledWith({ where: { id: 'expense-1' } });
    });
  });
});
