"use client";

import {
  getTrips as saGetTrips,
  getTrip as saGetTrip,
  createTrip as saCreateTrip,
  deleteTrip as saDeleteTrip,
  addMember as saAddMember,
  updateMember as saUpdateMember,
  removeMember as saRemoveMember,
  addExpense as saAddExpense,
  updateExpense as saUpdateExpense,
  removeExpense as saRemoveExpense,
  inviteMember as saInviteMember,
  removeCollaborator as saRemoveCollaborator,
  joinTrip as saJoinTrip,
  getInvitations as saGetInvitations,
  acceptInvitation as saAcceptInvitation,
  updateUserProfile as saUpdateUserProfile,
} from "@/lib/server/trips";

export const api = {
  getTrips: async () => saGetTrips(),
  getTrip: async (id: string) => saGetTrip(id),
  createTrip: async (trip: { id: string; name: string; createdAt?: string }) => saCreateTrip(trip),
  deleteTrip: async (id: string) => saDeleteTrip(id),
  addMember: async (tripId: string, member: { id: string; name: string; color: string }) => saAddMember(tripId, member),
  updateMember: async (tripId: string, memberId: string, data: { name: string }) => saUpdateMember(tripId, memberId, data),
  removeMember: async (tripId: string, memberId: string, force?: boolean) => saRemoveMember(tripId, memberId, force),
  addExpense: async (tripId: string, expense: { id: string; description: string; amount: number; currency: string; paidBy: string; splitAmong: string[]; date?: string }) => saAddExpense(tripId, expense),
  updateExpense: async (tripId: string, expense: { id: string; description: string; amount: number; currency: string; paidBy: string; splitAmong: string[]; date?: string }) => saUpdateExpense(tripId, expense.id, expense),
  removeExpense: async (tripId: string, expenseId: string) => saRemoveExpense(tripId, expenseId),
  inviteMember: async (tripId: string, email: string) => saInviteMember(tripId, email),
  removeCollaborator: async (tripId: string, memberId: string) => saRemoveCollaborator(tripId, memberId),
  joinTrip: async (token: string) => saJoinTrip(token),
  getInvitations: async () => saGetInvitations(),
  acceptInvitation: async (id: string) => saAcceptInvitation(id),
  updateUserProfile: async (data: { name?: string; email?: string }) => saUpdateUserProfile(data),
};
