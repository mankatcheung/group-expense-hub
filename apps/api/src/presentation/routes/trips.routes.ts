import type { FastifyPluginAsync, FastifyRequest, FastifyReply, preHandlerHookHandler } from 'fastify';
import { CreateTripRequestSchema, UpdateTripRequestSchema, InviteMemberRequestSchema } from '@group-expense-hub/db/schemas';
import { parseBody } from '../../lib/validate-request.js';
import { formatTrip, formatTripSummary } from '../formatters/trip.formatter.js';
import type { GetTripsUseCase } from '../../application/use-cases/trips/get-trips.use-case.js';
import type { CreateTripUseCase } from '../../application/use-cases/trips/create-trip.use-case.js';
import type { GetTripUseCase } from '../../application/use-cases/trips/get-trip.use-case.js';
import type { UpdateTripUseCase } from '../../application/use-cases/trips/update-trip.use-case.js';
import type { DeleteTripUseCase } from '../../application/use-cases/trips/delete-trip.use-case.js';
import type { InviteMemberUseCase } from '../../application/use-cases/trips/invite-member.use-case.js';
import type { JoinTripUseCase } from '../../application/use-cases/trips/join-trip.use-case.js';
import type { RemoveCollaboratorUseCase } from '../../application/use-cases/trips/remove-collaborator.use-case.js';
import type { IRateLimitService } from '../../application/ports/services/rate-limit.service.js';

type Deps = {
  requireAuth: preHandlerHookHandler;
  getTrips: GetTripsUseCase;
  createTrip: CreateTripUseCase;
  getTrip: GetTripUseCase;
  updateTrip: UpdateTripUseCase;
  deleteTrip: DeleteTripUseCase;
  inviteMember: InviteMemberUseCase;
  joinTrip: JoinTripUseCase;
  removeCollaborator: RemoveCollaboratorUseCase;
  apiRateLimiter: IRateLimitService;
  authRateLimiter: IRateLimitService;
  emailRateLimiter: IRateLimitService;
};

export function createTripsPlugin(deps: Deps): FastifyPluginAsync {
  return async (fastify) => {
    fastify.get('/', { preHandler: deps.requireAuth }, async (request: FastifyRequest) => {
      return (await deps.getTrips(request.user.id)).map(t => formatTripSummary(t, request.user.id));
    });

    fastify.post('/', { preHandler: deps.requireAuth }, async (request: FastifyRequest, reply: FastifyReply) => {
      const body = parseBody(CreateTripRequestSchema, request.body, reply);
      if (!body) return;

      const rl = await deps.apiRateLimiter.limit(request.user.id);
      if (!rl.success) return reply.status(429).send({ error: 'Too many requests. Please try again later.' });

      const trip = await deps.createTrip({ id: body.id, name: body.name, createdAt: body.createdAt }, request.user.id);
      return { id: trip.id, name: trip.name, members: [], tripMembers: [], expenses: [], createdAt: trip.createdAt.toISOString(), isOwner: true, owner: null };
    });

    fastify.get('/:id', { preHandler: deps.requireAuth }, async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const trip = await deps.getTrip(id, request.user.id);
      if (!trip) return reply.status(404).send({ error: 'Trip not found' });
      return formatTrip(trip, request.user.id);
    });

    fastify.put('/:id', { preHandler: deps.requireAuth }, async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const body = parseBody(UpdateTripRequestSchema, request.body, reply);
      if (!body) return;

      const rl = await deps.apiRateLimiter.limit(request.user.id);
      if (!rl.success) return reply.status(429).send({ error: 'Too many requests. Please try again later.' });

      const result = await deps.updateTrip(id, body.name, request.user.id);
      if ('error' in result) return reply.status(403).send({ error: 'Not authorized to edit this trip' });
      return result;
    });

    fastify.delete('/:id', { preHandler: deps.requireAuth }, async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const rl = await deps.apiRateLimiter.limit(request.user.id);
      if (!rl.success) return reply.status(429).send({ error: 'Too many requests. Please try again later.' });

      await deps.deleteTrip(id, request.user.id);
      return { success: true };
    });

    fastify.post('/:id/invite', { preHandler: deps.requireAuth }, async (request: FastifyRequest, reply: FastifyReply) => {
      const { id: tripId } = request.params as { id: string };
      const body = parseBody(InviteMemberRequestSchema, request.body, reply);
      if (!body) return;

      const rl = await deps.emailRateLimiter.limit(request.user.id);
      if (!rl.success) return reply.status(429).send({ error: 'Too many requests. Please try again later.' });

      const result = await deps.inviteMember(tripId, body.email, request.user.id);
      if (result.type === 'error') {
        if (result.reason === 'forbidden') return reply.status(403).send({ error: 'Only the owner can invite members' });
        if (result.reason === 'trip_not_found') return reply.status(404).send({ error: 'Trip not found' });
        if (result.reason === 'already_member') return reply.status(400).send({ error: 'User is already a member' });
        if (result.reason === 'self_invite') return reply.status(400).send({ error: 'Cannot invite yourself' });
      }
      if (result.type === 'already_sent') return { success: true, message: 'Invitation already sent', pending: true };
      if (result.type === 'invitation_sent') return { success: true, message: `Invitation sent to ${result.email}`, pending: true };
      if (result.type === 'user_added') return {
        success: true,
        message: 'User added to trip',
        user: { id: result.userId, name: result.userName, email: result.userEmail, image: result.userImage },
        member: { id: result.memberId, name: result.memberName, color: result.memberColor },
      };
    });

    fastify.delete('/:id/collaborators/:memberId', { preHandler: deps.requireAuth }, async (request: FastifyRequest, reply: FastifyReply) => {
      const { id: tripId, memberId } = request.params as { id: string; memberId: string };
      const rl = await deps.apiRateLimiter.limit(request.user.id);
      if (!rl.success) return reply.status(429).send({ error: 'Too many requests. Please try again later.' });

      const result = await deps.removeCollaborator(tripId, memberId, request.user.id);
      if (result.type === 'error') {
        if (result.reason === 'forbidden') return reply.status(403).send({ error: 'Only the owner can remove members' });
        if (result.reason === 'not_found') return reply.status(404).send({ error: 'Member not found' });
      }
      return { success: true };
    });

    fastify.post('/join/:token', { preHandler: deps.requireAuth }, async (request: FastifyRequest, reply: FastifyReply) => {
      const { token } = request.params as { token: string };
      const rl = await deps.authRateLimiter.limit(request.user.id);
      if (!rl.success) return reply.status(429).send({ error: 'Too many requests. Please try again later.' });

      const result = await deps.joinTrip(token, request.user.id);
      if (result.type === 'error') {
        if (result.reason === 'not_found') return reply.status(404).send({ error: 'Invalid invitation' });
        if (result.reason === 'expired') return reply.status(400).send({ error: 'Invitation expired' });
        if (result.reason === 'already_used') return reply.status(400).send({ error: 'Invitation already used' });
        if (result.reason === 'already_member') return reply.status(400).send({ error: 'Already a member' });
      }
      if (result.type === 'success') return { success: true, tripId: result.tripId };
    });
  };
}
