import { randomUUID } from 'crypto';
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { createTestDb, type TestDb } from '../../test/test-db';
import type { AppRegistry } from '../../container/tokens';

// Exercises the real stack in-process: app/api route files -> withApiRoute ->
// route factories -> DI container -> use cases -> Prisma -> migrated SQLite,
// with sessions issued by the real better-auth handler.

const ORIGIN = 'http://localhost:3000';
const APP = '../../../../app/api';

let db: TestDb;
let routes: Awaited<ReturnType<typeof loadRoutes>>;

async function loadRoutes() {
  return {
    auth: await import(`${APP}/auth/[...all]/route`),
    trips: await import(`${APP}/trips/route`),
    trip: await import(`${APP}/trips/[id]/route`),
    invite: await import(`${APP}/trips/[id]/invite/route`),
    collaborator: await import(`${APP}/trips/[id]/collaborators/[memberId]/route`),
    join: await import(`${APP}/trips/join/[token]/route`),
    members: await import(`${APP}/trips/[id]/members/route`),
    member: await import(`${APP}/trips/[id]/members/[memberId]/route`),
    expenses: await import(`${APP}/trips/[id]/expenses/route`),
    expense: await import(`${APP}/trips/[id]/expenses/[expenseId]/route`),
    invitations: await import(`${APP}/invitations/route`),
    accept: await import(`${APP}/invitations/[id]/accept/route`),
    profile: await import(`${APP}/user/profile/route`),
    password: await import(`${APP}/user/password/route`),
    checkEmail: await import(`${APP}/check-email/route`),
  };
}

type Handler = (request: NextRequest, context: { params: Promise<Record<string, string>> }) => Promise<Response>;

