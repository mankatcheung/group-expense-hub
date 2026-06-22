import type { TripUser } from '@group-expense-hub/db/types';

export type { Member, Expense, Balance, TripUser, TripMember, Trip } from '@group-expense-hub/db/types';

/** Lightweight shape for the trip list view — avoids shipping every trip's
 * full nested members/expenses/splits when only counts and totals are shown. */
export interface TripSummary {
  id: string;
  name: string;
  createdAt: string;
  isOwner: boolean;
  owner: TripUser | null;
  memberCount: number;
  expenseCount: number;
  totalsByCurrency: Record<string, number>;
}
