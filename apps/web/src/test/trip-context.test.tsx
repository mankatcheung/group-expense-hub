import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { TripProvider, useTrip } from '@/context/TripContext';
import { useTripDetail } from '@/hooks/use-trip-detail';
import { api } from '@/services/api';
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
  });

  function renderTripHook(initialTrips: TripSummary[]) {
    vi.mocked(api.getTrips).mockResolvedValue(initialTrips);
    const queryClient = newQueryClient();

    function wrapper({ children }: { children: ReactNode }) {
      return (
        <QueryClientProvider client={queryClient}>
          <TripProvider>{children}</TripProvider>
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
});
