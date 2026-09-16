export interface CreateExpenseData {
  id: string;
  description: string;
  amount: number;
  currency: string;
  date?: Date;
  tripId: string;
  paidById: string;
  splitAmong: string[];
}

export interface UpdateExpenseData {
  description: string;
  amount: number;
  currency: string;
  date?: Date;
  tripId: string;
  paidById: string;
  splitAmong: string[];
}

export interface IExpenseRepository {
  findById(id: string): Promise<{ id: string; tripId: string } | null>;
  create(data: CreateExpenseData): Promise<void>;
  update(id: string, data: UpdateExpenseData): Promise<void>;
  delete(id: string): Promise<void>;
}
