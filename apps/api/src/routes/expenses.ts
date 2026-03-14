import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../auth.js';
import { getUserFromRequest } from '../lib/get-session.js';
import { canEditTrip } from './trips.js';

export default async function expensesRouter(fastify: FastifyInstance) {
  fastify.post('/:id/expenses', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id: tripId } = request.params as { id: string };
    const user = await getUserFromRequest(request);
    const body = request.body as {
      id: string;
      description: string;
      amount: number;
      currency: string;
      paidBy: string;
      splitAmong: string[];
      date?: string;
    };

    const canEdit = await canEditTrip(tripId, user.id);
    if (!canEdit) {
      return reply.status(403).send({ error: 'Not authorized to edit this trip' });
    }

    await prisma.expense.create({
      data: {
        id: body.id,
        description: body.description,
        amount: body.amount,
        currency: body.currency,
        date: body.date ? new Date(body.date) : undefined,
        tripId,
        paidById: body.paidBy,
        splits: { create: body.splitAmong.map(memberId => ({ memberId })) },
      },
    });

    return { success: true };
  });

  fastify.put('/:id/expenses/:expenseId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id: tripId, expenseId } = request.params as { id: string; expenseId: string };
    const user = await getUserFromRequest(request);
    const body = request.body as {
      description: string;
      amount: number;
      currency: string;
      paidBy: string;
      splitAmong: string[];
      date?: string;
    };

    const canEdit = await canEditTrip(tripId, user.id);
    if (!canEdit) {
      return reply.status(403).send({ error: 'Not authorized to edit this trip' });
    }

    await prisma.expense.update({
      where: { id: expenseId },
      data: {
        description: body.description,
        amount: body.amount,
        currency: body.currency,
        date: body.date ? new Date(body.date) : undefined,
        tripId,
        paidById: body.paidBy,
        splits: { deleteMany: {}, create: body.splitAmong.map(memberId => ({ memberId })) },
      },
    });

    return { success: true };
  });

  fastify.delete(
    '/:id/expenses/:expenseId',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id: tripId, expenseId } = request.params as { id: string; expenseId: string };
      const user = await getUserFromRequest(request);

      const canEdit = await canEditTrip(tripId, user.id);
      if (!canEdit) {
        return reply.status(403).send({ error: 'Not authorized to edit this trip' });
      }

      await prisma.expense.delete({ where: { id: expenseId } });
      return { success: true };
    }
  );
}
