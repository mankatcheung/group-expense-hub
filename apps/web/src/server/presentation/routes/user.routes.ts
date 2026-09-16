import { NextResponse, type NextRequest } from 'next/server';
import { UpdateProfileRequestSchema } from '@group-expense-hub/db/schemas';
import type { IAuthService } from '../../application/ports/services/auth.service';
import type { IRateLimitService } from '../../application/ports/services/rate-limit.service';
import type { UpdateProfileUseCase } from '../../application/use-cases/users/update-profile.use-case';
import { parseBody } from '../../http/validate-request';
import { badRequest, rateLimit, readJsonBody, requireAuth } from '../../http/route-helpers';

export type UserRouteDeps = {
  authService: IAuthService;
  updateProfile: UpdateProfileUseCase;
  authRateLimiter: IRateLimitService;
};

export function createUserRoutes(deps: UserRouteDeps) {
  return {
    async updateProfile(request: NextRequest): Promise<Response> {
      const user = await requireAuth(request, deps.authService);
      if (user instanceof Response) return user;

      const body = parseBody(UpdateProfileRequestSchema, await readJsonBody(request));
      if (!body.ok) return badRequest(body.message);

      const limited = await rateLimit(deps.authRateLimiter, user.id);
      if (limited) return limited;

      const result = await deps.updateProfile(user, { name: body.data.name, email: body.data.email });
      if (result.type === 'error') return badRequest('Email already in use');
      return NextResponse.json({ success: true });
    },

    // Stub carried over unchanged from the Fastify API: it does not change
    // the password. Tracked as a follow-up.
    async changePassword(request: NextRequest): Promise<Response> {
      const user = await requireAuth(request, deps.authService);
      if (user instanceof Response) return user;

      const limited = await rateLimit(deps.authRateLimiter, user.id);
      if (limited) return limited;

      return NextResponse.json({ success: true });
    },
  };
}
