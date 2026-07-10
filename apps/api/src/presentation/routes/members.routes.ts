import type { FastifyPluginAsync, FastifyRequest, FastifyReply, preHandlerHookHandler } from 'fastify';
import { CreateMemberRequestSchema, UpdateMemberRequestSchema } from '@group-expense-hub/db/schemas';
import { parseBody } from '../../lib/validate-request.js';
import type { CreateMemberUseCase } from '../../application/use-cases/members/create-member.use-case.js';
import type { UpdateMemberUseCase } from '../../application/use-cases/members/update-member.use-case.js';
import type { DeleteMemberUseCase } from '../../application/use-cases/members/delete-member.use-case.js';
import type { IRateLimitService } from '../../application/ports/services/rate-limit.service.js';

type Deps = {
  requireAuth: preHandlerHookHandler;
  createMember: CreateMemberUseCase;
  updateMember: UpdateMemberUseCase;
  deleteMember: DeleteMemberUseCase;
  apiRateLimiter: IRateLimitService;
};

export function createMembersPlugin(deps: Deps): FastifyPluginAsync {
  return async (fastify) => {
    fastify.post('/:id/members', { preHandler: deps.requireAuth }, async (request: FastifyRequest, reply: FastifyReply) => {
      const { id: tripId } = request.params as { id: string };
      const body = parseBody(CreateMemberRequestSchema, request.body, reply);
      if (!body) return;

      const rl = await deps.apiRateLimiter.limit(request.user.id);
      if (!rl.success) return reply.status(429).send({ error: 'Too many requests. Please try again later.' });

      const result = await deps.createMember(tripId, { id: body.id, name: body.name, color: body.color }, request.user.id);
      if (result.type === 'error') return reply.status(403).send({ error: 'Not authorized to edit this trip' });
      return result.member;
    });

    fastify.put('/:id/members/:memberId', { preHandler: deps.requireAuth }, async (request: FastifyRequest, reply: FastifyReply) => {
      const { id: tripId, memberId } = request.params as { id: string; memberId: string };
      const body = parseBody(UpdateMemberRequestSchema, request.body, reply);
      if (!body) return;

      const rl = await deps.apiRateLimiter.limit(request.user.id);
      if (!rl.success) return reply.status(429).send({ error: 'Too many requests. Please try again later.' });

      const result = await deps.updateMember(tripId, memberId, body.name, request.user.id);
      if (result.type === 'error') {
        if (result.reason === 'forbidden') return reply.status(403).send({ error: 'Not authorized to edit this trip' });
        if (result.reason === 'not_found') return reply.status(404).send({ error: 'Member not found' });
      }
      if (result.type === 'success') return result.member;
    });

    fastify.delete('/:id/members/:memberId', { preHandler: deps.requireAuth }, async (request: FastifyRequest, reply: FastifyReply) => {
      const { id: tripId, memberId } = request.params as { id: string; memberId: string };
      const rl = await deps.apiRateLimiter.limit(request.user.id);
      if (!rl.success) return reply.status(429).send({ error: 'Too many requests. Please try again later.' });

      const result = await deps.deleteMember(tripId, memberId, request.user.id);
      if (result.type === 'error') {
        if (result.reason === 'forbidden') return reply.status(403).send({ error: 'Not authorized to edit this trip' });
        if (result.reason === 'not_found') return reply.status(404).send({ error: 'Member not found' });
      }
      if (result.type === 'has_expenses') return { error: 'Member has expenses', expenseCount: result.expenseCount, memberName: result.memberName };
      return { success: true };
    });
  };
}
