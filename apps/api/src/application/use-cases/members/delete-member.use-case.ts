import type { IMemberRepository } from '../../../application/ports/repositories/member.repository.js';
import type { ITripAccessService } from '../../../application/ports/services/trip-access.service.js';

type Deps = { memberRepository: IMemberRepository; tripAccessService: ITripAccessService };

export type DeleteMemberResult =
  | { type: 'success' }
  | { type: 'has_expenses'; expenseCount: number; memberName: string }
  | { type: 'error'; reason: 'forbidden' | 'not_found' };

export type DeleteMemberUseCase = (tripId: string, memberId: string, userId: string) => Promise<DeleteMemberResult>;

export function createDeleteMemberUseCase({ memberRepository, tripAccessService }: Deps): DeleteMemberUseCase {
  return async (tripId, memberId, userId) => {
    const canEdit = await tripAccessService.canEdit(tripId, userId);
    if (!canEdit) return { type: 'error', reason: 'forbidden' };

    const member = await memberRepository.findById(memberId);
    if (!member || member.tripId !== tripId) return { type: 'error', reason: 'not_found' };

    const expenseCount = await memberRepository.countExpenses(tripId, memberId);
    if (expenseCount > 0) return { type: 'has_expenses', expenseCount, memberName: member.name };

    await memberRepository.delete(memberId);
    return { type: 'success' };
  };
}
