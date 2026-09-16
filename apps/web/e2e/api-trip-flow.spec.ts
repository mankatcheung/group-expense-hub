import { randomUUID } from 'crypto';
import { test, expect, type APIRequestContext } from '@playwright/test';

// API-level journeys against the real Next.js server and test database,
// covering behavior the browser specs don't assert directly: exact response
// shapes, check-email against real users, and cross-user access denial.

type Session = { api: APIRequestContext; userId: string };

async function signUp(
  playwright: { request: { newContext: (options: object) => Promise<APIRequestContext> } },
  baseURL: string,
  label: string
): Promise<Session> {
  const api = await playwright.request.newContext({ baseURL, extraHTTPHeaders: { origin: baseURL } });
  const res = await api.post('/api/auth/sign-up/email', {
    data: { email: `${label}-${randomUUID()}@example.com`, password: 'password123', name: label },
  });
  expect(res.status(), await res.text()).toBe(200);
  const body = await res.json();
  return { api, userId: body.user.id };
}

test.describe('API trip flow', () => {
  test('sign-up returns a session cookie that authenticates API calls', async ({ playwright, baseURL }) => {
    const { api, userId } = await signUp(playwright, baseURL!, 'owner');

    expect(userId).toBeTruthy();
    const cookies = await api.storageState();
    expect(cookies.cookies.map((c) => c.name)).toContain('better-auth.session_token');
    expect((await api.get('/api/trips')).status()).toBe(200);

    await api.dispose();
  });

  test('persists a trip, member, and expense with the expected response shapes', async ({ playwright, baseURL }) => {
    const { api } = await signUp(playwright, baseURL!, 'owner');
    const tripId = randomUUID();
    const memberId = randomUUID();
    const expenseId = randomUUID();

    const tripRes = await api.post('/api/trips', { data: { id: tripId, name: 'Tokyo Trip' } });
    expect(tripRes.status()).toBe(200);
    expect(await tripRes.json()).toMatchObject({ id: tripId, name: 'Tokyo Trip', isOwner: true });

    const memberRes = await api.post(`/api/trips/${tripId}/members`, {
      data: { id: memberId, name: 'Alice', color: '#EF4444' },
    });
    expect(memberRes.status()).toBe(200);

    const expenseRes = await api.post(`/api/trips/${tripId}/expenses`, {
      data: { id: expenseId, description: 'Dinner', amount: 42.5, currency: 'USD', paidBy: memberId, splitAmong: [memberId] },
    });
    expect(expenseRes.status()).toBe(200);
    expect(await expenseRes.json()).toEqual({ success: true });

    const detailRes = await api.get(`/api/trips/${tripId}`);
    expect(detailRes.status()).toBe(200);
    const detail = await detailRes.json();
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

    await api.dispose();
  });

  test('check-email reports registered and unregistered emails correctly', async ({ playwright, baseURL }) => {
    const anon = await playwright.request.newContext({ baseURL });
    const email = `taken-${randomUUID()}@example.com`;

    const before = await anon.get(`/api/check-email?email=${encodeURIComponent(email)}`);
    expect(before.status()).toBe(200);
    expect(await before.json()).toEqual({ available: true });

    const signUpRes = await anon.post('/api/auth/sign-up/email', {
      headers: { origin: baseURL! },
      data: { email, password: 'password123', name: 'Taken' },
    });
    expect(signUpRes.status()).toBe(200);

    const after = await anon.get(`/api/check-email?email=${encodeURIComponent(email)}`);
    expect(await after.json()).toEqual({ available: false });

    await anon.dispose();
  });

  test("denies another user access to someone else's trip", async ({ playwright, baseURL }) => {
    const owner = await signUp(playwright, baseURL!, 'owner');
    const stranger = await signUp(playwright, baseURL!, 'stranger');
    const tripId = randomUUID();

    expect((await owner.api.post('/api/trips', { data: { id: tripId, name: 'Private Trip' } })).status()).toBe(200);

    const read = await stranger.api.get(`/api/trips/${tripId}`);
    expect(read.status()).toBe(404);
    const rename = await stranger.api.put(`/api/trips/${tripId}`, { data: { name: 'Hijacked' } });
    expect(rename.status()).toBe(403);

    await owner.api.dispose();
    await stranger.api.dispose();
  });

  test('rejects API writes from an untrusted origin', async ({ playwright, baseURL }) => {
    const { api } = await signUp(playwright, baseURL!, 'owner');

    const res = await api.post('/api/trips', {
      headers: { origin: 'https://evil.example.com' },
      data: { id: randomUUID(), name: 'CSRF Trip' },
    });
    expect(res.status()).toBe(403);

    await api.dispose();
  });
});
