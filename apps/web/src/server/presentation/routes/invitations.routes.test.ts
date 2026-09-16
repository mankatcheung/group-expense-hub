import { describe, it, expect, vi } from 'vitest';
import { createInvitationRoutes, type InvitationRouteDeps } from './invitations.routes';
import { authedService, ctx, makeLimiter, makeRequest, testUser, unauthedService } from './test-helpers';

const pendingInvitation = {
  id: 'inv-1', token: 'token-1', tripId: 'trip-1',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  trip: { name: 'Bali', user: { id: 'owner-1', name: 'Owner', email: 'owner@example.com', image: null } },
};

function makeDeps(overrides: Partial<InvitationRouteDeps> = {}): InvitationRouteDeps {
  return {
    authService: authedService(),
    getInvitations: vi.fn().mockResolvedValue([]),
    acceptInvitation: vi.fn(),
    apiRateLimiter: makeLimiter(),
    ...overrides,
  };
}

describe('createInvitationRoutes', () => {
  describe('list (GET /api/invitations)', () => {
    it('returns 401 when not authenticated', async () => {
      const res = await createInvitationRoutes(makeDeps({ authService: unauthedService() })).list(makeRequest('GET', '/api/invitations'));
      expect(res.status).toBe(401);
    });

    it('returns formatted pending invitations for the user email', async () => {
      const getInvitations = vi.fn().mockResolvedValue([pendingInvitation]);
      const res = await createInvitationRoutes(makeDeps({ getInvitations })).list(makeRequest('GET', '/api/invitations'));
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual([{
        id: 'inv-1', token: 'token-1', tripId: 'trip-1', tripName: 'Bali',
        inviter: { id: 'owner-1', name: 'Owner', email: 'owner@example.com', image: null },
        createdAt: '2026-01-01T00:00:00.000Z',
      }]);
      expect(getInvitations).toHaveBeenCalledWith(testUser.email);
    });

    it('returns an empty array when there are no invitations', async () => {
      const res = await createInvitationRoutes(makeDeps()).list(makeRequest('GET', '/api/invitations'));
      expect(await res.json()).toEqual([]);
    });
  });

  describe('accept (POST /api/invitations/:id/accept)', () => {
    const accept = (deps: Partial<InvitationRouteDeps>) =>
      createInvitationRoutes(makeDeps(deps)).accept(makeRequest('POST', '/api/invitations/inv-1/accept'), ctx({ id: 'inv-1' }));

    it('returns 429 when rate limited', async () => {
      expect((await accept({ apiRateLimiter: makeLimiter(false) })).status).toBe(429);
    });

    it.each([
      ['not_found', 404, 'Invitation not found'],
      ['wrong_user', 403, 'This invitation is not for you'],
      ['expired', 400, 'Invitation expired'],
      ['already_used', 400, 'Invitation already used'],
      ['already_member', 400, 'Already a member'],
    ])('maps error reason %s to %i', async (reason, status, message) => {
      const res = await accept({ acceptInvitation: vi.fn().mockResolvedValue({ type: 'error', reason }) });
      expect(res.status).toBe(status);
      expect(await res.json()).toEqual({ error: message });
    });

    it('accepts and returns tripId', async () => {
      const acceptInvitation = vi.fn().mockResolvedValue({ type: 'success', tripId: 'trip-1' });
      const res = await accept({ acceptInvitation });
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ success: true, tripId: 'trip-1' });
      expect(acceptInvitation).toHaveBeenCalledWith('inv-1', testUser);
    });
  });
});
