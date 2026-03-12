import { createContext, useContext, ReactNode, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Member, Expense, Trip, TripUser } from '@/lib/types';
import { api } from '@/services/api';
import { CACHE } from '@/lib/constants';

export interface InviteMemberResponse {
  success: boolean;
  pending?: boolean;
  message?: string;
  user?: TripUser;
  member?: {
    id: string;
    name: string;
    color: string;
  };
}

const TRIPS_KEY = ['trips'];

interface TripContextType {
  trips: Trip[];
  isLoading: boolean;
  error: string | null;
  createTrip: (name: string) => Trip;
  deleteTrip: (id: string) => void;
  updateTrip: (tripId: string, name: string) => void;
  getTrip: (id: string) => Trip | undefined;
  addMember: (tripId: string, member: Member) => void;
  updateMember: (tripId: string, memberId: string, name: string) => void;
  removeMember: (
    tripId: string,
    memberId: string,
    force?: boolean
  ) => Promise<{ success?: boolean; error?: string; expenseCount?: number; memberName?: string }>;
  addExpense: (tripId: string, expense: Expense) => void;
  updateExpense: (tripId: string, expense: Expense) => void;
  removeExpense: (tripId: string, expenseId: string) => void;
  inviteMember: (tripId: string, email: string) => Promise<InviteMemberResponse>;
  removeCollaborator: (tripId: string, memberId: string) => void;
  refreshTrips: () => void;
}

const TripContext = createContext<TripContextType | null>(null);

