import { describe, it, expect, vi } from 'vitest';
import { createExpenseRoutes, type ExpenseRouteDeps } from './expenses.routes';
import { authedService, ctx, makeLimiter, makeRequest, testUser, unauthedService } from './test-helpers';

const validBody = {
  id: '11111111-1111-1111-1111-111111111111',
  description: 'Dinner',
  amount: 42.5,
  currency: 'USD',
  paidBy: '22222222-2222-2222-2222-222222222222',
  splitAmong: ['22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333'],
};
const tripCtx = ctx({ id: 'trip-1' });
const expenseCtx = ctx({ id: 'trip-1', expenseId: 'expense-1' });

function makeDeps(overrides: Partial<ExpenseRouteDeps> = {}): ExpenseRouteDeps {
  return {
    authService: authedService(),
    createExpense: vi.fn().mockResolvedValue({ type: 'success' }),
    updateExpense: vi.fn().mockResolvedValue({ type: 'success' }),
    deleteExpense: vi.fn().mockResolvedValue({ type: 'success' }),
    apiRateLimiter: makeLimiter(),
    ...overrides,
  };
}

describe('createExpenseRoutes', () => {
  describe('create (POST /api/trips/:id/expenses)', () => {
    const create = (deps: Partial<ExpenseRouteDeps>, body: unknown = validBody) =>
      createExpenseRoutes(makeDeps(deps)).create(makeRequest('POST', '/api/trips/trip-1/expenses', body), tripCtx);

    it('returns 401 when not authenticated', async () => {
      expect((await create({ authService: unauthedService() })).status).toBe(401);
    });

    it('returns 400 for an invalid body', async () => {
      expect((await create({}, { ...validBody, amount: -5 })).status).toBe(400);
    });

    it('returns 429 when rate limited', async () => {
      expect((await create({ apiRateLimiter: makeLimiter(false) })).status).toBe(429);
    });

    it('returns 403 when forbidden', async () => {
      const res = await create({ createExpense: vi.fn().mockResolvedValue({ type: 'error', reason: 'forbidden' }) });
      expect(res.status).toBe(403);
      expect(await res.json()).toEqual({ error: 'Not authorized to edit this trip' });
    });

    it('creates the expense and returns success', async () => {
      const createExpense = vi.fn().mockResolvedValue({ type: 'success' });
      const res = await create({ createExpense });
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ success: true });
      expect(createExpense).toHaveBeenCalledWith('trip-1', expect.objectContaining({ id: validBody.id, amount: 42.5 }), testUser.id);
    });
  });

  describe('update (PUT /api/trips/:id/expenses/:expenseId)', () => {
    const update = (deps: Partial<ExpenseRouteDeps>) =>
      createExpenseRoutes(makeDeps(deps)).update(makeRequest('PUT', '/api/trips/trip-1/expenses/expense-1', validBody), expenseCtx);

    it('returns 403 when forbidden', async () => {
      expect((await update({ updateExpense: vi.fn().mockResolvedValue({ type: 'error', reason: 'forbidden' }) })).status).toBe(403);
    });

    it('returns 404 when not found', async () => {
      const res = await update({ updateExpense: vi.fn().mockResolvedValue({ type: 'error', reason: 'not_found' }) });
      expect(res.status).toBe(404);
      expect(await res.json()).toEqual({ error: 'Expense not found' });
    });

    it('updates and returns success', async () => {
      const updateExpense = vi.fn().mockResolvedValue({ type: 'success' });
      const res = await update({ updateExpense });
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ success: true });
      expect(updateExpense).toHaveBeenCalledWith('trip-1', 'expense-1', expect.objectContaining({ amount: 42.5 }), testUser.id);
    });
  });

  describe('remove (DELETE /api/trips/:id/expenses/:expenseId)', () => {
    const remove = (deps: Partial<ExpenseRouteDeps>) =>
      createExpenseRoutes(makeDeps(deps)).remove(makeRequest('DELETE', '/api/trips/trip-1/expenses/expense-1'), expenseCtx);

    it('returns 429 when rate limited', async () => {
      expect((await remove({ apiRateLimiter: makeLimiter(false) })).status).toBe(429);
    });

    it('returns 403 when forbidden', async () => {
      expect((await remove({ deleteExpense: vi.fn().mockResolvedValue({ type: 'error', reason: 'forbidden' }) })).status).toBe(403);
    });

    it('returns 404 when not found', async () => {
      expect((await remove({ deleteExpense: vi.fn().mockResolvedValue({ type: 'error', reason: 'not_found' }) })).status).toBe(404);
    });

    it('deletes and returns success', async () => {
      const res = await remove({});
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ success: true });
    });
  });
});
