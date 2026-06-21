import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../auth.js';
import { getUserFromRequest } from '../lib/get-session.js';
import { canEditTrip } from './trips.js';
import { CreateMemberRequestSchema, UpdateMemberRequestSchema } from '@group-expense-hub/db/schemas';
import { parseBody } from '../lib/validate-request.js';

export default async function membersRouter(fastify: FastifyInstance) {
  fastify.post('/:id/members', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id: tripId } = request.params as { id: string };
    const user = await getUserFromRequest(request);
    const body = parseBody(CreateMemberRequestSchema, request.body, reply);
    if (!body) return;

    const canEdit = await canEditTrip(tripId, user.id);
    if (!canEdit) {
      return reply.status(403).send({ error: 'Not authorized to edit this trip' });
    }

    return prisma.member.create({
      data: { id: body.id, name: body.name, color: body.color, tripId },
    });
  });

  fastify.put('/:id/members/:memberId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id: tripId, memberId } = request.params as { id: string; memberId: string };
    const user = await getUserFromRequest(request);
    const body = parseBody(UpdateMemberRequestSchema, request.body, reply);
    if (!body) return;

    const canEdit = await canEditTrip(tripId, user.id);
    if (!canEdit) {
      return reply.status(403).send({ error: 'Not authorized to edit this trip' });
    }

    return prisma.member.update({ where: { id: memberId }, data: { name: body.name } });
  });

  fastify.delete('/:id/members/:memberId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id: tripId, memberId } = request.params as { id: string; memberId: string };
    const user = await getUserFromRequest(request);

    const canEdit = await canEditTrip(tripId, user.id);
    if (!canEdit) {
      return reply.status(403).send({ error: 'Not authorized to edit this trip' });
    }

    const member = await prisma.member.findUnique({ where: { id: memberId } });
    if (!member) {
      return reply.status(404).send({ error: 'Member not found' });
    }

    const expenseCount = await prisma.expense.count({
      where: { tripId, OR: [{ paidById: memberId }, { splits: { some: { memberId } } }] },
    });

    if (expenseCount > 0) {
      return { error: 'Member has expenses', expenseCount, memberName: member.name };
    }

    await prisma.member.delete({ where: { id: memberId } });
    return { success: true };
  });
}
