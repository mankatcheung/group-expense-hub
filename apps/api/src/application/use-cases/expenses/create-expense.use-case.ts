import type { IExpenseRepository } from '../../../application/ports/repositories/expense.repository.js';
import type { ITripAccessService } from '../../../application/ports/services/trip-access.service.js';

type Deps = { expenseRepository: IExpenseRepository; tripAccessService: ITripAccessService };

export interface CreateExpenseInput {
  id: string;
  description: string;
  amount: number;
  currency: string;
  date?: string;
  paidBy: string;
  splitAmong: string[];
}

export type CreateExpenseResult = { type: 'success' } | { type: 'error'; reason: 'forbidden' };

export type CreateExpenseUseCase = (tripId: string, input: CreateExpenseInput, userId: string) => Promise<CreateExpenseResult>;

export function createCreateExpenseUseCase({ expenseRepository, tripAccessService }: Deps): CreateExpenseUseCase {
  return async (tripId, input, userId) => {
    const canEdit = await tripAccessService.canEdit(tripId, userId);
    if (!canEdit) return { type: 'error', reason: 'forbidden' };

    await expenseRepository.create({
      id: input.id,
      description: input.description,
      amount: input.amount,
      currency: input.currency,
      date: input.date ? new Date(input.date) : undefined,
      tripId,
      paidById: input.paidBy,
      splitAmong: input.splitAmong,
    });
    return { type: 'success' };
  };
}
