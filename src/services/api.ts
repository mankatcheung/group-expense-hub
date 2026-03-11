'use client';

import {
  getTrips as saGetTrips,
  getTrip as saGetTrip,
  createTrip as saCreateTrip,
  deleteTrip as saDeleteTrip,
  updateTrip as saUpdateTrip,
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
  changePassword as saChangePassword,
} from '@/lib/server/trips';
import {
  validateTripsResponse,
  validateTripResponse,
  validateInviteMemberResponse,
  validateRemoveMemberResponse,
  safeParseTripsResponse,
  safeParseTripResponse,
} from '@/lib/schemas';
import { handleApiError } from '@/lib/error-handler';

export const api = {
  getTrips: async () => {
    const data = await saGetTrips();
    try {
      return validateTripsResponse(data);
    } catch (err) {
      handleApiError(err, 'Invalid trips response');
      return data;
    }
  },

  getTrip: async (id: string) => {
    const data = await saGetTrip(id);
    try {
      return validateTripResponse(data);
    } catch (err) {
      handleApiError(err, 'Invalid trip response');
      return data;
    }
  },

  createTrip: async (trip: { id: string; name: string; createdAt?: string }) => saCreateTrip(trip),

  deleteTrip: async (id: string) => saDeleteTrip(id),

  updateTrip: async (id: string, data: { name: string }) => saUpdateTrip(id, data),

  addMember: async (tripId: string, member: { id: string; name: string; color: string }) =>
    saAddMember(tripId, member),

  updateMember: async (tripId: string, memberId: string, data: { name: string }) =>
    saUpdateMember(tripId, memberId, data),

  removeMember: async (tripId: string, memberId: string, force?: boolean) => {
    const data = await saRemoveMember(tripId, memberId, force);
    try {
      return validateRemoveMemberResponse(data);
    } catch (err) {
      handleApiError(err, 'Invalid remove member response');
      return data;
    }
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
  ) => saAddExpense(tripId, expense),

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
  ) => saUpdateExpense(tripId, expense.id, expense),

  removeExpense: async (tripId: string, expenseId: string) => saRemoveExpense(tripId, expenseId),

  inviteMember: async (tripId: string, email: string) => {
    const data = await saInviteMember(tripId, email);
    try {
      return validateInviteMemberResponse(data);
    } catch (err) {
      handleApiError(err, 'Invalid invite member response');
      return data;
    }
  },

  removeCollaborator: async (tripId: string, memberId: string) =>
    saRemoveCollaborator(tripId, memberId),

  joinTrip: async (token: string) => saJoinTrip(token),

  getInvitations: async () => saGetInvitations(),

  acceptInvitation: async (id: string) => saAcceptInvitation(id),

  updateUserProfile: async (data: { name?: string; email?: string }) => saUpdateUserProfile(data),

  changePassword: async (currentPassword: string, newPassword: string) =>
    saChangePassword(currentPassword, newPassword),
};
