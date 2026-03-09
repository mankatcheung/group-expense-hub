import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { Member, Expense, Trip } from "@/lib/types";
import { api } from "@/services/api";
import { toast } from "sonner";

interface TripContextType {
  trips: Trip[];
  isLoading: boolean;
  error: string | null;
  createTrip: (name: string) => Trip;
  deleteTrip: (id: string) => void;
  getTrip: (id: string) => Trip | undefined;
  addMember: (tripId: string, member: Member) => void;
  updateMember: (tripId: string, memberId: string, name: string) => void;
  removeMember: (tripId: string, memberId: string, force?: boolean) => Promise<{ success?: boolean; error?: string; expenseCount?: number; memberName?: string }>;
  addExpense: (tripId: string, expense: Expense) => void;
  updateExpense: (tripId: string, expense: Expense) => void;
  removeExpense: (tripId: string, expenseId: string) => void;
  inviteMember: (tripId: string, email: string) => Promise<{ success: boolean; user?: any }>;
  removeCollaborator: (tripId: string, memberId: string) => void;
  refreshTrips: () => void;
}

const TripContext = createContext<TripContextType | null>(null);

export function TripProvider({ children }: { children: ReactNode }) {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load trips from API on mount
  useEffect(() => {
    setIsLoading(true);
    setError(null);
    api.getTrips()
      .then(setTrips)
      .catch((err) => {
        const message = err?.message || "Failed to load trips";
        setError(message);
        toast.error("Failed to load trips", {
          description: "Please try refreshing the page.",
        });
      })
      .finally(() => setIsLoading(false));
  }, []);

  const createTrip = useCallback((name: string) => {
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

    // Optimistic update
    setTrips((prev) => [trip, ...prev]);

    // API call
    api.createTrip(trip).catch((err) => {
      setTrips((prev) => prev.filter((t) => t.id !== trip.id));
      toast.error("Failed to create trip", { description: err?.message });
    });

    return trip;
  }, []);

  const deleteTrip = useCallback((id: string) => {
    const previousTrips = trips;
    // Optimistic update
    setTrips((prev) => prev.filter((t) => t.id !== id));

    // API call
    api.deleteTrip(id).catch((err) => {
      setTrips(previousTrips);
      toast.error("Failed to delete trip", { description: err?.message });
    });
  }, [trips]);

  const getTrip = useCallback((id: string) => {
    return trips.find((t) => t.id === id);
  }, [trips]);

  const updateTrip = (tripId: string, updater: (t: Trip) => Trip) => {
    setTrips((prev) => prev.map((t) => (t.id === tripId ? updater(t) : t)));
  };

  const addMember = useCallback((tripId: string, member: Member) => {
    // Optimistic update
    updateTrip(tripId, (t) => ({ ...t, members: [...t.members, member] }));

    // API call
    api.addMember(tripId, member).catch((err) => {
      updateTrip(tripId, (t) => ({ ...t, members: t.members.filter((m) => m.id !== member.id) }));
      toast.error("Failed to add member", { description: err?.message });
    });
  }, []);

  const updateMember = useCallback((tripId: string, memberId: string, name: string) => {
    updateTrip(tripId, (t) => ({
      ...t,
      members: t.members.map((m) => (m.id === memberId ? { ...m, name } : m)),
    }));

    api.updateMember(tripId, memberId, { name }).catch((err) => {
      refreshTrips();
      toast.error("Failed to update member", { description: err?.message });
    });
  }, []);

  const removeMember = useCallback(async (tripId: string, memberId: string, force: boolean = false) => {
    const response = await api.removeMember(tripId, memberId, force);
    
    if (response.error && response.expenseCount) {
      return response;
    }

    if (response.success) {
      updateTrip(tripId, (t) => ({
        ...t,
        members: t.members.filter((m) => m.id !== memberId),
        expenses: t.expenses
          .filter((e) => e.paidBy !== memberId)
          .map((e) => ({ ...e, splitAmong: e.splitAmong.filter((x) => x !== memberId) }))
          .filter((e) => e.splitAmong.length > 0),
      }));
    }
    
    return response;
  }, []);

  const addExpense = useCallback((tripId: string, expense: Expense) => {
    // Optimistic update
    updateTrip(tripId, (t) => ({ ...t, expenses: [expense, ...t.expenses] }));

    // API call
    api.addExpense(tripId, expense).catch((err) => {
      updateTrip(tripId, (t) => ({ ...t, expenses: t.expenses.filter((e) => e.id !== expense.id) }));
      toast.error("Failed to add expense", { description: err?.message });
    });
  }, []);

  const updateExpense = useCallback((tripId: string, expense: Expense) => {
    updateTrip(tripId, (t) => ({
      ...t,
      expenses: t.expenses.map((e) => (e.id === expense.id ? expense : e)),
    }));
    api.updateExpense(tripId, expense).catch((err) => {
      refreshTrips();
      toast.error("Failed to update expense", { description: err?.message });
    });
  }, []);

  const removeExpense = useCallback((tripId: string, expenseId: string) => {
    // Optimistic update
    updateTrip(tripId, (t) => ({
      ...t,
      expenses: t.expenses.filter((e) => e.id !== expenseId),
    }));

    // API call
    api.removeExpense(tripId, expenseId).catch((err) => {
      refreshTrips();
      toast.error("Failed to remove expense", { description: err?.message });
    });
  }, []);

  const inviteMember = useCallback(async (tripId: string, email: string) => {
    const response = await api.inviteMember(tripId, email);
    
    if (response.user) {
      updateTrip(tripId, (t) => ({
        ...t,
        tripMembers: [...t.tripMembers, {
          id: crypto.randomUUID(),
          userId: response.user.id,
          role: "collaborator",
          user: response.user,
        }],
        ...(response.member ? { members: [...t.members, response.member] } : {}),
      }));
    }
    
    return response;
  }, []);

  const removeCollaborator = useCallback((tripId: string, memberId: string) => {
    updateTrip(tripId, (t) => ({
      ...t,
      tripMembers: t.tripMembers.filter((m) => m.id !== memberId),
    }));

    api.removeCollaborator(tripId, memberId).catch((err) => {
      refreshTrips();
      toast.error("Failed to remove collaborator", { description: err?.message });
    });
  }, []);

  const refreshTrips = useCallback(() => {
    api.getTrips()
      .then(setTrips)
      .catch((err) => {
        toast.error("Failed to refresh trips", { description: err?.message });
      });
  }, []);

  return (
    <TripContext.Provider
      value={{ trips, isLoading, error, createTrip, deleteTrip, getTrip, addMember, updateMember, removeMember, addExpense, updateExpense, removeExpense, inviteMember, removeCollaborator, refreshTrips }}
    >
      {children}
    </TripContext.Provider>
  );
}

export function useTrip() {
  const ctx = useContext(TripContext);
  if (!ctx) throw new Error("useTrip must be used within TripProvider");
  return ctx;
}
