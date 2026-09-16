import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { createCheckEmailRoutes, type CheckEmailRouteDeps } from './check-email.routes';
import { makeLimiter, makeRequest } from './test-helpers';

function makeDeps(overrides: Partial<CheckEmailRouteDeps> = {}): CheckEmailRouteDeps {
  return {
    checkEmail: vi.fn().mockResolvedValue({ available: true }),
    apiRateLimiter: makeLimiter(),
    ...overrides,
  };
}

describe('createCheckEmailRoutes', () => {
  it('returns 400 for a missing email query param', async () => {
    const res = await createCheckEmailRoutes(makeDeps()).check(makeRequest('GET', '/api/check-email'));
    expect(res.status).toBe(400);
  });

  it('returns 429 when rate limited', async () => {
    const res = await createCheckEmailRoutes(makeDeps({ apiRateLimiter: makeLimiter(false) })).check(
      makeRequest('GET', '/api/check-email?email=test@example.com')
    );
    expect(res.status).toBe(429);
  });

  it('rate-limits by client IP without requiring auth', async () => {
    const apiRateLimiter = makeLimiter();
    const request = new NextRequest('http://localhost:3000/api/check-email?email=test@example.com', {
      headers: { 'x-forwarded-for': '1.2.3.4' },
    });
    await createCheckEmailRoutes(makeDeps({ apiRateLimiter })).check(request);
    expect(apiRateLimiter.limit).toHaveBeenCalledWith('1.2.3.4');
  });

  it('returns { available: true } when the email is available', async () => {
    const checkEmail = vi.fn().mockResolvedValue({ available: true });
    const res = await createCheckEmailRoutes(makeDeps({ checkEmail })).check(makeRequest('GET', '/api/check-email?email=test@example.com'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ available: true });
    expect(checkEmail).toHaveBeenCalledWith('test@example.com');
  });

  it('returns { available: false } when the email is taken', async () => {
    const res = await createCheckEmailRoutes(makeDeps({ checkEmail: vi.fn().mockResolvedValue({ available: false }) })).check(
      makeRequest('GET', '/api/check-email?email=taken@example.com')
    );
    expect(await res.json()).toEqual({ available: false });
  });
});
