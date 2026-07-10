export interface Expense {
  id: string;
  description: string;
  amount: number;
  currency: string;
  date: Date;
  tripId: string;
  paidById: string;
}
