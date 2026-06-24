import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { randomUUID } from 'crypto';
import type { FastifyInstance } from 'fastify';
import { buildE2EApp } from './app.js';

async function signUp(app: FastifyInstance, email: string, name: string) {
  const res = await app.inject({
    method: 'POST',
    url: '/api/auth/sign-up/email',
    headers: { origin: 'http://localhost:3000' },
    payload: { email, password: 'password123', name },
  });
  if (res.statusCode !== 200) {
    throw new Error(`Sign-up failed: ${res.statusCode} ${res.body}`);
  }
  const cookie = res.cookies.map((c) => `${c.name}=${c.value}`).join('; ');
  return { cookie, userId: res.json().user.id as string };
}

describe('trip flow e2e', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildE2EApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('signs up a new user and returns a usable session cookie', async () => {
    const { cookie, userId } = await signUp(app, `owner-${randomUUID()}@example.com`, 'Owner');

    expect(cookie).toContain('better-auth.session_token=');
    expect(userId).toBeTruthy();
  });

  it('lets the authenticated user create a trip', async () => {
    const { cookie } = await signUp(app, `owner-${randomUUID()}@example.com`, 'Owner');
    const tripId = randomUUID();

    const res = await app.inject({
      method: 'POST',
      url: '/api/trips',
      headers: { cookie },
      payload: { id: tripId, name: 'Bali Trip' },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ id: tripId, name: 'Bali Trip', isOwner: true });
  });

  it('persists an added member and expense, visible on the full trip detail', async () => {
    const { cookie } = await signUp(app, `owner-${randomUUID()}@example.com`, 'Owner');
    const tripId = randomUUID();

    await app.inject({
      method: 'POST',
      url: '/api/trips',
      headers: { cookie },
      payload: { id: tripId, name: 'Tokyo Trip' },
    });

    const memberId = randomUUID();
    const memberRes = await app.inject({
      method: 'POST',
      url: `/api/trips/${tripId}/members`,
      headers: { cookie },
      payload: { id: memberId, name: 'Alice', color: '#EF4444' },
    });
    expect(memberRes.statusCode).toBe(200);

    const expenseId = randomUUID();
    const expenseRes = await app.inject({
      method: 'POST',
      url: `/api/trips/${tripId}/expenses`,
      headers: { cookie },
      payload: {
        id: expenseId,
        description: 'Dinner',
        amount: 42.5,
        currency: 'USD',
        paidBy: memberId,
        splitAmong: [memberId],
      },
    });
    expect(expenseRes.statusCode).toBe(200);

    const detailRes = await app.inject({
      method: 'GET',
      url: `/api/trips/${tripId}`,
      headers: { cookie },
    });

    expect(detailRes.statusCode).toBe(200);
    const detail = detailRes.json();
    expect(detail.members).toEqual([{ id: memberId, name: 'Alice', color: '#EF4444' }]);
    expect(detail.expenses).toHaveLength(1);
    expect(detail.expenses[0]).toMatchObject({
      id: expenseId,
      description: 'Dinner',
      amount: 42.5,
      currency: 'USD',
      paidBy: memberId,
      splitAmong: [memberId],
    });
  });

  it('reports a never-registered email as available', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/check-email?email=never-registered-${randomUUID()}@example.com`,
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ available: true });
  });

  it('reports a just-registered email as unavailable, proving the databaseHooks wiring fires against the real app', async () => {
    const email = `taken-${randomUUID()}@example.com`;
    await signUp(app, email, 'Taken');

    const res = await app.inject({
      method: 'GET',
      url: `/api/check-email?email=${encodeURIComponent(email)}`,
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ available: false });
  });

  it('denies a different user access to someone else’s trip', async () => {
    const owner = await signUp(app, `owner-${randomUUID()}@example.com`, 'Owner');
    const stranger = await signUp(app, `stranger-${randomUUID()}@example.com`, 'Stranger');
    const tripId = randomUUID();

    await app.inject({
      method: 'POST',
      url: '/api/trips',
      headers: { cookie: owner.cookie },
      payload: { id: tripId, name: 'Private Trip' },
    });

    const res = await app.inject({
      method: 'GET',
      url: `/api/trips/${tripId}`,
      headers: { cookie: stranger.cookie },
    });

    expect(res.statusCode).toBe(404);
  });
});
