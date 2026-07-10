import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import { CheckEmailRequestSchema } from '@group-expense-hub/db/schemas';
import { parseBody } from '../../lib/validate-request.js';
import type { CheckEmailUseCase } from '../../application/use-cases/check-email/check-email.use-case.js';
import type { IRateLimitService } from '../../application/ports/services/rate-limit.service.js';

export type CheckEmailPluginDeps = {
  checkEmail: CheckEmailUseCase;
  apiRateLimiter: IRateLimitService;
};

export function createCheckEmailPlugin(deps: CheckEmailPluginDeps): FastifyPluginAsync {
  return async (fastify) => {
    fastify.get('/check-email', async (request: FastifyRequest, reply: FastifyReply) => {
      const rl = await deps.apiRateLimiter.limit(request.ip);
      if (!rl.success) return reply.status(429).send({ error: 'Too many requests. Please try again later.' });

      const query = parseBody(CheckEmailRequestSchema, request.query, reply);
      if (!query) return;

      return deps.checkEmail(query.email);
    });
  };
}
