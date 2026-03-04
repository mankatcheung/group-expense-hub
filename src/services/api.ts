import { Trip, Member, Expense } from "@/lib/types";

const API_URL = import.meta.env.VITE_API_URL;

let currentToken: string | null = null;

const headers = () => {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (currentToken) {
    h["Authorization"] = `Bearer ${currentToken}`;
  }
  return h;
};

export const api = {
  setToken: (token: string | null) => {
    currentToken = token;
  },

  // Auth
  login: async (credentials: any) => {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(credentials),
    });
    if (!res.ok) throw new Error("Login failed");
    return res.json();
  },

  register: async (credentials: any) => {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(credentials),
    });
    if (!res.ok) throw new Error("Registration failed");
    return res.json();
  },

  getMe: async () => {
    const res = await fetch(`${API_URL}/auth/me`, { headers: headers() });
    if (!res.ok) throw new Error("Failed to fetch user");
    return res.json();
  },

  // Trips
  getTrips: async (): Promise<Trip[]> => {
    const res = await fetch(`${API_URL}/trips`, { headers: headers() });
    if (!res.ok) throw new Error("Failed to fetch trips");
    return res.json();
  },

  getTrip: async (id: string): Promise<Trip> => {
    const res = await fetch(`${API_URL}/trips/${id}`, { headers: headers() });
    if (!res.ok) throw new Error("Failed to fetch trip");
    return res.json();
  },

  createTrip: async (trip: Partial<Trip>): Promise<Trip> => {
    const res = await fetch(`${API_URL}/trips`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(trip),
    });
    if (!res.ok) throw new Error("Failed to create trip");
    return res.json();
  },

  deleteTrip: async (id: string): Promise<void> => {
    const res = await fetch(`${API_URL}/trips/${id}`, {
      method: "DELETE",
      headers: headers(),
    });
    if (!res.ok) throw new Error("Failed to delete trip");
  },

  // Members
  addMember: async (tripId: string, member: Member): Promise<Member> => {
    const res = await fetch(`${API_URL}/trips/${tripId}/members`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(member),
    });
    if (!res.ok) throw new Error("Failed to add member");
    return res.json();
  },

  removeMember: async (tripId: string, memberId: string): Promise<void> => {
    const res = await fetch(`${API_URL}/trips/${tripId}/members/${memberId}`, {
      method: "DELETE",
      headers: headers(),
    });
    if (!res.ok) throw new Error("Failed to remove member");
  },

  // Expenses
  addExpense: async (tripId: string, expense: Expense): Promise<void> => {
    const res = await fetch(`${API_URL}/trips/${tripId}/expenses`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(expense),
    });
    if (!res.ok) throw new Error("Failed to add expense");
  },

  removeExpense: async (tripId: string, expenseId: string): Promise<void> => {
    const res = await fetch(
      `${API_URL}/trips/${tripId}/expenses/${expenseId}`,
      { method: "DELETE", headers: headers() },
    );
    if (!res.ok) throw new Error("Failed to remove expense");
  },
};
