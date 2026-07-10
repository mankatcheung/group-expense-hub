import type { TripFull, TripSummaryRow } from '../../application/ports/repositories/trip.repository.js';

export function formatTripSummary(trip: TripSummaryRow, userId: string) {
  const totalsByCurrency = trip.expenses.reduce<Record<string, number>>((acc, e) => {
    acc[e.currency] = (acc[e.currency] || 0) + e.amount;
    return acc;
  }, {});

  return {
    id: trip.id,
    name: trip.name,
    createdAt: trip.createdAt.toISOString(),
    isOwner: trip.userId === userId,
    owner: trip.user
      ? { id: trip.user.id, name: trip.user.name, email: trip.user.email, image: trip.user.image }
      : null,
    memberCount: trip.members.length,
    expenseCount: trip.expenses.length,
    totalsByCurrency,
  };
}

export function formatTrip(trip: TripFull, userId: string) {
  return {
    id: trip.id,
    name: trip.name,
    createdAt: trip.createdAt.toISOString(),
    isOwner: trip.userId === userId,
    owner: trip.user
      ? { id: trip.user.id, name: trip.user.name, email: trip.user.email, image: trip.user.image }
      : null,
    members: trip.members.map(m => ({ id: m.id, name: m.name, color: m.color })),
    tripMembers: trip.tripMembers.map(tm => ({
      id: tm.id,
      userId: tm.userId,
      role: tm.role,
      user: { id: tm.user.id, name: tm.user.name, email: tm.user.email, image: tm.user.image },
    })),
    expenses: trip.expenses.map(e => ({
      id: e.id,
      description: e.description,
      amount: e.amount,
      currency: e.currency,
      date: e.date.toISOString(),
      paidBy: e.paidById,
      splitAmong: e.splits.map(s => s.memberId),
    })),
  };
}
