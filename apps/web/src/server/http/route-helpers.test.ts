import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import * as Sentry from '@sentry/nextjs';

vi.mock('@sentry/nextjs', () => ({ captureException: vi.fn() }));
import {
  withApiRoute,
  requireAuth,
  rateLimit,
  authRateLimit,
  getClientIp,
  badRequest,
  readJsonBody,
} from './route-helpers';
import type { IAuthService } from '../application/ports/services/auth.service';
import type { IRateLimitService } from '../application/ports/services/rate-limit.service';

const ctx = { params: Promise.resolve({}) };

function makeRequest(init: { method?: string; headers?: Record<string, string>; body?: string } = {}) {
  return new NextRequest('http://localhost:3000/api/trips', {
    method: init.method ?? 'GET',
    headers: init.headers,
    body: init.body,
  });
}

function makeLimiter(success: boolean): IRateLimitService {
  return { limit: vi.fn().mockResolvedValue({ success, remaining: 0, reset: 0 }) };
}

describe('withApiRoute', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(Sentry.captureException).mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('rejects a request from a disallowed origin with 403 without calling the handler', async () => {
    const handler = vi.fn();
    const route = withApiRoute(handler);

    const res = await route(makeRequest({ method: 'POST', headers: { origin: 'https://evil.example.com' } }), ctx);

    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: 'Invalid origin header' });
    expect(handler).not.toHaveBeenCalled();
  });

  it('calls the handler for an allowed origin', async () => {
    const route = withApiRoute(async () => Response.json({ ok: true }));

    const res = await route(makeRequest({ method: 'POST', headers: { origin: 'http://localhost:3000' } }), ctx);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it('masks 5xx errors as Internal Server Error', async () => {
    const route = withApiRoute(async () => {
      throw new Error('db exploded');
    });

    const res = await route(makeRequest(), ctx);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe('Internal Server Error');
    expect(body.statusCode).toBe(500);
  });

  it('preserves the message and status of errors carrying a 4xx statusCode', async () => {
    const route = withApiRoute(async () => {
      throw Object.assign(new Error('Not allowed'), { statusCode: 403 });
    });

    const res = await route(makeRequest(), ctx);
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error).toBe('Not allowed');
  });

  it('reports 5xx errors to Sentry with the request method and path', async () => {
    const error = new Error('db exploded');
    const route = withApiRoute(async () => {
      throw error;
    });

    await route(makeRequest({ method: 'POST', headers: { origin: 'http://localhost:3000' } }), ctx);

    expect(Sentry.captureException).toHaveBeenCalledWith(error, {
      tags: { route: '/api/trips', method: 'POST' },
    });
  });

  it('does not report expected 4xx errors to Sentry', async () => {
    const route = withApiRoute(async () => {
      throw Object.assign(new Error('Not allowed'), { statusCode: 403 });
    });

    await route(makeRequest(), ctx);

    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  it('omits the stack trace in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const route = withApiRoute(async () => {
      throw new Error('boom');
    });

    const res = await route(makeRequest({ headers: { origin: 'http://localhost:3000' } }), ctx);
    const body = await res.json();

    expect(body.stack).toBeUndefined();
  });
});

describe('requireAuth', () => {
  it('returns a 401 response when there is no user', async () => {
    const authService: IAuthService = { getCurrentUser: vi.fn().mockResolvedValue(null) };

    const result = await requireAuth(makeRequest(), authService);

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(401);
    expect(await (result as Response).json()).toEqual({ error: 'Unauthorized' });
  });

  it('returns the user and passes the request headers to the auth service', async () => {
    const user = { id: 'user-1', name: 'Test', email: 't@example.com', image: null };
    const getCurrentUser = vi.fn().mockResolvedValue(user);
    const request = makeRequest({ headers: { cookie: 'better-auth.session_token=abc' } });

    const result = await requireAuth(request, { getCurrentUser });

    expect(result).toEqual(user);
    expect(getCurrentUser).toHaveBeenCalledWith(request.headers);
  });
});

describe('rateLimit', () => {
  it('returns null when under the limit', async () => {
    expect(await rateLimit(makeLimiter(true), 'user-1')).toBeNull();
  });

  it('returns a 429 with an { error } body when over the limit', async () => {
    const res = await rateLimit(makeLimiter(false), 'user-1');

    expect(res?.status).toBe(429);
    expect(await res?.json()).toEqual({ error: 'Too many requests. Please try again later.' });
  });
});

describe('authRateLimit', () => {
  it('returns a 429 with the { message, code } body better-auth clients expect', async () => {
    const res = await authRateLimit(makeLimiter(false), '1.2.3.4');

    expect(res?.status).toBe(429);
    expect(await res?.json()).toEqual({
      message: 'Too many requests. Please try again later.',
      code: 'TOO_MANY_REQUESTS',
    });
  });
});

describe('getClientIp', () => {
  it('uses the first address in x-forwarded-for', () => {
    const request = makeRequest({ headers: { 'x-forwarded-for': '1.2.3.4, 10.0.0.1' } });
    expect(getClientIp(request)).toBe('1.2.3.4');
  });

  it('falls back to x-real-ip', () => {
    const request = makeRequest({ headers: { 'x-real-ip': '5.6.7.8' } });
    expect(getClientIp(request)).toBe('5.6.7.8');
  });

  it('returns "unknown" when no IP headers are present', () => {
    expect(getClientIp(makeRequest())).toBe('unknown');
  });
});

describe('badRequest', () => {
  it('returns a 400 with the given message', async () => {
    const res = badRequest('Name is required');
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Name is required' });
  });
});

describe('readJsonBody', () => {
  it('parses a JSON body', async () => {
    const request = makeRequest({ method: 'POST', body: JSON.stringify({ a: 1 }) });
    expect(await readJsonBody(request)).toEqual({ a: 1 });
  });

  it('returns undefined for an invalid or empty body', async () => {
    const request = makeRequest({ method: 'POST', body: 'not json' });
    expect(await readJsonBody(request)).toBeUndefined();
  });
});
