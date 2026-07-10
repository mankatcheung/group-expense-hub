import type { FastifyPluginAsync, FastifyRequest, FastifyReply, preHandlerHookHandler } from 'fastify';
import type { GetInvitationsUseCase } from '../../application/use-cases/invitations/get-invitations.use-case.js';
import type { AcceptInvitationUseCase } from '../../application/use-cases/invitations/accept-invitation.use-case.js';
import type { IRateLimitService } from '../../application/ports/services/rate-limit.service.js';

type Deps = {
  requireAuth: preHandlerHookHandler;
  getInvitations: GetInvitationsUseCase;
  acceptInvitation: AcceptInvitationUseCase;
  apiRateLimiter: IRateLimitService;
};

export function createInvitationsPlugin(deps: Deps): FastifyPluginAsync {
  return async (fastify) => {
    fastify.get('/', { preHandler: deps.requireAuth }, async (request: FastifyRequest) => {
      const invitations = await deps.getInvitations(request.user.email);
      return invitations.map(inv => ({
        id: inv.id,
        token: inv.token,
        tripId: inv.tripId,
        tripName: inv.trip.name,
        inviter: inv.trip.user,
        createdAt: inv.createdAt.toISOString(),
      }));
    });

    fastify.post('/:id/accept', { preHandler: deps.requireAuth }, async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const rl = await deps.apiRateLimiter.limit(request.user.id);
      if (!rl.success) return reply.status(429).send({ error: 'Too many requests. Please try again later.' });

      const result = await deps.acceptInvitation(id, request.user);
      if (result.type === 'error') {
        if (result.reason === 'not_found') return reply.status(404).send({ error: 'Invitation not found' });
        if (result.reason === 'wrong_user') return reply.status(403).send({ error: 'This invitation is not for you' });
        if (result.reason === 'expired') return reply.status(400).send({ error: 'Invitation expired' });
        if (result.reason === 'already_used') return reply.status(400).send({ error: 'Invitation already used' });
        if (result.reason === 'already_member') return reply.status(400).send({ error: 'Already a member' });
      }
      if (result.type === 'success') return { success: true, tripId: result.tripId };
    });
  };
}
