import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { TripProvider, useTrip } from '@/context/TripContext';
import { api } from '@/services/api';
import type { Trip } from '@/lib/types';

vi.mock('@/services/api', () => ({
  api: {
    getTrips: vi.fn(),
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

function renderTripHook(initialTrips: Trip[]) {
  vi.mocked(api.getTrips).mockResolvedValue(initialTrips);

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  function wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <TripProvider>{children}</TripProvider>
      </QueryClientProvider>
    );
  }

  return renderHook(() => useTrip(), { wrapper });
}

describe('TripContext', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('loads trips from the API', async () => {
    const trip = makeTrip();
    const { result } = renderTripHook([trip]);

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.trips).toEqual([trip]);
  });

  it('optimistically adds a member before the mutation resolves', async () => {
    const trip = makeTrip();
    const { result } = renderTripHook([trip]);
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
      result.current.addMember(trip.id, member);
    });

    await waitFor(() => {
      expect(result.current.getTrip(trip.id)?.members).toEqual([member]);
    });

    await act(async () => {
      resolveAddMember?.();
      await Promise.resolve();
    });
  });

  it('rolls back the optimistic member add when the mutation fails', async () => {
    const trip = makeTrip();
    const { result } = renderTripHook([trip]);
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
      result.current.addMember(trip.id, member);
    });

    await waitFor(() => {
      expect(result.current.getTrip(trip.id)?.members).toEqual([member]);
    });

    await act(async () => {
      rejectAddMember?.();
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(result.current.getTrip(trip.id)?.members).toEqual([]);
    });
  });

  it('rolls back an optimistic delete when the mutation fails', async () => {
    const trip = makeTrip();
    const { result } = renderTripHook([trip]);
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let rejectDelete: (() => void) | undefined;
    vi.mocked(api.deleteTrip).mockImplementation(
      () =>
        new Promise((_resolve, reject) => {
          rejectDelete = () => reject(new Error('network error'));
        })
    );

    act(() => {
      result.current.deleteTrip(trip.id);
    });

    await waitFor(() => {
      expect(result.current.trips).toEqual([]);
    });

    await act(async () => {
      rejectDelete?.();
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(result.current.trips).toEqual([trip]);
    });
  });

  it('removes a member from the cache only when the server confirms success', async () => {
    const trip = makeTrip({ members: [{ id: 'm-1', name: 'Alice', color: '#EF4444' }] });
    const { result } = renderTripHook([trip]);
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    vi.mocked(api.removeMember).mockResolvedValue({
      error: 'Member has expenses',
      expenseCount: 2,
      memberName: 'Alice',
    });

    let response;
    await act(async () => {
      response = await result.current.removeMember(trip.id, 'm-1');
    });

    expect(response).toMatchObject({ error: 'Member has expenses' });
    // removeMember has no local optimistic update, so the member should still
    // be present in the cache when the server reports it wasn't removed.
    expect(result.current.getTrip(trip.id)?.members).toHaveLength(1);
  });
});
