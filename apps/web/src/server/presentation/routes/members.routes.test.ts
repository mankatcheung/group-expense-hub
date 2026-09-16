import { describe, it, expect, vi } from 'vitest';
import { createMemberRoutes, type MemberRouteDeps } from './members.routes';
import { authedService, ctx, makeLimiter, makeRequest, testUser, unauthedService } from './test-helpers';

const validBody = { id: '11111111-1111-1111-1111-111111111111', name: 'Alice', color: '#EF4444' };
const tripCtx = ctx({ id: 'trip-1' });
const memberCtx = ctx({ id: 'trip-1', memberId: 'member-1' });

function makeDeps(overrides: Partial<MemberRouteDeps> = {}): MemberRouteDeps {
  return {
    authService: authedService(),
    createMember: vi.fn(),
    updateMember: vi.fn(),
    deleteMember: vi.fn(),
    apiRateLimiter: makeLimiter(),
    ...overrides,
  };
}

describe('createMemberRoutes', () => {
  describe('create (POST /api/trips/:id/members)', () => {
    const create = (deps: Partial<MemberRouteDeps>, body: unknown = validBody) =>
      createMemberRoutes(makeDeps(deps)).create(makeRequest('POST', '/api/trips/trip-1/members', body), tripCtx);

    it('returns 401 when not authenticated', async () => {
      expect((await create({ authService: unauthedService() })).status).toBe(401);
    });

    it('returns 400 for an invalid body', async () => {
      expect((await create({}, { id: 'bad', name: '', color: 'red' })).status).toBe(400);
    });

    it('returns 429 when rate limited', async () => {
      expect((await create({ apiRateLimiter: makeLimiter(false) })).status).toBe(429);
    });

    it('returns 403 when forbidden', async () => {
      const res = await create({ createMember: vi.fn().mockResolvedValue({ type: 'error', reason: 'forbidden' }) });
      expect(res.status).toBe(403);
      expect(await res.json()).toEqual({ error: 'Not authorized to edit this trip' });
    });

    it('creates and returns the member', async () => {
      const member = { ...validBody, tripId: 'trip-1' };
      const createMember = vi.fn().mockResolvedValue({ type: 'success', member });
      const res = await create({ createMember });
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual(member);
      expect(createMember).toHaveBeenCalledWith('trip-1', validBody, testUser.id);
    });
  });

  describe('update (PUT /api/trips/:id/members/:memberId)', () => {
    const update = (deps: Partial<MemberRouteDeps>) =>
      createMemberRoutes(makeDeps(deps)).update(makeRequest('PUT', '/api/trips/trip-1/members/member-1', { name: 'New Name' }), memberCtx);

    it('returns 403 when forbidden', async () => {
      expect((await update({ updateMember: vi.fn().mockResolvedValue({ type: 'error', reason: 'forbidden' }) })).status).toBe(403);
    });

    it('returns 404 when not found', async () => {
      const res = await update({ updateMember: vi.fn().mockResolvedValue({ type: 'error', reason: 'not_found' }) });
      expect(res.status).toBe(404);
      expect(await res.json()).toEqual({ error: 'Member not found' });
    });

    it('updates and returns the member', async () => {
      const member = { id: 'member-1', name: 'New Name', color: '#aaa', tripId: 'trip-1' };
      const updateMember = vi.fn().mockResolvedValue({ type: 'success', member });
      const res = await update({ updateMember });
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual(member);
      expect(updateMember).toHaveBeenCalledWith('trip-1', 'member-1', 'New Name', testUser.id);
    });
  });

  describe('remove (DELETE /api/trips/:id/members/:memberId)', () => {
    const remove = (deps: Partial<MemberRouteDeps>) =>
      createMemberRoutes(makeDeps(deps)).remove(makeRequest('DELETE', '/api/trips/trip-1/members/member-1?force=true'), memberCtx);

    it('returns 429 when rate limited', async () => {
      expect((await remove({ apiRateLimiter: makeLimiter(false) })).status).toBe(429);
    });

    it('returns 403 when forbidden', async () => {
      expect((await remove({ deleteMember: vi.fn().mockResolvedValue({ type: 'error', reason: 'forbidden' }) })).status).toBe(403);
    });

    it('returns 404 when not found', async () => {
      expect((await remove({ deleteMember: vi.fn().mockResolvedValue({ type: 'error', reason: 'not_found' }) })).status).toBe(404);
    });

    it('returns the expense warning with HTTP 200 when the member has expenses', async () => {
      const res = await remove({ deleteMember: vi.fn().mockResolvedValue({ type: 'has_expenses', expenseCount: 3, memberName: 'Alice' }) });
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ error: 'Member has expenses', expenseCount: 3, memberName: 'Alice' });
    });

    it('deletes and returns success', async () => {
      const deleteMember = vi.fn().mockResolvedValue({ type: 'success' });
      const res = await remove({ deleteMember });
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ success: true });
      expect(deleteMember).toHaveBeenCalledWith('trip-1', 'member-1', testUser.id);
    });
  });
});
