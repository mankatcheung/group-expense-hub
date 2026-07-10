import type { IExpenseRepository } from '../../../application/ports/repositories/expense.repository.js';
import type { ITripAccessService } from '../../../application/ports/services/trip-access.service.js';

type Deps = { expenseRepository: IExpenseRepository; tripAccessService: ITripAccessService };

export interface UpdateExpenseInput {
  description: string;
  amount: number;
  currency: string;
  date?: string;
  paidBy: string;
  splitAmong: string[];
}

export type UpdateExpenseResult = { type: 'success' } | { type: 'error'; reason: 'forbidden' | 'not_found' };

export type UpdateExpenseUseCase = (tripId: string, expenseId: string, input: UpdateExpenseInput, userId: string) => Promise<UpdateExpenseResult>;

export function createUpdateExpenseUseCase({ expenseRepository, tripAccessService }: Deps): UpdateExpenseUseCase {
  return async (tripId, expenseId, input, userId) => {
    const canEdit = await tripAccessService.canEdit(tripId, userId);
    if (!canEdit) return { type: 'error', reason: 'forbidden' };

    const expense = await expenseRepository.findById(expenseId);
    if (!expense || expense.tripId !== tripId) return { type: 'error', reason: 'not_found' };

    await expenseRepository.update(expenseId, {
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
