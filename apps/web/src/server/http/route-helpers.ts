import { NextResponse, type NextRequest } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { validateOrigin } from '@/lib/validate-origin';
import type { AuthUser, IAuthService } from '../application/ports/services/auth.service';
import type { IRateLimitService } from '../application/ports/services/rate-limit.service';

const TOO_MANY_REQUESTS = 'Too many requests. Please try again later.';

export type RouteContext<P extends Record<string, string> = Record<string, string>> = {
  params: Promise<P>;
};

export type RouteHandler<P extends Record<string, string> = Record<string, string>> = (
  request: NextRequest,
  context: RouteContext<P>
) => Promise<Response>;

type ErrorWithStatus = Error & { statusCode?: number; status?: number };

function toErrorResponse(err: ErrorWithStatus, statusCode: number): NextResponse {
  const message = statusCode >= 500 ? 'Internal Server Error' : err.message;
  const isDev = process.env.NODE_ENV !== 'production';

  return NextResponse.json(
    { error: message, statusCode, ...(isDev && { stack: err.stack }) },
    { status: statusCode }
  );
}

/**
 * Every API route handler must be wrapped in this. It enforces the Origin
 * check (CSRF protection) - `proxy.ts` deliberately excludes `/api` from
 * middleware, so without this wrapper API routes have no origin validation
 * at all - and gives uncaught errors a consistent `{ error, statusCode }`
 * response. Because errors are caught here, Next's onRequestError hook never
 * sees them, so server errors are reported to Sentry explicitly.
 */
export function withApiRoute<P extends Record<string, string> = Record<string, string>>(
  handler: RouteHandler<P>
): RouteHandler<P> {
  return async (request, context) => {
    const originError = validateOrigin(request);
    if (originError) return originError;

    try {
      return await handler(request, context);
    } catch (error) {
      const err = (error instanceof Error ? error : new Error(String(error))) as ErrorWithStatus;
      const statusCode = err.statusCode || err.status || 500;
      const route = request.nextUrl.pathname;

      console.error('[api] request error', { method: request.method, url: route, error });
      if (statusCode >= 500) {
        Sentry.captureException(error, { tags: { route, method: request.method } });
      }
      return toErrorResponse(err, statusCode);
    }
  };
}

export async function requireAuth(
  request: NextRequest,
  authService: IAuthService
): Promise<AuthUser | NextResponse> {
  const user = await authService.getCurrentUser(request.headers);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return user;
}

export async function rateLimit(
  limiter: IRateLimitService,
  identifier: string
): Promise<NextResponse | null> {
  const result = await limiter.limit(identifier);
  if (!result.success) {
    return NextResponse.json({ error: TOO_MANY_REQUESTS }, { status: 429 });
  }
  return null;
}

/**
 * better-auth's own 429 body historically used `{ message, code }` rather
 * than `{ error }`, and the auth client depends on that shape.
 */
export async function authRateLimit(
  limiter: IRateLimitService,
  identifier: string
): Promise<NextResponse | null> {
  const result = await limiter.limit(identifier);
  if (!result.success) {
    return NextResponse.json(
      { message: TOO_MANY_REQUESTS, code: 'TOO_MANY_REQUESTS' },
      { status: 429 }
    );
  }
  return null;
}

/**
 * Next.js route handlers have no `request.ip`. Vercel sets
 * `x-forwarded-for` with the client IP first; `x-real-ip` is a fallback for
 * other proxies. Locally neither is set, so all requests share one bucket.
 */
export function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  const firstForwarded = forwardedFor?.split(',')[0]?.trim();
  return firstForwarded || request.headers.get('x-real-ip') || 'unknown';
}

export function jsonError(status: number, message: string): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

export function badRequest(message: string): NextResponse {
  return jsonError(400, message);
}

export async function readJsonBody(request: NextRequest): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}
