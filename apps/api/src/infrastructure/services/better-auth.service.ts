import type { FastifyRequest } from 'fastify';
import type { IAuthService } from '../../application/ports/services/auth.service.js';

export function createBetterAuthService({ auth }: { auth: any }): IAuthService {
  return {
    async getCurrentUser(request: FastifyRequest) {
      const cookie = request.headers.cookie;
      if (!cookie) return null;
      try {
        const session = await auth.api.getSession({ headers: { cookie } });
        return session?.user ?? null;
      } catch {
        return null;
      }
    },
  };
}
