import { Trip, Member, Expense } from "@/lib/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4040/api";

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

  // Members (local members for expense splitting)
  addMember: async (tripId: string, member: Member): Promise<Member> => {
    const res = await fetch(`${API_URL}/trips/${tripId}/members`, fetchOptions({
      method: "POST",
      body: JSON.stringify(member),
    }));
    if (!res.ok) throw new Error("Failed to add member");
    return res.json();
  },

  removeMember: async (tripId: string, memberId: string, force: boolean = false): Promise<{ success?: boolean; error?: string; expenseCount?: number; memberName?: string }> => {
    const res = await fetch(`${API_URL}/trips/${tripId}/members/${memberId}?force=${force}`, fetchOptions({
      method: "DELETE",
    }));
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      if (res.status === 409) {
        return { error: data.error, expenseCount: data.expenseCount, memberName: data.memberName };
      }
      throw new Error(data.error || "Failed to remove member");
    }
    return { success: true };
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

  // Collaborators (users invited to the trip)
  inviteMember: async (tripId: string, email: string): Promise<{ success: boolean; message?: string; user?: any; pending?: boolean; member?: { id: string; name: string; color: string } }> => {
    const res = await fetch(`${API_URL}/trips/${tripId}/invite`, fetchOptions({
      method: "POST",
      body: JSON.stringify({ email }),
    }));
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: "Failed to invite member" }));
      throw { response: error };
    }
    return res.json();
  },

  removeCollaborator: async (tripId: string, memberId: string): Promise<void> => {
    const res = await fetch(`${API_URL}/trips/${tripId}/collaborators/${memberId}`, fetchOptions({
      method: "DELETE",
    }));
    if (!res.ok) throw new Error("Failed to remove collaborator");
  },

  joinTrip: async (token: string): Promise<{ success: boolean; tripId: string }> => {
    const res = await fetch(`${API_URL}/trips/join`, fetchOptions({
      method: "POST",
      body: JSON.stringify({ token }),
    }));
    if (!res.ok) throw new Error("Failed to join trip");
    return res.json();
  },

  getInvitations: async (): Promise<{ id: string; token: string; tripId: string; tripName: string; inviter: { id: string; name: string | null; email: string; image: string | null }; createdAt: string }[]> => {
    const res = await fetch(`${API_URL}/invitations`, fetchOptions());
    if (!res.ok) throw new Error("Failed to fetch invitations");
    return res.json();
  },

  acceptInvitation: async (id: string): Promise<{ success: boolean; tripId: string }> => {
    const res = await fetch(`${API_URL}/invitations/${id}/accept`, fetchOptions({
      method: "POST",
    }));
    if (!res.ok) throw new Error("Failed to accept invitation");
    return res.json();
  },
};
