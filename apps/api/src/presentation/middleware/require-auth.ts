import type { FastifyRequest, FastifyReply } from 'fastify';
import type { IAuthService, AuthUser } from '../../application/ports/services/auth.service.js';

declare module 'fastify' {
  interface FastifyRequest {
    user: AuthUser;
  }
}

export function createRequireAuth(authService: IAuthService) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = await authService.getCurrentUser(request);
    if (!user) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }
    request.user = user;
  };
}
