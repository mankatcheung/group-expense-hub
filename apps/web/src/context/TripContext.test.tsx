import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { TripProvider, useTrip } from '@/context/TripContext';
import { AuthProvider } from '@/context/AuthContext';
import { useTripDetail } from '@/hooks/use-trip-detail';
import { api } from '@/services/api';
import { authClient } from '@/lib/auth-client';
import { handleApiError } from '@/lib/error-handler';
import type { Trip, TripSummary } from '@/lib/types';

vi.mock('@/services/api', () => ({
  api: {
    getTrips: vi.fn(),
    getTrip: vi.fn(),
    createTrip: vi.fn(),
    deleteTrip: vi.fn(),
    updateTrip: vi.fn(),
    addMember: vi.fn(),
    updateMember: vi.fn(),
    removeMember: vi.fn(),
    addExpense: vi.fn(),
    updateExpense: vi.fn(),
    removeExpense: vi.fn(),
    inviteMember: vi.fn(),
    removeCollaborator: vi.fn(),
  },
}));

vi.mock('@/lib/error-handler', () => ({
  handleApiError: vi.fn(),
}));

vi.mock('@/lib/auth-client', () => ({
  authClient: {
    useSession: vi.fn(),
    signIn: { email: vi.fn() },
    signUp: { email: vi.fn() },
    signOut: vi.fn(),
  },
}));

function mockAuthenticatedSession() {
  vi.mocked(authClient.useSession).mockReturnValue({
    data: {
      user: { id: 'user-1', name: 'Test User', email: 'test@example.com' },
      session: { id: 'session-1' },
    },
    isPending: false,
    refetch: vi.fn(),
  } as never);
}

function makeSummary(overrides: Partial<TripSummary> = {}): TripSummary {
  return {
    id: 'trip-1',
    name: 'Beach Trip',
    createdAt: new Date().toISOString(),
    isOwner: true,
    owner: null,
    memberCount: 0,
    expenseCount: 0,
    totalsByCurrency: {},
    ...overrides,
  };
}

function makeTrip(overrides: Partial<Trip> = {}): Trip {
  return {
    id: 'trip-1',
    name: 'Beach Trip',
    members: [],
    tripMembers: [],
    expenses: [],
    createdAt: new Date().toISOString(),
    isOwner: true,
    owner: null,
    ...overrides,
  };
}

function newQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

describe('TripContext', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockAuthenticatedSession();
  });

  function renderTripHook(initialTrips: TripSummary[]) {
    vi.mocked(api.getTrips).mockResolvedValue(initialTrips);
    const queryClient = newQueryClient();

    function wrapper({ children }: { children: ReactNode }) {
      return (
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <TripProvider>{children}</TripProvider>
          </AuthProvider>
        </QueryClientProvider>
      );
    }

    return renderHook(() => useTrip(), { wrapper });
  }

  it('loads trips from the API', async () => {
    const summary = makeSummary();
    const { result } = renderTripHook([summary]);

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.trips).toEqual([summary]);
  });

  it('does not fetch trips while there is no authenticated session', async () => {
    vi.mocked(authClient.useSession).mockReturnValue({
      data: null,
      isPending: false,
      refetch: vi.fn(),
    } as never);
    vi.mocked(api.getTrips).mockResolvedValue([makeSummary()]);

    renderTripHook([]);

    // Give any (incorrectly) in-flight fetch a chance to fire.
    await act(async () => {
      await Promise.resolve();
    });

    expect(vi.mocked(api.getTrips)).not.toHaveBeenCalled();
  });

  it('fetches trips once authentication resolves to a session', async () => {
    vi.mocked(authClient.useSession).mockReturnValue({
      data: null,
      isPending: false,
      refetch: vi.fn(),
    } as never);
    const summary = makeSummary();
    vi.mocked(api.getTrips).mockResolvedValue([summary]);

    const queryClient = newQueryClient();
    function wrapper({ children }: { children: ReactNode }) {
      return (
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <TripProvider>{children}</TripProvider>
          </AuthProvider>
        </QueryClientProvider>
      );
    }
    const { result, rerender } = renderHook(() => useTrip(), { wrapper });

    expect(vi.mocked(api.getTrips)).not.toHaveBeenCalled();

    // Simulate a successful login: the session query now resolves to an
    // authenticated user.
    mockAuthenticatedSession();
    rerender();

    await waitFor(() => {
      expect(vi.mocked(api.getTrips)).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(result.current.trips).toEqual([summary]);
    });
  });

  it('rolls back an optimistic delete when the mutation fails', async () => {
    const summary = makeSummary();
    const { result } = renderTripHook([summary]);
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let rejectDelete: (() => void) | undefined;
    vi.mocked(api.deleteTrip).mockImplementation(
      () =>
        new Promise((_resolve, reject) => {
          rejectDelete = () => reject(new Error('network error'));
        })
    );

    act(() => {
      result.current.deleteTrip(summary.id);
    });

    await waitFor(() => {
      expect(result.current.trips).toEqual([]);
    });

    await act(async () => {
      rejectDelete?.();
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(result.current.trips).toEqual([summary]);
    });

    expect(vi.mocked(handleApiError)).toHaveBeenCalledWith(
      expect.any(Error),
      'Failed to delete trip'
    );
  });

  it('creates a trip using the same id for the optimistic summary and the mutation payload', async () => {
    const { result } = renderTripHook([]);
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    vi.mocked(api.createTrip).mockResolvedValue(makeTrip());

    let created!: TripSummary;
    act(() => {
      created = result.current.createTrip('New Trip');
    });

    await waitFor(() => {
      expect(result.current.trips.map((t) => t.id)).toContain(created.id);
    });

    expect(vi.mocked(api.createTrip)).toHaveBeenCalledWith({ id: created.id, name: 'New Trip' });
  });
});

