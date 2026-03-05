import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { Member, Expense, Trip } from "@/lib/types";
import { api } from "@/services/api";

interface TripContextType {
  trips: Trip[];
  createTrip: (name: string) => Trip;
  deleteTrip: (id: string) => void;
  getTrip: (id: string) => Trip | undefined;
  addMember: (tripId: string, member: Member) => void;
  removeMember: (tripId: string, memberId: string) => void;
  addExpense: (tripId: string, expense: Expense) => void;
  updateExpense: (tripId: string, expense: Expense) => void;
  removeExpense: (tripId: string, expenseId: string) => void;
}

const TripContext = createContext<TripContextType | null>(null);

export function TripProvider({ children }: { children: ReactNode }) {
  const [trips, setTrips] = useState<Trip[]>([]);

  // Load trips from API on mount
  useEffect(() => {
    api.getTrips()
      .then(setTrips)
      .catch(console.error);
  }, []);

  const createTrip = useCallback((name: string) => {
    const trip: Trip = {
      id: crypto.randomUUID(),
      name,
      members: [],
      expenses: [],
      createdAt: new Date().toISOString(),
    };

    // Optimistic update
    setTrips((prev) => [trip, ...prev]);

    // API call
    api.createTrip(trip).catch(console.error);

    return trip;
  }, []);

  const deleteTrip = useCallback((id: string) => {
    // Optimistic update
    setTrips((prev) => prev.filter((t) => t.id !== id));

    // API call
    api.deleteTrip(id).catch(console.error);
  }, []);

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
    api.addMember(tripId, member).catch(console.error);
  }, []);

  const removeMember = useCallback((tripId: string, memberId: string) => {
    // Optimistic update
    updateTrip(tripId, (t) => ({
      ...t,
      members: t.members.filter((m) => m.id !== memberId),
      expenses: t.expenses
        .filter((e) => e.paidBy !== memberId)
        .map((e) => ({ ...e, splitAmong: e.splitAmong.filter((x) => x !== memberId) }))
        .filter((e) => e.splitAmong.length > 0),
    }));

    // API call
    api.removeMember(tripId, memberId).catch(console.error);
  }, []);

  const addExpense = useCallback((tripId: string, expense: Expense) => {
    // Optimistic update
    updateTrip(tripId, (t) => ({ ...t, expenses: [expense, ...t.expenses] }));

    // API call
    api.addExpense(tripId, expense).catch(console.error);
  }, []);

  const updateExpense = useCallback((tripId: string, expense: Expense) => {
    updateTrip(tripId, (t) => ({
      ...t,
      expenses: t.expenses.map((e) => (e.id === expense.id ? expense : e)),
    }));
    api.updateExpense(tripId, expense).catch(console.error);
  }, []);

  const removeExpense = useCallback((tripId: string, expenseId: string) => {
    // Optimistic update
    updateTrip(tripId, (t) => ({
      ...t,
      expenses: t.expenses.filter((e) => e.id !== expenseId),
    }));

    // API call
    api.removeExpense(tripId, expenseId).catch(console.error);
  }, []);

  return (
    <TripContext.Provider
      value={{ trips, createTrip, deleteTrip, getTrip, addMember, removeMember, addExpense, updateExpense, removeExpense }}
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
