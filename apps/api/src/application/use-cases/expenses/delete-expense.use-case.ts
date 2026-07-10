import type { IExpenseRepository } from '../../../application/ports/repositories/expense.repository.js';
import type { ITripAccessService } from '../../../application/ports/services/trip-access.service.js';

type Deps = { expenseRepository: IExpenseRepository; tripAccessService: ITripAccessService };

export type DeleteExpenseResult = { type: 'success' } | { type: 'error'; reason: 'forbidden' | 'not_found' };

export type DeleteExpenseUseCase = (tripId: string, expenseId: string, userId: string) => Promise<DeleteExpenseResult>;

export function createDeleteExpenseUseCase({ expenseRepository, tripAccessService }: Deps): DeleteExpenseUseCase {
  return async (tripId, expenseId, userId) => {
    const canEdit = await tripAccessService.canEdit(tripId, userId);
    if (!canEdit) return { type: 'error', reason: 'forbidden' };

    const expense = await expenseRepository.findById(expenseId);
    if (!expense || expense.tripId !== tripId) return { type: 'error', reason: 'not_found' };

    await expenseRepository.delete(expenseId);
    return { type: 'success' };
  };
}
