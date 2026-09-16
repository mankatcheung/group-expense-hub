import type { NextRequest } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { validateOrigin } from '@/lib/validate-origin';
import type { IRateLimitService } from '../application/ports/services/rate-limit.service';
import { authRateLimit, getClientIp } from './route-helpers';

type RequestHandler = (request: Request) => Promise<Response>;

type AuthRouteDeps = {
  handlers: { GET: RequestHandler; POST: RequestHandler };
  getLimiter: () => IRateLimitService;
};

export type AuthRouteHandlers = {
  GET: (request: NextRequest) => Promise<Response>;
  POST: (request: NextRequest) => Promise<Response>;
};

/**
 * better-auth's own `trustedOrigins` check only runs when the request carries
 * a cookie, so a cookieless cross-site sign-in/sign-up would get through.
 * `validateOrigin` closes that gap. Not wrapped in `withApiRoute` because
 * better-auth returns its own error responses.
 */
export function createAuthRouteHandlers({ handlers, getLimiter }: AuthRouteDeps): AuthRouteHandlers {
  const withGuards =
    (handler: RequestHandler) =>
    async (request: NextRequest): Promise<Response> => {
      const originError = validateOrigin(request);
      if (originError) return originError;

      const limited = await authRateLimit(getLimiter(), getClientIp(request));
      if (limited) return limited;

      // better-auth turns internal failures into 5xx responses instead of
      // throwing, so they would otherwise never reach Sentry.
      const response = await handler(request);
      if (response.status >= 500) {
        Sentry.captureMessage(`Auth endpoint returned ${response.status}`, {
          level: 'error',
          tags: { route: request.nextUrl.pathname, method: request.method },
        });
      }
      return response;
    };

  return {
    GET: withGuards(handlers.GET),
    POST: withGuards(handlers.POST),
  };
}
