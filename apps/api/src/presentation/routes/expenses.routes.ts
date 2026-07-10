import type { FastifyPluginAsync, FastifyRequest, FastifyReply, preHandlerHookHandler } from 'fastify';
import { CreateExpenseRequestSchema, UpdateExpenseRequestSchema } from '@group-expense-hub/db/schemas';
import { parseBody } from '../../lib/validate-request.js';
import type { CreateExpenseUseCase } from '../../application/use-cases/expenses/create-expense.use-case.js';
import type { UpdateExpenseUseCase } from '../../application/use-cases/expenses/update-expense.use-case.js';
import type { DeleteExpenseUseCase } from '../../application/use-cases/expenses/delete-expense.use-case.js';
import type { IRateLimitService } from '../../application/ports/services/rate-limit.service.js';

type Deps = {
  requireAuth: preHandlerHookHandler;
  createExpense: CreateExpenseUseCase;
  updateExpense: UpdateExpenseUseCase;
  deleteExpense: DeleteExpenseUseCase;
  apiRateLimiter: IRateLimitService;
};

export function createExpensesPlugin(deps: Deps): FastifyPluginAsync {
  return async (fastify) => {
    fastify.post('/:id/expenses', { preHandler: deps.requireAuth }, async (request: FastifyRequest, reply: FastifyReply) => {
      const { id: tripId } = request.params as { id: string };
      const body = parseBody(CreateExpenseRequestSchema, request.body, reply);
      if (!body) return;

      const rl = await deps.apiRateLimiter.limit(request.user.id);
      if (!rl.success) return reply.status(429).send({ error: 'Too many requests. Please try again later.' });

      const result = await deps.createExpense(tripId, body, request.user.id);
      if (result.type === 'error') return reply.status(403).send({ error: 'Not authorized to edit this trip' });
      return { success: true };
    });

    fastify.put('/:id/expenses/:expenseId', { preHandler: deps.requireAuth }, async (request: FastifyRequest, reply: FastifyReply) => {
      const { id: tripId, expenseId } = request.params as { id: string; expenseId: string };
      const body = parseBody(UpdateExpenseRequestSchema, request.body, reply);
      if (!body) return;

      const rl = await deps.apiRateLimiter.limit(request.user.id);
      if (!rl.success) return reply.status(429).send({ error: 'Too many requests. Please try again later.' });

      const result = await deps.updateExpense(tripId, expenseId, body, request.user.id);
      if (result.type === 'error') {
        if (result.reason === 'forbidden') return reply.status(403).send({ error: 'Not authorized to edit this trip' });
        if (result.reason === 'not_found') return reply.status(404).send({ error: 'Expense not found' });
      }
      return { success: true };
    });

    fastify.delete('/:id/expenses/:expenseId', { preHandler: deps.requireAuth }, async (request: FastifyRequest, reply: FastifyReply) => {
      const { id: tripId, expenseId } = request.params as { id: string; expenseId: string };
      const rl = await deps.apiRateLimiter.limit(request.user.id);
      if (!rl.success) return reply.status(429).send({ error: 'Too many requests. Please try again later.' });

      const result = await deps.deleteExpense(tripId, expenseId, request.user.id);
      if (result.type === 'error') {
        if (result.reason === 'forbidden') return reply.status(403).send({ error: 'Not authorized to edit this trip' });
        if (result.reason === 'not_found') return reply.status(404).send({ error: 'Expense not found' });
      }
      return { success: true };
    });
  };
}
