import type { QueryClient } from '@tanstack/react-query';
import type { TripSummary } from '@/lib/types';

export const TRIPS_KEY = ['trips'];
export const tripDetailKey = (tripId: string) => ['trip', tripId];

/** Patches one trip's entry in the cached trip-list summary without refetching. */
export function patchTripSummary(
  queryClient: QueryClient,
  tripId: string,
  patch: (summary: TripSummary) => TripSummary
) {
  queryClient.setQueryData<TripSummary[]>(TRIPS_KEY, (prev) =>
    prev?.map((t) => (t.id === tripId ? patch(t) : t))
  );
}
