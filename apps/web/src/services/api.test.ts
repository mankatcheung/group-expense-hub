import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { api } from './api.js';

describe('api', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function mockOk(data: unknown) {
    fetchMock.mockResolvedValue({ ok: true, json: async () => data });
  }

  describe('error handling', () => {
    it('throws the API-provided error message on a failed request', async () => {
      fetchMock.mockResolvedValue({ ok: false, json: async () => ({ error: 'Not authorized' }) });

      await expect(api.getTrips()).rejects.toThrow('Not authorized');
    });

    it('falls back to a generic message when the error body is not JSON', async () => {
      fetchMock.mockResolvedValue({ ok: false, json: async () => Promise.reject() });

      await expect(api.getTrips()).rejects.toThrow('Request failed');
    });

    it('sends credentials and JSON content-type by default', async () => {
      mockOk([]);

      await api.getTrips();

      expect(fetchMock).toHaveBeenCalledWith(
        '/api/trips',
        expect.objectContaining({
          credentials: 'include',
          headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
        })
      );
    });
  });

  describe('trip endpoints', () => {
    it('getTrip fetches a single trip by id', async () => {
      mockOk({ id: 'trip-1' });

      await api.getTrip('trip-1');

      expect(fetchMock).toHaveBeenCalledWith('/api/trips/trip-1', expect.objectContaining({}));
    });

    it('createTrip POSTs the trip payload', async () => {
      mockOk({ id: 'trip-1' });
      const trip = { id: 'trip-1', name: 'Bali' };

      await api.createTrip(trip);

      expect(fetchMock).toHaveBeenCalledWith(
        '/api/trips',
        expect.objectContaining({ method: 'POST', body: JSON.stringify(trip) })
      );
    });

    it('deleteTrip sends a DELETE', async () => {
      mockOk({ success: true });

      await api.deleteTrip('trip-1');

      expect(fetchMock).toHaveBeenCalledWith(
        '/api/trips/trip-1',
        expect.objectContaining({ method: 'DELETE' })
      );
    });

    it('updateTrip PUTs the new name', async () => {
      mockOk({ id: 'trip-1' });

      await api.updateTrip('trip-1', { name: 'Renamed' });

      expect(fetchMock).toHaveBeenCalledWith(
        '/api/trips/trip-1',
        expect.objectContaining({ method: 'PUT', body: JSON.stringify({ name: 'Renamed' }) })
      );
    });
  });

  describe('member endpoints', () => {
    const member = { id: 'm1', name: 'Alice', color: '#EF4444' };

    it('addMember POSTs the member', async () => {
      mockOk(member);

      await api.addMember('trip-1', member);

      expect(fetchMock).toHaveBeenCalledWith(
        '/api/trips/trip-1/members',
        expect.objectContaining({ method: 'POST', body: JSON.stringify(member) })
      );
    });

    it('updateMember PUTs the new name', async () => {
      mockOk(member);

      await api.updateMember('trip-1', 'm1', { name: 'New Name' });

      expect(fetchMock).toHaveBeenCalledWith(
        '/api/trips/trip-1/members/m1',
        expect.objectContaining({ method: 'PUT', body: JSON.stringify({ name: 'New Name' }) })
      );
    });

    it('removeMember sends a DELETE with the force flag in the query string', async () => {
      mockOk({ success: true });

      await api.removeMember('trip-1', 'm1', true);

      expect(fetchMock).toHaveBeenCalledWith(
        '/api/trips/trip-1/members/m1?force=true',
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });

  describe('expense endpoints', () => {
    const expense = {
      id: 'e1',
      description: 'Dinner',
      amount: 20,
      currency: 'USD',
      paidBy: 'm1',
      splitAmong: ['m1', 'm2'],
    };

    it('addExpense POSTs the expense', async () => {
      mockOk({ success: true });

      await api.addExpense('trip-1', expense);

      expect(fetchMock).toHaveBeenCalledWith(
        '/api/trips/trip-1/expenses',
        expect.objectContaining({ method: 'POST', body: JSON.stringify(expense) })
      );
    });

    it('updateExpense PUTs to the expense-specific path', async () => {
      mockOk({ success: true });

      await api.updateExpense('trip-1', expense);

      expect(fetchMock).toHaveBeenCalledWith(
        '/api/trips/trip-1/expenses/e1',
        expect.objectContaining({ method: 'PUT', body: JSON.stringify(expense) })
      );
    });

    it('removeExpense sends a DELETE', async () => {
      mockOk({ success: true });

      await api.removeExpense('trip-1', 'e1');

      expect(fetchMock).toHaveBeenCalledWith(
        '/api/trips/trip-1/expenses/e1',
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });

  describe('invitation and collaborator endpoints', () => {
    it('inviteMember POSTs the email', async () => {
      mockOk({ success: true });

      await api.inviteMember('trip-1', 'a@example.com');

      expect(fetchMock).toHaveBeenCalledWith(
        '/api/trips/trip-1/invite',
        expect.objectContaining({ method: 'POST', body: JSON.stringify({ email: 'a@example.com' }) })
      );
    });

    it('removeCollaborator sends a DELETE', async () => {
      mockOk({ success: true });

      await api.removeCollaborator('trip-1', 'tm-1');

      expect(fetchMock).toHaveBeenCalledWith(
        '/api/trips/trip-1/collaborators/tm-1',
        expect.objectContaining({ method: 'DELETE' })
      );
    });

    it('joinTrip POSTs to the token path', async () => {
      mockOk({ success: true, tripId: 'trip-1' });

      await api.joinTrip('token-1');

      expect(fetchMock).toHaveBeenCalledWith(
        '/api/trips/join/token-1',
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('getInvitations fetches the invitations list', async () => {
      mockOk([]);

      await api.getInvitations();

      expect(fetchMock).toHaveBeenCalledWith('/api/invitations', expect.objectContaining({}));
    });

    it('acceptInvitation POSTs to the accept path', async () => {
      mockOk({ success: true, tripId: 'trip-1' });

      await api.acceptInvitation('inv-1');

      expect(fetchMock).toHaveBeenCalledWith(
        '/api/invitations/inv-1/accept',
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  describe('user endpoints', () => {
    it('updateUserProfile PUTs the profile data', async () => {
      mockOk({ success: true });

      await api.updateUserProfile({ name: 'New Name' });

      expect(fetchMock).toHaveBeenCalledWith(
        '/api/user/profile',
        expect.objectContaining({ method: 'PUT', body: JSON.stringify({ name: 'New Name' }) })
      );
    });

    it('changePassword POSTs both passwords', async () => {
      mockOk({ success: true });

      await api.changePassword('old', 'new');

      expect(fetchMock).toHaveBeenCalledWith(
        '/api/user/password',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ currentPassword: 'old', newPassword: 'new' }),
        })
      );
    });

    it('checkEmailAvailable GETs with the email URL-encoded as a query param', async () => {
      mockOk({ available: true });

      await api.checkEmailAvailable('a+test@example.com');

      expect(fetchMock).toHaveBeenCalledWith(
        '/api/check-email?email=a%2Btest%40example.com',
        expect.objectContaining({})
      );
    });
  });
});
