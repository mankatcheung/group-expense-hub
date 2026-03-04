import { createContext, useContext, useState, ReactNode, useCallback } from "react";
import { Member, Expense, Trip } from "@/lib/types";

interface TripContextType {
  trips: Trip[];
  createTrip: (name: string) => Trip;
  deleteTrip: (id: string) => void;
  getTrip: (id: string) => Trip | undefined;
  addMember: (tripId: string, member: Member) => void;
  removeMember: (tripId: string, memberId: string) => void;
  addExpense: (tripId: string, expense: Expense) => void;
  removeExpense: (tripId: string, expenseId: string) => void;
}

const TripContext = createContext<TripContextType | null>(null);

export function TripProvider({ children }: { children: ReactNode }) {
  const [trips, setTrips] = useState<Trip[]>([]);

  const createTrip = useCallback((name: string) => {
    const trip: Trip = {
      id: crypto.randomUUID(),
      name,
      members: [],
      expenses: [],
      createdAt: new Date().toISOString(),
    };
    setTrips((prev) => [trip, ...prev]);
    return trip;
  }, []);

  const deleteTrip = useCallback((id: string) => {
    setTrips((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const getTrip = useCallback((id: string) => {
    return trips.find((t) => t.id === id);
  }, [trips]);

  const updateTrip = (tripId: string, updater: (t: Trip) => Trip) => {
    setTrips((prev) => prev.map((t) => (t.id === tripId ? updater(t) : t)));
  };

  const addMember = useCallback((tripId: string, member: Member) => {
    updateTrip(tripId, (t) => ({ ...t, members: [...t.members, member] }));
  }, []);

  const removeMember = useCallback((tripId: string, memberId: string) => {
    updateTrip(tripId, (t) => ({
      ...t,
      members: t.members.filter((m) => m.id !== memberId),
      expenses: t.expenses
        .filter((e) => e.paidBy !== memberId)
        .map((e) => ({ ...e, splitAmong: e.splitAmong.filter((x) => x !== memberId) }))
        .filter((e) => e.splitAmong.length > 0),
    }));
  }, []);

  const addExpense = useCallback((tripId: string, expense: Expense) => {
    updateTrip(tripId, (t) => ({ ...t, expenses: [expense, ...t.expenses] }));
  }, []);

  const removeExpense = useCallback((tripId: string, expenseId: string) => {
    updateTrip(tripId, (t) => ({
      ...t,
      expenses: t.expenses.filter((e) => e.id !== expenseId),
    }));
  }, []);

  return (
    <TripContext.Provider
      value={{ trips, createTrip, deleteTrip, getTrip, addMember, removeMember, addExpense, removeExpense }}
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