describe('useTripDetail', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  function renderDetailHook(trip: Trip) {
    vi.mocked(api.getTrip).mockResolvedValue(trip);
    const queryClient = newQueryClient();

    function wrapper({ children }: { children: ReactNode }) {
      return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    }

    return renderHook(() => useTripDetail(trip.id), { wrapper });
  }

  it('loads the full trip detail from the API', async () => {
    const trip = makeTrip();
    const { result } = renderDetailHook(trip);

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.trip).toEqual(trip);
  });

  it('optimistically adds a member before the mutation resolves', async () => {
    const trip = makeTrip();
    const { result } = renderDetailHook(trip);
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let resolveAddMember: (() => void) | undefined;
    vi.mocked(api.addMember).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveAddMember = () => resolve({ id: 'm-1', name: 'Alice', color: '#EF4444' });
        })
    );

    const member = { id: 'm-1', name: 'Alice', color: '#EF4444' };
    act(() => {
      result.current.addMember(member);
    });

    await waitFor(() => {
      expect(result.current.trip?.members).toEqual([member]);
    });

    await act(async () => {
      resolveAddMember?.();
      await Promise.resolve();
    });
  });

  it('rolls back the optimistic member add when the mutation fails', async () => {
    const trip = makeTrip();
    const { result } = renderDetailHook(trip);
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let rejectAddMember: (() => void) | undefined;
    vi.mocked(api.addMember).mockImplementation(
      () =>
        new Promise((_resolve, reject) => {
          rejectAddMember = () => reject(new Error('network error'));
        })
    );

    const member = { id: 'm-1', name: 'Alice', color: '#EF4444' };
    act(() => {
      result.current.addMember(member);
    });

    await waitFor(() => {
      expect(result.current.trip?.members).toEqual([member]);
    });

    await act(async () => {
      rejectAddMember?.();
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(result.current.trip?.members).toEqual([]);
    });

    expect(vi.mocked(handleApiError)).toHaveBeenCalledWith(
      expect.any(Error),
      'Failed to add member'
    );
  });

  it('shows an error and rethrows when removeMember fails outright', async () => {
    const trip = makeTrip({ members: [{ id: 'm-1', name: 'Alice', color: '#EF4444' }] });
    const { result } = renderDetailHook(trip);
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    vi.mocked(api.removeMember).mockRejectedValue(new Error('network error'));

    await act(async () => {
      await expect(result.current.removeMember('m-1')).rejects.toThrow('network error');
    });

    expect(vi.mocked(handleApiError)).toHaveBeenCalledWith(
      expect.any(Error),
      'Failed to remove member'
    );
    // No optimistic update happens before the await, so the member should
    // still be present in the cache after the failed request.
    expect(result.current.trip?.members).toHaveLength(1);
  });

  it('removes a member from the cache only when the server confirms success', async () => {
    const trip = makeTrip({ members: [{ id: 'm-1', name: 'Alice', color: '#EF4444' }] });
    const { result } = renderDetailHook(trip);
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    vi.mocked(api.removeMember).mockResolvedValue({
      error: 'Member has expenses',
      expenseCount: 2,
      memberName: 'Alice',
    });

    let response;
    await act(async () => {
      response = await result.current.removeMember('m-1');
    });

    expect(response).toMatchObject({ error: 'Member has expenses' });
    // removeMember only updates the cache when the server reports success,
    // so the member should still be present since deletion was blocked.
    expect(result.current.trip?.members).toHaveLength(1);
  });

  it('removes the member from the cache when the server confirms success', async () => {
    const trip = makeTrip({ members: [{ id: 'm-1', name: 'Alice', color: '#EF4444' }] });
    const { result } = renderDetailHook(trip);
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    vi.mocked(api.removeMember).mockResolvedValue({ success: true });

    await act(async () => {
      await result.current.removeMember('m-1');
    });

    await waitFor(() => expect(result.current.trip?.members).toEqual([]));
  });

  it('renames the trip optimistically and ignores a blank name', async () => {
    const trip = makeTrip();
    const { result } = renderDetailHook(trip);
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    vi.mocked(api.updateTrip).mockResolvedValue(trip);

    act(() => {
      result.current.updateTrip('  ');
    });
    expect(api.updateTrip).not.toHaveBeenCalled();

    act(() => {
      result.current.updateTrip('New Name');
    });

    await waitFor(() => expect(result.current.trip?.name).toBe('New Name'));
    expect(api.updateTrip).toHaveBeenCalledWith('trip-1', { name: 'New Name' });
  });

  it('resyncs and reports an error when renaming the trip fails', async () => {
    const trip = makeTrip();
    const { result } = renderDetailHook(trip);
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    vi.mocked(api.updateTrip).mockRejectedValue(new Error('network error'));
    vi.mocked(api.getTrip).mockResolvedValue(trip);

    act(() => {
      result.current.updateTrip('New Name');
    });

    await waitFor(() =>
      expect(vi.mocked(handleApiError)).toHaveBeenCalledWith(expect.any(Error), 'Failed to rename trip')
    );
  });

  it('updates a member name optimistically', async () => {
    const trip = makeTrip({ members: [{ id: 'm-1', name: 'Alice', color: '#EF4444' }] });
    const { result } = renderDetailHook(trip);
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    vi.mocked(api.updateMember).mockResolvedValue({ id: 'm-1', name: 'Alicia', color: '#EF4444' });

    act(() => {
      result.current.updateMember('m-1', 'Alicia');
    });

    await waitFor(() => expect(result.current.trip?.members[0]).toMatchObject({ name: 'Alicia' }));
    expect(api.updateMember).toHaveBeenCalledWith('trip-1', 'm-1', { name: 'Alicia' });
  });

  it('resyncs and reports an error when updating a member fails', async () => {
    const trip = makeTrip({ members: [{ id: 'm-1', name: 'Alice', color: '#EF4444' }] });
    const { result } = renderDetailHook(trip);
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    vi.mocked(api.updateMember).mockRejectedValue(new Error('network error'));
    vi.mocked(api.getTrip).mockResolvedValue(trip);

    act(() => {
      result.current.updateMember('m-1', 'Alicia');
    });

    await waitFor(() =>
      expect(vi.mocked(handleApiError)).toHaveBeenCalledWith(expect.any(Error), 'Failed to update member')
    );
  });

  it('adds an expense optimistically', async () => {
    const trip = makeTrip();
    const { result } = renderDetailHook(trip);
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const expense = {
      id: 'e-1',
      description: 'Dinner',
      amount: 20,
      currency: 'USD',
      paidBy: 'm-1',
      splitAmong: ['m-1'],
      date: new Date().toISOString(),
    };
    vi.mocked(api.addExpense).mockResolvedValue({ success: true });

    act(() => {
      result.current.addExpense(expense);
    });

    await waitFor(() => expect(result.current.trip?.expenses).toEqual([expense]));
    expect(api.addExpense).toHaveBeenCalledWith('trip-1', expense);
  });

  it('rolls back an optimistic expense add when the mutation fails', async () => {
    const trip = makeTrip();
    const { result } = renderDetailHook(trip);
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const expense = {
      id: 'e-1',
      description: 'Dinner',
      amount: 20,
      currency: 'USD',
      paidBy: 'm-1',
      splitAmong: ['m-1'],
      date: new Date().toISOString(),
    };
    vi.mocked(api.addExpense).mockRejectedValue(new Error('network error'));

    act(() => {
      result.current.addExpense(expense);
    });

    await waitFor(() => expect(result.current.trip?.expenses).toEqual([]));
    expect(vi.mocked(handleApiError)).toHaveBeenCalledWith(expect.any(Error), 'Failed to add expense');
  });

  it('updates an expense optimistically', async () => {
    const original = {
      id: 'e-1',
      description: 'Dinner',
      amount: 20,
      currency: 'USD',
      paidBy: 'm-1',
      splitAmong: ['m-1'],
      date: new Date().toISOString(),
    };
    const trip = makeTrip({ expenses: [original] });
    const { result } = renderDetailHook(trip);
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const updated = { ...original, description: 'Lunch', amount: 30 };
    vi.mocked(api.updateExpense).mockResolvedValue({ success: true });

    act(() => {
      result.current.updateExpense(updated);
    });

    await waitFor(() => expect(result.current.trip?.expenses).toEqual([updated]));
    expect(api.updateExpense).toHaveBeenCalledWith('trip-1', updated);
  });

  it('resyncs and reports an error when updating an expense fails', async () => {
    const original = {
      id: 'e-1',
      description: 'Dinner',
      amount: 20,
      currency: 'USD',
      paidBy: 'm-1',
      splitAmong: ['m-1'],
      date: new Date().toISOString(),
    };
    const trip = makeTrip({ expenses: [original] });
    const { result } = renderDetailHook(trip);
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    vi.mocked(api.updateExpense).mockRejectedValue(new Error('network error'));
    vi.mocked(api.getTrip).mockResolvedValue(trip);

    act(() => {
      result.current.updateExpense({ ...original, amount: 99 });
    });

    await waitFor(() =>
      expect(vi.mocked(handleApiError)).toHaveBeenCalledWith(expect.any(Error), 'Failed to update expense')
    );
  });

  it('removes an expense optimistically', async () => {
    const expense = {
      id: 'e-1',
      description: 'Dinner',
      amount: 20,
      currency: 'USD',
      paidBy: 'm-1',
      splitAmong: ['m-1'],
      date: new Date().toISOString(),
    };
    const trip = makeTrip({ expenses: [expense] });
    const { result } = renderDetailHook(trip);
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    vi.mocked(api.removeExpense).mockResolvedValue({ success: true });

    act(() => {
      result.current.removeExpense('e-1');
    });

    await waitFor(() => expect(result.current.trip?.expenses).toEqual([]));
    expect(api.removeExpense).toHaveBeenCalledWith('trip-1', 'e-1');
  });

  it('resyncs and reports an error when removing an expense fails', async () => {
    const expense = {
      id: 'e-1',
      description: 'Dinner',
      amount: 20,
      currency: 'USD',
      paidBy: 'm-1',
      splitAmong: ['m-1'],
      date: new Date().toISOString(),
    };
    const trip = makeTrip({ expenses: [expense] });
    const { result } = renderDetailHook(trip);
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    vi.mocked(api.removeExpense).mockRejectedValue(new Error('network error'));
    vi.mocked(api.getTrip).mockResolvedValue(trip);

    act(() => {
      result.current.removeExpense('e-1');
    });

    await waitFor(() =>
      expect(vi.mocked(handleApiError)).toHaveBeenCalledWith(expect.any(Error), 'Failed to remove expense')
    );
  });

  it('invites a member and resyncs the trip and trip-list caches', async () => {
    const trip = makeTrip();
    const { result } = renderDetailHook(trip);
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    vi.mocked(api.inviteMember).mockResolvedValue({ success: true, pending: true });
    vi.mocked(api.getTrip).mockResolvedValue(trip);

    let response;
    await act(async () => {
      response = await result.current.inviteMember('a@example.com');
    });

    expect(api.inviteMember).toHaveBeenCalledWith('trip-1', 'a@example.com');
    expect(response).toEqual({ success: true, pending: true });
  });

  it('removes a collaborator optimistically', async () => {
    const trip = makeTrip({
      tripMembers: [
        {
          id: 'tm-1',
          userId: 'user-2',
          role: 'collaborator',
          user: { id: 'user-2', name: 'Bob', email: 'bob@example.com', image: null },
        },
      ],
    });
    const { result } = renderDetailHook(trip);
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    vi.mocked(api.removeCollaborator).mockResolvedValue({ success: true });

    act(() => {
      result.current.removeCollaborator('tm-1');
    });

    await waitFor(() => expect(result.current.trip?.tripMembers).toEqual([]));
    expect(api.removeCollaborator).toHaveBeenCalledWith('trip-1', 'tm-1');
  });

  it('resyncs and reports an error when removing a collaborator fails', async () => {
    const trip = makeTrip({
      tripMembers: [
        {
          id: 'tm-1',
          userId: 'user-2',
          role: 'collaborator',
          user: { id: 'user-2', name: 'Bob', email: 'bob@example.com', image: null },
        },
      ],
    });
    const { result } = renderDetailHook(trip);
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    vi.mocked(api.removeCollaborator).mockRejectedValue(new Error('network error'));
    vi.mocked(api.getTrip).mockResolvedValue(trip);

    act(() => {
      result.current.removeCollaborator('tm-1');
    });

    await waitFor(() =>
      expect(vi.mocked(handleApiError)).toHaveBeenCalledWith(
        expect.any(Error),
        'Failed to remove collaborator'
      )
    );
  });
});
