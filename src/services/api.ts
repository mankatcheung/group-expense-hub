import { Trip, Member, Expense } from "@/lib/types";

const API_URL = import.meta.env.VITE_API_URL;

const fetchOptions = (options: RequestInit = {}): RequestInit => ({
  ...options,
  credentials: "include",
  headers: {
    "Content-Type": "application/json",
    ...options.headers,
  },
});

export const api = {
  // Trips
  getTrips: async (): Promise<Trip[]> => {
    const res = await fetch(`${API_URL}/trips`, fetchOptions());
    if (!res.ok) throw new Error("Failed to fetch trips");
    return res.json();
  },

  getTrip: async (id: string): Promise<Trip> => {
    const res = await fetch(`${API_URL}/trips/${id}`, fetchOptions());
    if (!res.ok) throw new Error("Failed to fetch trip");
    return res.json();
  },

  createTrip: async (trip: Partial<Trip>): Promise<Trip> => {
    const res = await fetch(`${API_URL}/trips`, fetchOptions({
      method: "POST",
      body: JSON.stringify(trip),
    }));
    if (!res.ok) throw new Error("Failed to create trip");
    return res.json();
  },

  deleteTrip: async (id: string): Promise<void> => {
    const res = await fetch(`${API_URL}/trips/${id}`, fetchOptions({
      method: "DELETE",
    }));
    if (!res.ok) throw new Error("Failed to delete trip");
  },

  // Members
  addMember: async (tripId: string, member: Member): Promise<Member> => {
    const res = await fetch(`${API_URL}/trips/${tripId}/members`, fetchOptions({
      method: "POST",
      body: JSON.stringify(member),
    }));
    if (!res.ok) throw new Error("Failed to add member");
    return res.json();
  },

  removeMember: async (tripId: string, memberId: string): Promise<void> => {
    const res = await fetch(`${API_URL}/trips/${tripId}/members/${memberId}`, fetchOptions({
      method: "DELETE",
    }));
    if (!res.ok) throw new Error("Failed to remove member");
  },

  // Expenses
  addExpense: async (tripId: string, expense: Expense): Promise<void> => {
    const res = await fetch(`${API_URL}/trips/${tripId}/expenses`, fetchOptions({
      method: "POST",
      body: JSON.stringify(expense),
    }));
    if (!res.ok) throw new Error("Failed to add expense");
  },

  updateExpense: async (tripId: string, expense: Expense): Promise<void> => {
    const res = await fetch(
      `${API_URL}/trips/${tripId}/expenses/${expense.id}`,
      fetchOptions({ method: "PUT", body: JSON.stringify(expense) }),
    );
    if (!res.ok) throw new Error("Failed to update expense");
  },

  removeExpense: async (tripId: string, expenseId: string): Promise<void> => {
    const res = await fetch(
      `${API_URL}/trips/${tripId}/expenses/${expenseId}`,
      fetchOptions({ method: "DELETE" }),
    );
    if (!res.ok) throw new Error("Failed to remove expense");
  },
};
