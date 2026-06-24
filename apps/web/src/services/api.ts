'use client';

import type { Member, Trip, TripSummary, TripUser } from '@/lib/types';

export interface InviteMemberResponse {
  success: boolean;
  pending?: boolean;
  message?: string;
  user?: TripUser;
  member?: Member;
}

export interface RemoveMemberResponse {
  success?: boolean;
  error?: string;
  expenseCount?: number;
  memberName?: string;
}

export interface JoinTripResponse {
  success: boolean;
  tripId: string;
}

export interface TripInvitation {
  id: string;
  token: string;
  tripId: string;
  tripName: string;
  inviter: TripUser;
  createdAt: string;
}

async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(endpoint, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }

  return response.json();
}

export const api = {
  getTrips: async (): Promise<TripSummary[]> => {
    return fetchApi<TripSummary[]>('/api/trips');
  },

  getTrip: async (id: string): Promise<Trip> => {
    return fetchApi<Trip>(`/api/trips/${id}`);
  },

  createTrip: async (trip: { id: string; name: string; createdAt?: string }): Promise<Trip> => {
    return fetchApi<Trip>('/api/trips', {
      method: 'POST',
      body: JSON.stringify(trip),
    });
  },

  deleteTrip: async (id: string): Promise<{ success: boolean }> => {
    return fetchApi<{ success: boolean }>(`/api/trips/${id}`, {
      method: 'DELETE',
    });
  },

  updateTrip: async (id: string, data: { name: string }): Promise<Trip> => {
    return fetchApi<Trip>(`/api/trips/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  addMember: async (tripId: string, member: Member): Promise<Member> => {
    return fetchApi<Member>(`/api/trips/${tripId}/members`, {
      method: 'POST',
      body: JSON.stringify(member),
    });
  },

  updateMember: async (
    tripId: string,
    memberId: string,
    data: { name: string }
  ): Promise<Member> => {
    return fetchApi<Member>(`/api/trips/${tripId}/members/${memberId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  removeMember: async (
    tripId: string,
    memberId: string,
    force?: boolean
  ): Promise<RemoveMemberResponse> => {
    return fetchApi<RemoveMemberResponse>(
      `/api/trips/${tripId}/members/${memberId}?force=${force}`,
      {
        method: 'DELETE',
      }
    );
  },

  addExpense: async (
    tripId: string,
    expense: {
      id: string;
      description: string;
      amount: number;
      currency: string;
      paidBy: string;
      splitAmong: string[];
      date?: string;
    }
  ): Promise<{ success: boolean }> => {
    return fetchApi<{ success: boolean }>(`/api/trips/${tripId}/expenses`, {
      method: 'POST',
      body: JSON.stringify(expense),
    });
  },

  updateExpense: async (
    tripId: string,
    expense: {
      id: string;
      description: string;
      amount: number;
      currency: string;
      paidBy: string;
      splitAmong: string[];
      date?: string;
    }
  ): Promise<{ success: boolean }> => {
    return fetchApi<{ success: boolean }>(`/api/trips/${tripId}/expenses/${expense.id}`, {
      method: 'PUT',
      body: JSON.stringify(expense),
    });
  },

  removeExpense: async (tripId: string, expenseId: string): Promise<{ success: boolean }> => {
    return fetchApi<{ success: boolean }>(`/api/trips/${tripId}/expenses/${expenseId}`, {
      method: 'DELETE',
    });
  },

  inviteMember: async (tripId: string, email: string): Promise<InviteMemberResponse> => {
    return fetchApi<InviteMemberResponse>(`/api/trips/${tripId}/invite`, {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  removeCollaborator: async (tripId: string, memberId: string): Promise<{ success: boolean }> => {
    return fetchApi<{ success: boolean }>(`/api/trips/${tripId}/collaborators/${memberId}`, {
      method: 'DELETE',
    });
  },

  joinTrip: async (token: string): Promise<JoinTripResponse> => {
    return fetchApi<JoinTripResponse>(`/api/trips/join/${token}`, {
      method: 'POST',
    });
  },

  getInvitations: async (): Promise<TripInvitation[]> => {
    return fetchApi<TripInvitation[]>('/api/invitations');
  },

  acceptInvitation: async (id: string): Promise<JoinTripResponse> => {
    return fetchApi<JoinTripResponse>(`/api/invitations/${id}/accept`, {
      method: 'POST',
    });
  },

  updateUserProfile: async (data: {
    name?: string;
    email?: string;
  }): Promise<{ success: boolean }> => {
    return fetchApi<{ success: boolean }>('/api/user/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  changePassword: async (
    currentPassword: string,
    newPassword: string
  ): Promise<{ success: boolean }> => {
    return fetchApi<{ success: boolean }>('/api/user/password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  },

  checkEmailAvailable: async (email: string): Promise<{ available: boolean }> => {
    return fetchApi<{ available: boolean }>(`/api/check-email?email=${encodeURIComponent(email)}`);
  },
};
