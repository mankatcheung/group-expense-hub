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

export interface TripInvitation {
  id: string;
  token: string;
  tripId: string;
  tripName: string;
  inviter: TripUser;
  createdAt: string;
}
