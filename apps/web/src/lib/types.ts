export interface Member {
  id: string;
  name: string;
  color: string;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  currency: string;
  paidBy: string;
  splitAmong: string[];
  date: string;
}

export interface Balance {
  from: string;
  to: string;
  amount: number;
  currency: string;
}

export interface TripUser {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
}

export interface TripMember {
  id: string;
  userId: string;
  role: string;
  user: TripUser;
}

export interface Trip {
  id: string;
  name: string;
  members: Member[];
  tripMembers: TripMember[];
  expenses: Expense[];
  createdAt: string;
  isOwner: boolean;
  owner: TripUser | null;
}

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
