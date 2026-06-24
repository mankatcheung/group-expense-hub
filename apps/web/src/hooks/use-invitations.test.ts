import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useSearchParams } from 'next/navigation';
import { useRouter } from '@/i18n/navigation';
import { useInvitations } from './use-invitations.js';
import { useTrip } from '@/context/TripContext';
import { api } from '@/services/api';
import { handleApiError } from '@/lib/error-handler';

const HOME_MESSAGES: Record<string, string> = {
  loadInvitationsFailed: 'Failed to load invitations',
  joinTripFailed: 'Failed to join trip',
  acceptInvitationFailed: 'Failed to accept invitation',
};

vi.mock('next/navigation', () => ({
  useSearchParams: vi.fn(),
}));

vi.mock('@/i18n/navigation', () => ({
  useRouter: vi.fn(),
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => HOME_MESSAGES[key] ?? key,
}));

vi.mock('@/context/TripContext', () => ({
  useTrip: vi.fn(),
}));

vi.mock('@/services/api', () => ({
  api: {
    getInvitations: vi.fn(),
    joinTrip: vi.fn(),
    acceptInvitation: vi.fn(),
  },
}));

vi.mock('@/lib/error-handler', () => ({
  handleApiError: vi.fn(),
}));

const push = vi.fn();
const refreshTrips = vi.fn();

function mockSearchParams(params: Record<string, string> = {}) {
  vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams(params) as never);
}

describe('useInvitations', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(useRouter).mockReturnValue({ push } as never);
    vi.mocked(useTrip).mockReturnValue({ refreshTrips } as never);
    vi.mocked(api.getInvitations).mockResolvedValue([]);
    mockSearchParams();
  });

  it('loads invitations on mount', async () => {
    const invitations = [
      {
        id: 'inv-1',
        token: 'token-1',
        tripId: 'trip-1',
        tripName: 'Bali',
        inviter: { id: 'owner-1', name: 'Owner', email: 'owner@example.com', image: null },
        createdAt: new Date().toISOString(),
      },
    ];
    vi.mocked(api.getInvitations).mockResolvedValue(invitations as never);

    const { result } = renderHook(() => useInvitations());

    expect(result.current.loadingInvitations).toBe(true);

    await waitFor(() => expect(result.current.loadingInvitations).toBe(false));

    expect(result.current.invitations).toEqual(invitations);
  });

  it('surfaces a load failure via handleApiError', async () => {
    vi.mocked(api.getInvitations).mockRejectedValue(new Error('boom'));

    const { result } = renderHook(() => useInvitations());

    await waitFor(() => expect(result.current.loadingInvitations).toBe(false));

    expect(handleApiError).toHaveBeenCalledWith(expect.any(Error), 'Failed to load invitations');
    expect(result.current.invitations).toEqual([]);
  });

  it('joins the trip automatically when a token query param is present', async () => {
    mockSearchParams({ token: 'invite-token' });
    vi.mocked(api.joinTrip).mockResolvedValue({ success: true, tripId: 'trip-1' });

    const { result } = renderHook(() => useInvitations());

    expect(result.current.isJoiningTrip).toBe(true);

    // isJoiningTrip intentionally stays true on success - the caller shows a
    // full-page loader until router.push completes the navigation away.
    await waitFor(() => expect(push).toHaveBeenCalledWith('/trip/trip-1'));

    expect(api.joinTrip).toHaveBeenCalledWith('invite-token');
    expect(refreshTrips).toHaveBeenCalled();
    expect(result.current.isJoiningTrip).toBe(true);
  });

  it('surfaces a join failure via handleApiError and stops the joining state', async () => {
    mockSearchParams({ token: 'invite-token' });
    vi.mocked(api.joinTrip).mockRejectedValue(new Error('boom'));

    const { result } = renderHook(() => useInvitations());

    await waitFor(() => expect(result.current.isJoiningTrip).toBe(false));

    expect(handleApiError).toHaveBeenCalledWith(expect.any(Error), 'Failed to join trip');
  });

  it('does not attempt to join when there is no token', async () => {
    const { result } = renderHook(() => useInvitations());

    await waitFor(() => expect(result.current.loadingInvitations).toBe(false));

    expect(api.joinTrip).not.toHaveBeenCalled();
    expect(result.current.isJoiningTrip).toBe(false);
  });

  it('accepts an invitation, removes it from the list, and navigates to the trip', async () => {
    const invitations = [
      {
        id: 'inv-1',
        token: 'token-1',
        tripId: 'trip-1',
        tripName: 'Bali',
        inviter: { id: 'owner-1', name: 'Owner', email: 'owner@example.com', image: null },
        createdAt: new Date().toISOString(),
      },
    ];
    vi.mocked(api.getInvitations).mockResolvedValue(invitations as never);
    vi.mocked(api.acceptInvitation).mockResolvedValue({ success: true, tripId: 'trip-1' });

    const { result } = renderHook(() => useInvitations());
    await waitFor(() => expect(result.current.loadingInvitations).toBe(false));

    await act(async () => {
      await result.current.handleAccept('inv-1');
    });

    expect(api.acceptInvitation).toHaveBeenCalledWith('inv-1');
    expect(refreshTrips).toHaveBeenCalled();
    expect(result.current.invitations).toEqual([]);
    expect(push).toHaveBeenCalledWith('/trip/trip-1');
    expect(result.current.acceptingId).toBeNull();
  });

  it('surfaces an accept failure via handleApiError and clears the accepting state', async () => {
    vi.mocked(api.acceptInvitation).mockRejectedValue(new Error('boom'));

    const { result } = renderHook(() => useInvitations());
    await waitFor(() => expect(result.current.loadingInvitations).toBe(false));

    await act(async () => {
      await result.current.handleAccept('inv-1');
    });

    expect(handleApiError).toHaveBeenCalledWith(expect.any(Error), 'Failed to accept invitation');
    expect(result.current.acceptingId).toBeNull();
  });
});
