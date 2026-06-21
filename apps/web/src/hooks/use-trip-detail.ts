import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Member, Expense, Trip } from '@/lib/types';
import { api, InviteMemberResponse, RemoveMemberResponse } from '@/services/api';
import { tripDetailKey, patchTripSummary } from '@/lib/trip-query-keys';
import { handleApiError } from '@/lib/error-handler';

/**
 * Per-trip detail data + mutations, backed by its own query cache entry
 * (['trip', tripId]) instead of the bulk trip-list summary used by
 * TripContext. This is the only place that fetches full nested
 * members/expenses/splits for a single trip, so visiting the list page
 * doesn't pull that payload for every trip.
 */
export function useTripDetail(tripId: string) {
  const queryClient = useQueryClient();
  const key = tripDetailKey(tripId);

  const {
    data: trip,
    isLoading,
    error,
  } = useQuery({
    queryKey: key,
    queryFn: () => api.getTrip(tripId),
    enabled: !!tripId,
  });

  const setTrip = (updater: Trip | undefined | ((prev: Trip | undefined) => Trip | undefined)) => {
    queryClient.setQueryData<Trip | undefined>(key, updater);
  };

  const resync = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: key });
  }, [queryClient, key]);

  const updateTripMutation = useMutation({
    mutationFn: (name: string) => api.updateTrip(tripId, { name }),
  });

  const addMemberMutation = useMutation({
    mutationFn: (member: Member) => api.addMember(tripId, member),
  });

  const updateMemberMutation = useMutation({
    mutationFn: ({ memberId, name }: { memberId: string; name: string }) =>
      api.updateMember(tripId, memberId, { name }),
  });

  const removeMemberMutation = useMutation({
    mutationFn: ({ memberId, force }: { memberId: string; force?: boolean }) =>
      api.removeMember(tripId, memberId, force),
  });

  const addExpenseMutation = useMutation({
    mutationFn: (expense: Expense) => api.addExpense(tripId, expense),
  });

  const updateExpenseMutation = useMutation({
    mutationFn: (expense: Expense) => api.updateExpense(tripId, expense),
  });

  const removeExpenseMutation = useMutation({
    mutationFn: (expenseId: string) => api.removeExpense(tripId, expenseId),
  });

  // Invite-member is a rarer action, and its response doesn't include the
  // new TripMember id needed to patch the cache precisely, so a full resync
  // on success is an acceptable tradeoff here.
  const inviteMemberMutation = useMutation({
    mutationFn: (email: string) => api.inviteMember(tripId, email),
    onSuccess: () => {
      resync();
      queryClient.invalidateQueries({ queryKey: ['trips'] });
    },
  });

  const removeCollaboratorMutation = useMutation({
    mutationFn: (memberId: string) => api.removeCollaborator(tripId, memberId),
  });

  const updateTrip = useCallback(
    (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;

      setTrip((prev) => (prev ? { ...prev, name: trimmed } : prev));
      patchTripSummary(queryClient, tripId, (s) => ({ ...s, name: trimmed }));

      updateTripMutation.mutate(trimmed, {
        onError: (err) => {
          resync();
          handleApiError(err, 'Failed to rename trip');
        },
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [updateTripMutation, queryClient, tripId, resync]
  );

  const addMember = useCallback(
    (member: Member) => {
      setTrip((prev) => (prev ? { ...prev, members: [...prev.members, member] } : prev));
      patchTripSummary(queryClient, tripId, (s) => ({ ...s, memberCount: s.memberCount + 1 }));

      addMemberMutation.mutate(member, {
        onError: (err) => {
          setTrip((prev) =>
            prev ? { ...prev, members: prev.members.filter((m) => m.id !== member.id) } : prev
          );
          patchTripSummary(queryClient, tripId, (s) => ({
            ...s,
            memberCount: Math.max(0, s.memberCount - 1),
          }));
          handleApiError(err, 'Failed to add member');
        },
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [addMemberMutation, queryClient, tripId]
  );

  const updateMember = useCallback(
    (memberId: string, name: string) => {
      setTrip((prev) =>
        prev
          ? { ...prev, members: prev.members.map((m) => (m.id === memberId ? { ...m, name } : m)) }
          : prev
      );

      updateMemberMutation.mutate(
        { memberId, name },
        {
          onError: (err) => {
            resync();
            handleApiError(err, 'Failed to update member');
          },
        }
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [updateMemberMutation, resync]
  );

  const removeMember = useCallback(
    async (memberId: string, force = false): Promise<RemoveMemberResponse> => {
      try {
        const response = await removeMemberMutation.mutateAsync({ memberId, force });
        if (response.success) {
          setTrip((prev) =>
            prev ? { ...prev, members: prev.members.filter((m) => m.id !== memberId) } : prev
          );
          patchTripSummary(queryClient, tripId, (s) => ({
            ...s,
            memberCount: Math.max(0, s.memberCount - 1),
          }));
        }
        return response;
      } catch (err) {
        handleApiError(err, 'Failed to remove member');
        throw err;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [removeMemberMutation, queryClient, tripId]
  );

  const addExpense = useCallback(
    (expense: Expense) => {
      setTrip((prev) => (prev ? { ...prev, expenses: [expense, ...prev.expenses] } : prev));
      patchTripSummary(queryClient, tripId, (s) => ({
        ...s,
        expenseCount: s.expenseCount + 1,
        totalsByCurrency: {
          ...s.totalsByCurrency,
          [expense.currency]: (s.totalsByCurrency[expense.currency] || 0) + expense.amount,
        },
      }));

      addExpenseMutation.mutate(expense, {
        onError: (err) => {
          setTrip((prev) =>
            prev ? { ...prev, expenses: prev.expenses.filter((e) => e.id !== expense.id) } : prev
          );
          patchTripSummary(queryClient, tripId, (s) => ({
            ...s,
            expenseCount: Math.max(0, s.expenseCount - 1),
            totalsByCurrency: {
              ...s.totalsByCurrency,
              [expense.currency]: (s.totalsByCurrency[expense.currency] || 0) - expense.amount,
            },
          }));
          handleApiError(err, 'Failed to add expense');
        },
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [addExpenseMutation, queryClient, tripId]
  );

  const updateExpense = useCallback(
    (expense: Expense) => {
      const previous = trip?.expenses.find((e) => e.id === expense.id);

      setTrip((prev) =>
        prev
          ? { ...prev, expenses: prev.expenses.map((e) => (e.id === expense.id ? expense : e)) }
          : prev
      );

      if (previous) {
        patchTripSummary(queryClient, tripId, (s) => ({
          ...s,
          totalsByCurrency: {
            ...s.totalsByCurrency,
            [previous.currency]: (s.totalsByCurrency[previous.currency] || 0) - previous.amount,
            [expense.currency]: (s.totalsByCurrency[expense.currency] || 0) + expense.amount,
          },
        }));
      }

      updateExpenseMutation.mutate(expense, {
        onError: (err) => {
          resync();
          handleApiError(err, 'Failed to update expense');
        },
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [updateExpenseMutation, queryClient, tripId, trip, resync]
  );

  const removeExpense = useCallback(
    (expenseId: string) => {
      const removed = trip?.expenses.find((e) => e.id === expenseId);

      setTrip((prev) =>
        prev ? { ...prev, expenses: prev.expenses.filter((e) => e.id !== expenseId) } : prev
      );

      if (removed) {
        patchTripSummary(queryClient, tripId, (s) => ({
          ...s,
          expenseCount: Math.max(0, s.expenseCount - 1),
          totalsByCurrency: {
            ...s.totalsByCurrency,
            [removed.currency]: (s.totalsByCurrency[removed.currency] || 0) - removed.amount,
          },
        }));
      }

      removeExpenseMutation.mutate(expenseId, {
        onError: (err) => {
          resync();
          handleApiError(err, 'Failed to remove expense');
        },
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [removeExpenseMutation, queryClient, tripId, trip, resync]
  );

  const inviteMember = useCallback(
    async (email: string): Promise<InviteMemberResponse> => {
      return inviteMemberMutation.mutateAsync(email);
    },
    [inviteMemberMutation]
  );

  const removeCollaborator = useCallback(
    (memberId: string) => {
      setTrip((prev) =>
        prev ? { ...prev, tripMembers: prev.tripMembers.filter((m) => m.id !== memberId) } : prev
      );

      removeCollaboratorMutation.mutate(memberId, {
        onError: (err) => {
          resync();
          handleApiError(err, 'Failed to remove collaborator');
        },
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [removeCollaboratorMutation, resync]
  );

  return {
    trip,
    isLoading,
    error: error?.message || null,
    updateTrip,
    addMember,
    updateMember,
    removeMember,
    addExpense,
    updateExpense,
    removeExpense,
    inviteMember,
    removeCollaborator,
    refreshTrip: resync,
  };
}
