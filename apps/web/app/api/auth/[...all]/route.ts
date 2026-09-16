import { toNextJsHandler } from 'better-auth/next-js';
import { auth } from '@/server/auth';
import { getContainer } from '@/server/container';
import { createAuthRouteHandlers } from '@/server/http/auth-route';

export const runtime = 'nodejs';

export const { GET, POST } = createAuthRouteHandlers({
  handlers: toNextJsHandler(auth),
  getLimiter: () => getContainer().get('AUTH_RATE_LIMITER'),
});
