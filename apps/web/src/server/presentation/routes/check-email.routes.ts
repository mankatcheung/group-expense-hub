import { NextResponse, type NextRequest } from 'next/server';
import { CheckEmailRequestSchema } from '@group-expense-hub/db/schemas';
import type { IRateLimitService } from '../../application/ports/services/rate-limit.service';
import type { CheckEmailUseCase } from '../../application/use-cases/check-email/check-email.use-case';
import { parseBody } from '../../http/validate-request';
import { badRequest, getClientIp, rateLimit } from '../../http/route-helpers';

export type CheckEmailRouteDeps = {
  checkEmail: CheckEmailUseCase;
  apiRateLimiter: IRateLimitService;
};

export function createCheckEmailRoutes(deps: CheckEmailRouteDeps) {
  return {
    // Unauthenticated (used on the register page), so rate-limited by IP.
    async check(request: NextRequest): Promise<Response> {
      const limited = await rateLimit(deps.apiRateLimiter, getClientIp(request));
      if (limited) return limited;

      const query = parseBody(CheckEmailRequestSchema, Object.fromEntries(request.nextUrl.searchParams));
      if (!query.ok) return badRequest(query.message);

      return NextResponse.json(await deps.checkEmail(query.data.email));
    },
  };
}