async function call(
  handler: Handler,
  method: string,
  path: string,
  { cookie, body, params = {}, origin = ORIGIN }: { cookie?: string; body?: unknown; params?: Record<string, string>; origin?: string } = {}
) {
  const headers: Record<string, string> = { origin };
  if (cookie) headers.cookie = cookie;
  if (body !== undefined) headers['content-type'] = 'application/json';
  const res = await handler(
    new NextRequest(`${ORIGIN}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) }),
    { params: Promise.resolve(params) }
  );
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null, headers: res.headers };
}

async function signUp(email = `${randomUUID()}@example.com`, name = 'User') {
  const res = await call(routes.auth.POST, 'POST', '/api/auth/sign-up/email', { body: { email, password: 'password123', name } });
  expect(res.status).toBe(200);
  const cookie = res.headers
    .getSetCookie()
    .map((c) => c.split(';')[0])
    .join('; ');
  return { cookie, email, userId: res.body.user.id as string };
}

beforeAll(async () => {
  db = await createTestDb();
  vi.stubEnv('TURSO_DATABASE_URL', db.url);
  vi.stubEnv('TURSO_AUTH_TOKEN', '');
  vi.stubEnv('BETTER_AUTH_SECRET', 'integration-test-secret-0123456789abcdef');
  vi.stubEnv('NEXT_PUBLIC_APP_URL', ORIGIN);
  vi.stubEnv('AUTH_RATE_LIMIT_MAX', '1000');
  vi.stubEnv('BREVO_API_KEY', '');
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  // db/prisma.ts reuses a client cached on globalThis outside production.
  delete (globalThis as { prisma?: unknown }).prisma;
  routes = await loadRoutes();
});

afterAll(async () => {
  const { prisma } = await import('../../db/prisma');
  await prisma.$disconnect();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  await db.cleanup();
});

describe('DI container', () => {
  it('resolves every registered dependency and is a singleton', async () => {
    const { getContainer } = await import('../../container');
    const tokens = [
      'PRISMA_CLIENT', 'CACHE', 'PRISMA_TRIP_REPOSITORY', 'TRIP_REPOSITORY', 'EXPENSE_REPOSITORY', 'MEMBER_REPOSITORY',
      'INVITATION_REPOSITORY', 'USER_REPOSITORY', 'TRIP_MEMBER_REPOSITORY', 'AUTH_SERVICE', 'EMAIL_SERVICE',
      'AUTH_RATE_LIMITER', 'API_RATE_LIMITER', 'EMAIL_RATE_LIMITER', 'TRIP_ACCESS_SERVICE', 'TRANSACTION_MANAGER',
      'GET_TRIPS_USE_CASE', 'CREATE_TRIP_USE_CASE', 'GET_TRIP_USE_CASE', 'UPDATE_TRIP_USE_CASE', 'DELETE_TRIP_USE_CASE',
      'INVITE_MEMBER_USE_CASE', 'JOIN_TRIP_USE_CASE', 'REMOVE_COLLABORATOR_USE_CASE', 'CREATE_EXPENSE_USE_CASE',
      'UPDATE_EXPENSE_USE_CASE', 'DELETE_EXPENSE_USE_CASE', 'CREATE_MEMBER_USE_CASE', 'UPDATE_MEMBER_USE_CASE',
      'DELETE_MEMBER_USE_CASE', 'GET_INVITATIONS_USE_CASE', 'ACCEPT_INVITATION_USE_CASE', 'UPDATE_PROFILE_USE_CASE',
      'CHECK_EMAIL_USE_CASE',
    ] as const satisfies readonly (keyof AppRegistry)[];

    const container = getContainer();
    for (const token of tokens) {
      expect(container.get(token), token).toBeDefined();
    }
    expect(getContainer()).toBe(container);
    // Rate limiters and cache must be shared instances, or limits reset per request.
    expect(container.get('API_RATE_LIMITER')).toBe(container.get('API_RATE_LIMITER'));
    expect(container.get('CACHE')).toBe(container.get('CACHE'));
  });
});

describe('API routes against a real database', () => {
  it('rejects unauthenticated and cross-origin requests', async () => {
    expect((await call(routes.trips.GET, 'GET', '/api/trips')).status).toBe(401);
    const owner = await signUp();
    const crossOrigin = await call(routes.trips.POST, 'POST', '/api/trips', {
      cookie: owner.cookie,
      origin: 'https://evil.example.com',
      body: { id: randomUUID(), name: 'CSRF' },
    });
    expect(crossOrigin.status).toBe(403);
    expect((await call(routes.password.POST, 'POST', '/api/user/password')).status).toBe(401);
  });

  it('runs a full trip lifecycle across owner, collaborators, and invitees', async () => {
    const owner = await signUp(undefined, 'Olivia');
    const bob = await signUp(undefined, 'Bob');
    const tripId = randomUUID();
    const aliceId = randomUUID();
    const carlId = randomUUID();
    const expenseId = randomUUID();
    const tripParams = { id: tripId };

    // Trip
    expect((await call(routes.trips.POST, 'POST', '/api/trips', { cookie: owner.cookie, body: { id: tripId, name: 'Bali' } })).body).toMatchObject({ id: tripId, isOwner: true });
    expect((await call(routes.trip.PUT, 'PUT', `/api/trips/${tripId}`, { cookie: owner.cookie, params: tripParams, body: { name: 'Bali 2026' } })).body).toMatchObject({ name: 'Bali 2026' });
    expect((await call(routes.trip.GET, 'GET', `/api/trips/${tripId}`, { cookie: bob.cookie, params: tripParams })).status).toBe(404);

    // Members and expenses
    await call(routes.members.POST, 'POST', `/api/trips/${tripId}/members`, { cookie: owner.cookie, params: tripParams, body: { id: aliceId, name: 'Alice', color: '#EF4444' } });
    await call(routes.members.POST, 'POST', `/api/trips/${tripId}/members`, { cookie: owner.cookie, params: tripParams, body: { id: carlId, name: 'Carl', color: '#3B82F6' } });
    expect(
      (await call(routes.member.PUT, 'PUT', `/api/trips/${tripId}/members/${aliceId}`, { cookie: owner.cookie, params: { id: tripId, memberId: aliceId }, body: { name: 'Alice A' } })).body
    ).toMatchObject({ name: 'Alice A' });
    const expense = { id: expenseId, description: 'Dinner', amount: 90, currency: 'USD', paidBy: aliceId, splitAmong: [aliceId, carlId] };
    expect((await call(routes.expenses.POST, 'POST', `/api/trips/${tripId}/expenses`, { cookie: owner.cookie, params: tripParams, body: expense })).body).toEqual({ success: true });
    expect(
      (await call(routes.expense.PUT, 'PUT', `/api/trips/${tripId}/expenses/${expenseId}`, { cookie: owner.cookie, params: { id: tripId, expenseId }, body: { ...expense, amount: 120 } })).body
    ).toEqual({ success: true });
    expect(
      (await call(routes.member.DELETE, 'DELETE', `/api/trips/${tripId}/members/${aliceId}`, { cookie: owner.cookie, params: { id: tripId, memberId: aliceId } })).body
    ).toEqual({ error: 'Member has expenses', expenseCount: 1, memberName: 'Alice A' });

    const detail = await call(routes.trip.GET, 'GET', `/api/trips/${tripId}`, { cookie: owner.cookie, params: tripParams });
    expect(detail.body.expenses).toEqual([expect.objectContaining({ id: expenseId, amount: 120, splitAmong: expect.arrayContaining([aliceId, carlId]) })]);
    expect((await call(routes.trips.GET, 'GET', '/api/trips', { cookie: owner.cookie })).body).toEqual([
      expect.objectContaining({ id: tripId, memberCount: 2, expenseCount: 1, totalsByCurrency: { USD: 120 } }),
    ]);

    // Direct add of a registered user
    const added = await call(routes.invite.POST, 'POST', `/api/trips/${tripId}/invite`, { cookie: owner.cookie, params: tripParams, body: { email: bob.email } });
    expect(added.body).toMatchObject({ success: true, message: 'User added to trip', user: { id: bob.userId } });
    expect((await call(routes.trip.GET, 'GET', `/api/trips/${tripId}`, { cookie: bob.cookie, params: tripParams })).status).toBe(200);

    // Invitation accepted after sign-up
    const cathyEmail = `${randomUUID()}@example.com`;
    expect((await call(routes.invite.POST, 'POST', `/api/trips/${tripId}/invite`, { cookie: owner.cookie, params: tripParams, body: { email: cathyEmail } })).body).toMatchObject({ pending: true });
    const cathy = await signUp(cathyEmail, 'Cathy');
    const invitations = await call(routes.invitations.GET, 'GET', '/api/invitations', { cookie: cathy.cookie });
    expect(invitations.body).toEqual([expect.objectContaining({ tripId, tripName: 'Bali 2026' })]);
    const invitationId = invitations.body[0].id;
    expect((await call(routes.accept.POST, 'POST', `/api/invitations/${invitationId}/accept`, { cookie: cathy.cookie, params: { id: invitationId } })).body).toEqual({ success: true, tripId });

    // Invitation joined by token
    const daveEmail = `${randomUUID()}@example.com`;
    await call(routes.invite.POST, 'POST', `/api/trips/${tripId}/invite`, { cookie: owner.cookie, params: tripParams, body: { email: daveEmail } });
    const dave = await signUp(daveEmail, 'Dave');
    const token = (await call(routes.invitations.GET, 'GET', '/api/invitations', { cookie: dave.cookie })).body[0].token;
    expect((await call(routes.join.POST, 'POST', `/api/trips/join/${token}`, { cookie: dave.cookie, params: { token } })).body).toEqual({ success: true, tripId });

    // Collaborator removal
    const tripMembers = (await call(routes.trip.GET, 'GET', `/api/trips/${tripId}`, { cookie: owner.cookie, params: tripParams })).body.tripMembers;
    expect(tripMembers).toHaveLength(3);
    const bobMembership = tripMembers.find((tm: { userId: string }) => tm.userId === bob.userId);
    expect(
      (await call(routes.collaborator.DELETE, 'DELETE', `/api/trips/${tripId}/collaborators/${bobMembership.id}`, { cookie: bob.cookie, params: { id: tripId, memberId: bobMembership.id } })).status
    ).toBe(403);
    expect(
      (await call(routes.collaborator.DELETE, 'DELETE', `/api/trips/${tripId}/collaborators/${bobMembership.id}`, { cookie: owner.cookie, params: { id: tripId, memberId: bobMembership.id } })).body
    ).toEqual({ success: true });
    expect((await call(routes.trip.GET, 'GET', `/api/trips/${tripId}`, { cookie: bob.cookie, params: tripParams })).status).toBe(404);

    // Cleanup routes
    expect((await call(routes.expense.DELETE, 'DELETE', `/api/trips/${tripId}/expenses/${expenseId}`, { cookie: owner.cookie, params: { id: tripId, expenseId } })).body).toEqual({ success: true });
    expect((await call(routes.trip.DELETE, 'DELETE', `/api/trips/${tripId}`, { cookie: owner.cookie, params: tripParams })).body).toEqual({ success: true });
    expect((await call(routes.trip.GET, 'GET', `/api/trips/${tripId}`, { cookie: owner.cookie, params: tripParams })).status).toBe(404);
  });

  it('updates the profile and reports email availability from the database', async () => {
    const user = await signUp(undefined, 'Pat');
    const other = await signUp();

    expect((await call(routes.checkEmail.GET, 'GET', `/api/check-email?email=${encodeURIComponent(user.email)}`)).body).toEqual({ available: false });
    expect((await call(routes.checkEmail.GET, 'GET', `/api/check-email?email=${encodeURIComponent(`${randomUUID()}@example.com`)}`)).body).toEqual({ available: true });
    expect((await call(routes.profile.PUT, 'PUT', '/api/user/profile', { cookie: user.cookie, body: { name: 'Patricia' } })).body).toEqual({ success: true });
    expect((await call(routes.profile.PUT, 'PUT', '/api/user/profile', { cookie: user.cookie, body: { email: other.email } })).status).toBe(400);
    expect((await call(routes.password.POST, 'POST', '/api/user/password', { cookie: user.cookie, body: {} })).body).toEqual({ success: true });

    // The session is cached in a signed cookie for 5 minutes, so a plain
    // get-session still reports the old name. Bypassing the cache reads the
    // database and re-issues the cache cookie, which AuthContext.refreshUser
    // relies on after a profile change.
    const cached = await call(routes.auth.GET, 'GET', '/api/auth/get-session', { cookie: user.cookie });
    expect(cached.body.user.name).toBe('Pat');

    const fresh = await call(routes.auth.GET, 'GET', '/api/auth/get-session?disableCookieCache=true', { cookie: user.cookie });
    expect(fresh.body.user).toMatchObject({ name: 'Patricia', email: user.email });

    const refreshedCookies = new Map(user.cookie.split('; ').map((c) => [c.split('=')[0], c] as const));
    for (const setCookie of fresh.headers.getSetCookie()) {
      const pair = setCookie.split(';')[0]!;
      refreshedCookies.set(pair.split('=')[0]!, pair);
    }
    const afterRefresh = await call(routes.auth.GET, 'GET', '/api/auth/get-session', { cookie: [...refreshedCookies.values()].join('; ') });
    expect(afterRefresh.body.user.name).toBe('Patricia');
  });
});