export function TripProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const {
    data: trips = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: TRIPS_KEY,
    queryFn: () => api.getTrips(),
    staleTime: CACHE.TRIPS_STALE_TIME,
    gcTime: CACHE.TRIPS_GC_TIME,
  });

  const createTripMutation = useMutation({
    mutationFn: (name: string) => api.createTrip({ id: crypto.randomUUID(), name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TRIPS_KEY });
    },
  });

  const deleteTripMutation = useMutation({
    mutationFn: (id: string) => api.deleteTrip(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TRIPS_KEY });
    },
  });

  const updateTripMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => api.updateTrip(id, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TRIPS_KEY });
    },
  });

  const addMemberMutation = useMutation({
    mutationFn: ({
      tripId,
      member,
    }: {
      tripId: string;
      member: { id: string; name: string; color: string };
    }) => api.addMember(tripId, member),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TRIPS_KEY });
    },
  });

  const updateMemberMutation = useMutation({
    mutationFn: ({ tripId, memberId, name }: { tripId: string; memberId: string; name: string }) =>
      api.updateMember(tripId, memberId, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TRIPS_KEY });
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: ({
      tripId,
      memberId,
      force,
    }: {
      tripId: string;
      memberId: string;
      force?: boolean;
    }) => api.removeMember(tripId, memberId, force),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TRIPS_KEY });
    },
  });

  const addExpenseMutation = useMutation({
    mutationFn: ({ tripId, expense }: { tripId: string; expense: Expense }) =>
      api.addExpense(tripId, expense),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TRIPS_KEY });
    },
  });

  const updateExpenseMutation = useMutation({
    mutationFn: ({ tripId, expense }: { tripId: string; expense: Expense }) =>
      api.updateExpense(tripId, expense),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TRIPS_KEY });
    },
  });

  const removeExpenseMutation = useMutation({
    mutationFn: ({ tripId, expenseId }: { tripId: string; expenseId: string }) =>
      api.removeExpense(tripId, expenseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TRIPS_KEY });
    },
  });

  const inviteMemberMutation = useMutation({
    mutationFn: ({ tripId, email }: { tripId: string; email: string }) =>
      api.inviteMember(tripId, email),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TRIPS_KEY });
    },
  });

  const removeCollaboratorMutation = useMutation({
    mutationFn: ({ tripId, memberId }: { tripId: string; memberId: string }) =>
      api.removeCollaborator(tripId, memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TRIPS_KEY });
    },
  });

  const createTrip = useCallback(
    (name: string) => {
      const trip: Trip = {
        id: crypto.randomUUID(),
        name,
        members: [],
        tripMembers: [],
        expenses: [],
        createdAt: new Date().toISOString(),
        isOwner: true,
        owner: null,
      };

      setTrips((prev) => [trip, ...prev]);
      createTripMutation.mutate(name);

      return trip;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [createTripMutation]
  );

  const deleteTrip = useCallback(
    (id: string) => {
      const previousTrips = trips;
      setTrips((prev) => prev.filter((t) => t.id !== id));

      deleteTripMutation.mutate(id, {
        onError: () => {
          setTrips(previousTrips);
        },
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [trips, deleteTripMutation]
  );

  const updateTrip = useCallback(
    (tripId: string, name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;

      setTrips((prev) => prev.map((t) => (t.id === tripId ? { ...t, name: trimmed } : t)));

      updateTripMutation.mutate(
        { id: tripId, name: trimmed },
        {
          onError: () => {
            queryClient.invalidateQueries({ queryKey: TRIPS_KEY });
          },
        }
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [updateTripMutation, queryClient]
  );

  const getTrip = useCallback(
    (id: string) => {
      return trips.find((t) => t.id === id);
    },
    [trips]
  );

  const addMember = useCallback(
    (tripId: string, member: Member) => {
      setTrips((prev) =>
        prev.map((t) => (t.id === tripId ? { ...t, members: [...t.members, member] } : t))
      );

      addMemberMutation.mutate(
        { tripId, member },
        {
          onError: () => {
            setTrips((prev) =>
              prev.map((t) =>
                t.id === tripId ? { ...t, members: t.members.filter((m) => m.id !== member.id) } : t
              )
            );
          },
        }
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [addMemberMutation]
  );

  const updateMember = useCallback(
    (tripId: string, memberId: string, name: string) => {
      setTrips((prev) =>
        prev.map((t) =>
          t.id === tripId
            ? { ...t, members: t.members.map((m) => (m.id === memberId ? { ...m, name } : m)) }
            : t
        )
      );

      updateMemberMutation.mutate(
        { tripId, memberId, name },
        {
          onError: () => {
            queryClient.invalidateQueries({ queryKey: TRIPS_KEY });
          },
        }
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [updateMemberMutation, queryClient]
  );

  const removeMember = useCallback(
    async (tripId: string, memberId: string, force = false) => {
      const response = await removeMemberMutation.mutateAsync({ tripId, memberId, force });
      return response;
    },
    [removeMemberMutation]
  );

  const addExpense = useCallback(
    (tripId: string, expense: Expense) => {
      setTrips((prev) =>
        prev.map((t) => (t.id === tripId ? { ...t, expenses: [expense, ...t.expenses] } : t))
      );

      addExpenseMutation.mutate(
        { tripId, expense },
        {
          onError: () => {
            setTrips((prev) =>
              prev.map((t) =>
                t.id === tripId
                  ? { ...t, expenses: t.expenses.filter((e) => e.id !== expense.id) }
                  : t
              )
            );
          },
        }
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [addExpenseMutation]
  );

  const updateExpense = useCallback(
    (tripId: string, expense: Expense) => {
      setTrips((prev) =>
        prev.map((t) =>
          t.id === tripId
            ? { ...t, expenses: t.expenses.map((e) => (e.id === expense.id ? expense : e)) }
            : t
        )
      );

      updateExpenseMutation.mutate(
        { tripId, expense },
        {
          onError: () => {
            queryClient.invalidateQueries({ queryKey: TRIPS_KEY });
          },
        }
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [updateExpenseMutation, queryClient]
  );

  const removeExpense = useCallback(
    (tripId: string, expenseId: string) => {
      setTrips((prev) =>
        prev.map((t) =>
          t.id === tripId ? { ...t, expenses: t.expenses.filter((e) => e.id !== expenseId) } : t
        )
      );

      removeExpenseMutation.mutate(
        { tripId, expenseId },
        {
          onError: () => {
            queryClient.invalidateQueries({ queryKey: TRIPS_KEY });
          },
        }
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [removeExpenseMutation, queryClient]
  );

  const inviteMember = useCallback(
    async (tripId: string, email: string) => {
      const response = await inviteMemberMutation.mutateAsync({ tripId, email });
      return response;
    },
    [inviteMemberMutation]
  );

  const removeCollaborator = useCallback(
    (tripId: string, memberId: string) => {
      setTrips((prev) =>
        prev.map((t) =>
          t.id === tripId
            ? { ...t, tripMembers: t.tripMembers.filter((m) => m.id !== memberId) }
            : t
        )
      );

      removeCollaboratorMutation.mutate(
        { tripId, memberId },
        {
          onError: () => {
            queryClient.invalidateQueries({ queryKey: TRIPS_KEY });
          },
        }
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [removeCollaboratorMutation, queryClient]
  );

  const refreshTrips = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: TRIPS_KEY });
  }, [queryClient]);

  const setTrips = (updater: Trip[] | ((prev: Trip[]) => Trip[])) => {
    queryClient.setQueryData(TRIPS_KEY, updater);
  };

  return (
    <TripContext.Provider
      value={{
        trips,
        isLoading,
        error: error?.message || null,
        createTrip,
        deleteTrip,
        updateTrip,
        getTrip,
        addMember,
        updateMember,
        removeMember,
        addExpense,
        updateExpense,
        removeExpense,
        inviteMember,
        removeCollaborator,
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
