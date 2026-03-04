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

export interface Trip {
  id: string;
  name: string;
  members: Member[];
  expenses: Expense[];
  createdAt: string;
}
