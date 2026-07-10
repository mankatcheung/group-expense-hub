import type { FastifyPluginAsync, FastifyRequest, FastifyReply, preHandlerHookHandler } from 'fastify';
import { UpdateProfileRequestSchema } from '@group-expense-hub/db/schemas';
import { parseBody } from '../../lib/validate-request.js';
import type { UpdateProfileUseCase } from '../../application/use-cases/users/update-profile.use-case.js';
import type { IRateLimitService } from '../../application/ports/services/rate-limit.service.js';

export type UserPluginDeps = {
  requireAuth: preHandlerHookHandler;
  updateProfile: UpdateProfileUseCase;
  authRateLimiter: IRateLimitService;
};

export function createUserPlugin(deps: UserPluginDeps): FastifyPluginAsync {
  return async (fastify) => {
    fastify.put('/profile', { preHandler: deps.requireAuth }, async (request: FastifyRequest, reply: FastifyReply) => {
      const body = parseBody(UpdateProfileRequestSchema, request.body, reply);
      if (!body) return;

      const rl = await deps.authRateLimiter.limit(request.user.id);
      if (!rl.success) return reply.status(429).send({ error: 'Too many requests. Please try again later.' });

      const result = await deps.updateProfile(request.user, { name: body.name, email: body.email });
      if (result.type === 'error') return reply.status(400).send({ error: 'Email already in use' });
      return { success: true };
    });

    fastify.post('/password', { preHandler: deps.requireAuth }, async (request: FastifyRequest, reply: FastifyReply) => {
      const rl = await deps.authRateLimiter.limit(request.user.id);
      if (!rl.success) return reply.status(429).send({ error: 'Too many requests. Please try again later.' });
      return { success: true };
    });
  };
}
