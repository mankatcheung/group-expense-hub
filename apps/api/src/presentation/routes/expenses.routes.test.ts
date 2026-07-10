import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { buildTestApp } from '../../test/test-app.js';
import { createExpensesPlugin } from './expenses.routes.js';

const user = { id: 'user-1', name: 'Test User', email: 'test@example.com', image: null };
const mockRequireAuth = vi.fn(async (request: FastifyRequest) => { (request as any).user = user; });
const validBody = {
  id: '11111111-1111-1111-1111-111111111111',
  description: 'Dinner',
  amount: 42.5,
  currency: 'USD',
  paidBy: '22222222-2222-2222-2222-222222222222',
  splitAmong: ['22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333'],
};

function makeDeps(overrides: Record<string, unknown> = {}) {
  return {
    requireAuth: mockRequireAuth,
    createExpense: vi.fn().mockResolvedValue({ type: 'success' }),
    updateExpense: vi.fn().mockResolvedValue({ type: 'success' }),
    deleteExpense: vi.fn().mockResolvedValue({ type: 'success' }),
    apiRateLimiter: { limit: vi.fn().mockResolvedValue({ success: true, remaining: 99, reset: 0 }) },
    ...overrides,
  };
}

describe('createExpensesPlugin', () => {
  let app: FastifyInstance;

  afterAll(() => app?.close());

  describe('POST /:id/expenses', () => {
    beforeEach(async () => { app = await buildTestApp(createExpensesPlugin(makeDeps() as any), '/api/trips'); });

    it('returns 400 for an invalid body', async () => {
      const res = await app.inject({ method: 'POST', url: '/api/trips/trip-1/expenses', payload: { ...validBody, amount: -5 } });
      expect(res.statusCode).toBe(400);
    });

    it('returns 429 when rate limited', async () => {
      const localApp = await buildTestApp(createExpensesPlugin(makeDeps({ apiRateLimiter: { limit: vi.fn().mockResolvedValue({ success: false, remaining: 0, reset: 0 }) } }) as any), '/api/trips');
      const res = await localApp.inject({ method: 'POST', url: '/api/trips/trip-1/expenses', payload: validBody });
      expect(res.statusCode).toBe(429);
      await localApp.close();
    });

    it('returns 403 when forbidden', async () => {
      const localApp = await buildTestApp(createExpensesPlugin(makeDeps({ createExpense: vi.fn().mockResolvedValue({ type: 'error', reason: 'forbidden' }) }) as any), '/api/trips');
      const res = await localApp.inject({ method: 'POST', url: '/api/trips/trip-1/expenses', payload: validBody });
      expect(res.statusCode).toBe(403);
      await localApp.close();
    });

    it('creates the expense and returns success', async () => {
      const mockCreate = vi.fn().mockResolvedValue({ type: 'success' });
      const localApp = await buildTestApp(createExpensesPlugin(makeDeps({ createExpense: mockCreate }) as any), '/api/trips');
      const res = await localApp.inject({ method: 'POST', url: '/api/trips/trip-1/expenses', payload: validBody });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({ success: true });
      expect(mockCreate).toHaveBeenCalledWith('trip-1', expect.objectContaining({ id: validBody.id, amount: 42.5 }), user.id);
      await localApp.close();
    });
  });

  describe('PUT /:id/expenses/:expenseId', () => {
    it('returns 403 when forbidden', async () => {
      const localApp = await buildTestApp(createExpensesPlugin(makeDeps({ updateExpense: vi.fn().mockResolvedValue({ type: 'error', reason: 'forbidden' }) }) as any), '/api/trips');
      const res = await localApp.inject({ method: 'PUT', url: '/api/trips/trip-1/expenses/expense-1', payload: validBody });
      expect(res.statusCode).toBe(403);
      await localApp.close();
    });

    it('returns 404 when not found', async () => {
      const localApp = await buildTestApp(createExpensesPlugin(makeDeps({ updateExpense: vi.fn().mockResolvedValue({ type: 'error', reason: 'not_found' }) }) as any), '/api/trips');
      const res = await localApp.inject({ method: 'PUT', url: '/api/trips/trip-1/expenses/expense-1', payload: validBody });
      expect(res.statusCode).toBe(404);
      await localApp.close();
    });

    it('updates and returns success', async () => {
      const res = await app.inject({ method: 'PUT', url: '/api/trips/trip-1/expenses/expense-1', payload: validBody });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({ success: true });
    });
  });

  describe('DELETE /:id/expenses/:expenseId', () => {
    it('returns 403 when forbidden', async () => {
      const localApp = await buildTestApp(createExpensesPlugin(makeDeps({ deleteExpense: vi.fn().mockResolvedValue({ type: 'error', reason: 'forbidden' }) }) as any), '/api/trips');
      const res = await localApp.inject({ method: 'DELETE', url: '/api/trips/trip-1/expenses/expense-1' });
      expect(res.statusCode).toBe(403);
      await localApp.close();
    });

    it('deletes and returns success', async () => {
      const res = await app.inject({ method: 'DELETE', url: '/api/trips/trip-1/expenses/expense-1' });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({ success: true });
    });
  });
});
