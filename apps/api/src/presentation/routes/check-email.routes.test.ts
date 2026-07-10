import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildTestApp } from '../../test/test-app.js';
import { createCheckEmailPlugin } from './check-email.routes.js';

const apiRateLimiter = { limit: vi.fn().mockResolvedValue({ success: true, remaining: 99, reset: 0 }) };

function makeDeps(overrides: Record<string, unknown> = {}) {
  return { checkEmail: vi.fn().mockResolvedValue({ available: true }), apiRateLimiter, ...overrides };
}

describe('createCheckEmailPlugin', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = await buildTestApp(createCheckEmailPlugin(makeDeps() as any), '/api');
  });

  afterAll(() => app?.close());

  it('returns 400 for a missing email query param', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/check-email' });
    expect(res.statusCode).toBe(400);
  });

  it('returns 429 when rate limited', async () => {
    const localApp = await buildTestApp(createCheckEmailPlugin(makeDeps({ apiRateLimiter: { limit: vi.fn().mockResolvedValue({ success: false, remaining: 0, reset: 0 }) } }) as any), '/api');
    const res = await localApp.inject({ method: 'GET', url: '/api/check-email?email=test@example.com' });
    expect(res.statusCode).toBe(429);
    await localApp.close();
  });

  it('returns { available: true } when the email is available', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/check-email?email=test@example.com' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ available: true });
  });

  it('returns { available: false } when the email is taken', async () => {
    const localApp = await buildTestApp(createCheckEmailPlugin(makeDeps({ checkEmail: vi.fn().mockResolvedValue({ available: false }) }) as any), '/api');
    const res = await localApp.inject({ method: 'GET', url: '/api/check-email?email=taken@example.com' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ available: false });
    await localApp.close();
  });
});
