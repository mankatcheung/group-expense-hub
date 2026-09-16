import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { createAuthRouteHandlers } from './auth-route';

vi.mock('@sentry/nextjs', () => ({ captureMessage: vi.fn() }));

beforeEach(() => {
  vi.mocked(Sentry.captureMessage).mockClear();
});
import type { IRateLimitService } from '../application/ports/services/rate-limit.service';

function makeLimiter(success: boolean): IRateLimitService {
  return { limit: vi.fn().mockResolvedValue({ success, remaining: 0, reset: 0 }) };
}

function makeHandlers() {
  return {
    GET: vi.fn().mockResolvedValue(Response.json({ session: null })),
    POST: vi.fn().mockResolvedValue(Response.json({ ok: true })),
  };
}

function makeRequest(method: 'GET' | 'POST', headers?: Record<string, string>) {
  return new NextRequest('http://localhost:3000/api/auth/get-session', { method, headers });
}

describe('createAuthRouteHandlers', () => {
  it('forwards GET and POST to better-auth when under the rate limit', async () => {
    const handlers = makeHandlers();
    const route = createAuthRouteHandlers({ handlers, getLimiter: () => makeLimiter(true) });

    const getReq = makeRequest('GET');
    const postReq = makeRequest('POST');
    const getRes = await route.GET(getReq);
    const postRes = await route.POST(postReq);

    expect(handlers.GET).toHaveBeenCalledWith(getReq);
    expect(handlers.POST).toHaveBeenCalledWith(postReq);
    expect(await getRes.json()).toEqual({ session: null });
    expect(await postRes.json()).toEqual({ ok: true });
  });

  it('returns the { message, code } 429 without calling better-auth when over the limit', async () => {
    const handlers = makeHandlers();
    const route = createAuthRouteHandlers({ handlers, getLimiter: () => makeLimiter(false) });

    const res = await route.POST(makeRequest('POST'));

    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({
      message: 'Too many requests. Please try again later.',
      code: 'TOO_MANY_REQUESTS',
    });
    expect(handlers.POST).not.toHaveBeenCalled();
  });

  it('rejects a cookieless request from an untrusted origin before rate limiting or better-auth', async () => {
    const handlers = makeHandlers();
    const limiter = makeLimiter(true);
    const route = createAuthRouteHandlers({ handlers, getLimiter: () => limiter });

    const res = await route.POST(makeRequest('POST', { origin: 'https://evil.example.com' }));

    expect(res.status).toBe(403);
    expect(handlers.POST).not.toHaveBeenCalled();
    expect(limiter.limit).not.toHaveBeenCalled();
  });

  it('reports better-auth 5xx responses to Sentry, since they are returned rather than thrown', async () => {
    const handlers = makeHandlers();
    handlers.POST.mockResolvedValue(new Response('{}', { status: 500 }));
    const route = createAuthRouteHandlers({ handlers, getLimiter: () => makeLimiter(true) });

    const res = await route.POST(new NextRequest('http://localhost:3000/api/auth/request-password-reset', { method: 'POST' }));

    expect(res.status).toBe(500);
    expect(Sentry.captureMessage).toHaveBeenCalledWith('Auth endpoint returned 500', {
      level: 'error',
      tags: { route: '/api/auth/request-password-reset', method: 'POST' },
    });
  });

  it('does not report successful or client-error auth responses', async () => {
    const handlers = makeHandlers();
    handlers.POST.mockResolvedValue(new Response('{}', { status: 401 }));
    const route = createAuthRouteHandlers({ handlers, getLimiter: () => makeLimiter(true) });

    await route.POST(makeRequest('POST'));
    await route.GET(makeRequest('GET'));

    expect(Sentry.captureMessage).not.toHaveBeenCalled();
  });

  it('rate-limits by client IP', async () => {
    const limiter = makeLimiter(true);
    const route = createAuthRouteHandlers({ handlers: makeHandlers(), getLimiter: () => limiter });

    await route.GET(makeRequest('GET', { 'x-forwarded-for': '9.9.9.9, 10.0.0.1' }));

    expect(limiter.limit).toHaveBeenCalledWith('9.9.9.9');
  });
});
