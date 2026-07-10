import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildTestApp } from '../../test/test-app.js';
import { createCheckEmailPlugin, type CheckEmailPluginDeps } from './check-email.routes.js';

function makeDeps(overrides: Partial<CheckEmailPluginDeps> = {}): CheckEmailPluginDeps {
  return {
    checkEmail: vi.fn().mockResolvedValue({ available: true }),
    apiRateLimiter: { limit: vi.fn().mockResolvedValue({ success: true, remaining: 99, reset: 0 }) },
    ...overrides,
  };
}

describe('createCheckEmailPlugin', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = await buildTestApp(createCheckEmailPlugin(makeDeps()), '/api');
  });

  afterAll(() => app?.close());

  it('returns 400 for a missing email query param', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/check-email' });
    expect(res.statusCode).toBe(400);
  });

  it('returns 429 when rate limited', async () => {
    const localApp = await buildTestApp(createCheckEmailPlugin(makeDeps({ apiRateLimiter: { limit: vi.fn().mockResolvedValue({ success: false, remaining: 0, reset: 0 }) } })), '/api');
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
    const localApp = await buildTestApp(createCheckEmailPlugin(makeDeps({ checkEmail: vi.fn().mockResolvedValue({ available: false }) })), '/api');
    const res = await localApp.inject({ method: 'GET', url: '/api/check-email?email=taken@example.com' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ available: false });
    await localApp.close();
  });
});
