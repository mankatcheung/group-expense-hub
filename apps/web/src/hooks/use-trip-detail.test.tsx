import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useTripDetail } from './use-trip-detail';
import { api } from '@/services/api';
import type { Expense, Trip } from '@/lib/types';

vi.mock('@/services/api', () => ({
  api: {
    getTrip: vi.fn(),
    addExpense: vi.fn(),
  },
}));

vi.mock('@/lib/error-handler', () => ({
  handleApiError: vi.fn(),
}));

const TRIP_ID = 'trip-1';

const baseTrip = {
  id: TRIP_ID,
  name: 'Tokyo',
  createdAt: '2026-01-01T00:00:00.000Z',
  isOwner: true,
  owner: null,
  members: [],
  tripMembers: [],
  expenses: [],
} as unknown as Trip;

function makeExpense(id: string): Expense {
  return {
    id,
    description: `Expense ${id}`,
    amount: 42.5,
    currency: 'USD',
    paidBy: 'm1',
    splitAmong: ['m1', 'm2'],
    date: '2026-01-02T00:00:00.000Z',
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

function renderTripDetail() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const hook = renderHook(() => useTripDetail(TRIP_ID), { wrapper });
  return { ...hook, queryClient };
}

describe('useTripDetail optimistic writes', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('recovers when a refetch that started before the write committed overwrites the optimistic expense', async () => {
    const expense = makeExpense('e1');
    const post = deferred<{ success: boolean }>();
    vi.mocked(api.getTrip).mockResolvedValue(baseTrip);
    vi.mocked(api.addExpense).mockReturnValue(post.promise);

    const { result, queryClient } = renderTripDetail();
    await waitFor(() => expect(result.current.trip).toBeDefined());

    // React Query notifies components on a timer, so wait rather than assert synchronously.
    act(() => result.current.addExpense(expense));
    await waitFor(() => expect(result.current.trip?.expenses).toEqual([expense]));

    // e.g. navigating back to the trip page refetches while the POST is still
    // in flight, and the server doesn't have the expense yet.
    await act(() => queryClient.refetchQueries({ queryKey: ['trip', TRIP_ID] }));
    await waitFor(() => expect(result.current.trip?.expenses).toEqual([]));

    vi.mocked(api.getTrip).mockResolvedValue({ ...baseTrip, expenses: [expense] });
    await act(async () => post.resolve({ success: true }));

    await waitFor(() => expect(result.current.trip?.expenses).toEqual([expense]));
  });

  it('refetches once after the last of several concurrent writes settles', async () => {
    const first = deferred<{ success: boolean }>();
    const second = deferred<{ success: boolean }>();
    vi.mocked(api.getTrip).mockResolvedValue(baseTrip);
    vi.mocked(api.addExpense).mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);

    const { result } = renderTripDetail();
    await waitFor(() => expect(result.current.trip).toBeDefined());
    const fetchesAfterLoad = vi.mocked(api.getTrip).mock.calls.length;

    await act(async () => {
      result.current.addExpense(makeExpense('e1'));
      result.current.addExpense(makeExpense('e2'));
    });

    await act(async () => {
      first.resolve({ success: true });
      await new Promise((r) => setTimeout(r, 50));
    });
    expect(vi.mocked(api.getTrip).mock.calls.length).toBe(fetchesAfterLoad);

    await act(async () => second.resolve({ success: true }));
    await waitFor(() => expect(vi.mocked(api.getTrip).mock.calls.length).toBe(fetchesAfterLoad + 1));
  });
});
