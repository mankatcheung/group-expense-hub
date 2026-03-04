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
  paidBy: string; // member id
  splitAmong: string[]; // member ids
  date: string;
}

export interface Balance {
  from: string; // member id
  to: string; // member id
  amount: number;
  currency: string;
}
