import { createContext, useContext, ReactNode, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Trip, TripSummary } from '@/lib/types';
import { api } from '@/services/api';
import { CACHE } from '@/lib/constants';
import { TRIPS_KEY, tripDetailKey } from '@/lib/trip-query-keys';
import { handleApiError } from '@/lib/error-handler';
import { useAuth } from '@/context/AuthContext';

interface TripContextType {
  trips: TripSummary[];
  isLoading: boolean;
  error: string | null;
  createTrip: (name: string) => TripSummary;
  deleteTrip: (id: string) => void;
  refreshTrips: () => void;
}

const TripContext = createContext<TripContextType | null>(null);

export function TripProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const {
    data: trips = [],
    isPending: tripsPending,
    error,
  } = useQuery({
    queryKey: TRIPS_KEY,
    queryFn: () => api.getTrips(),
    staleTime: CACHE.TRIPS_STALE_TIME,
    gcTime: CACHE.TRIPS_GC_TIME,
    // Without this, the query fires immediately on mount on every page
    // (including /login, before there's a session) and the resulting
    // failed/empty result stays cached across the client-side navigation
    // to "/" after a successful login - nothing else invalidates it.
    // Gating on auth state means it (re)fires exactly when isAuthenticated
    // flips to true, which covers both the initial load and post-login.
    enabled: isAuthenticated,
  });

  // react-query's own `isLoading` is `isPending && isFetching`, which is
  // false while `enabled` is false - that would flash an empty trips list
  // during the brief window before the auth check resolves. Folding in the
  // auth provider's own loading state avoids that gap.
  const isLoading = authLoading || (isAuthenticated && tripsPending);

  // These mutations already have a matching optimistic update applied via
  // setTrips before mutate() is called (see the callbacks below), so onSuccess
  // intentionally does nothing — invalidating here would force a refetch of
  // every trip's summary on every small edit. onError paths invalidate to
  // resync with the server when the optimistic guess was wrong.
  const createTripMutation = useMutation({
    mutationFn: (trip: { id: string; name: string }) => api.createTrip(trip),
  });

  const deleteTripMutation = useMutation({
    mutationFn: (id: string) => api.deleteTrip(id),
  });

  const setTrips = (updater: TripSummary[] | ((prev: TripSummary[]) => TripSummary[])) => {
    queryClient.setQueryData(TRIPS_KEY, updater);
  };

  const createTrip = useCallback(
    (name: string) => {
      const id = crypto.randomUUID();
      const createdAt = new Date().toISOString();

      const summary: TripSummary = {
        id,
        name,
        createdAt,
        isOwner: true,
        owner: null,
        memberCount: 0,
        expenseCount: 0,
        totalsByCurrency: {},
      };

      // Seed the per-trip detail cache too, so navigating straight to the new
      // trip's page renders instantly instead of waiting on a fetch for a
      // trip the server may not have finished committing yet.
      const fullTrip: Trip = {
        id,
        name,
        members: [],
        tripMembers: [],
        expenses: [],
        createdAt,
        isOwner: true,
        owner: null,
      };
      queryClient.setQueryData(tripDetailKey(id), fullTrip);

      setTrips((prev) => [summary, ...prev]);
      createTripMutation.mutate(
        { id, name },
        {
          onError: (err) => {
            setTrips((prev) => prev.filter((t) => t.id !== id));
            queryClient.removeQueries({ queryKey: tripDetailKey(id) });
            handleApiError(err, 'Failed to create trip');
          },
        }
      );

      return summary;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [createTripMutation, queryClient]
  );

  const deleteTrip = useCallback(
    (id: string) => {
      const previousTrips = trips;
      setTrips((prev) => prev.filter((t) => t.id !== id));
      queryClient.removeQueries({ queryKey: tripDetailKey(id) });

      deleteTripMutation.mutate(id, {
        onError: (err) => {
          setTrips(previousTrips);
          handleApiError(err, 'Failed to delete trip');
        },
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [trips, deleteTripMutation, queryClient]
  );

  const refreshTrips = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: TRIPS_KEY });
  }, [queryClient]);

  return (
    <TripContext.Provider
      value={{
        trips,
        isLoading,
        error: error?.message || null,
        createTrip,
        deleteTrip,
        refreshTrips,
      }}
    >
      {children}
    </TripContext.Provider>
  );
}

export function useTrip() {
  const ctx = useContext(TripContext);
  if (!ctx) throw new Error('useTrip must be used within TripProvider');
  return ctx;
}
