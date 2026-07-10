import type { IMemberRepository, MemberRow } from '../../../application/ports/repositories/member.repository.js';
import type { ITripAccessService } from '../../../application/ports/services/trip-access.service.js';

type Deps = { memberRepository: IMemberRepository; tripAccessService: ITripAccessService };

export type UpdateMemberResult = { type: 'success'; member: MemberRow } | { type: 'error'; reason: 'forbidden' | 'not_found' };

export type UpdateMemberUseCase = (tripId: string, memberId: string, name: string, userId: string) => Promise<UpdateMemberResult>;

export function createUpdateMemberUseCase({ memberRepository, tripAccessService }: Deps): UpdateMemberUseCase {
  return async (tripId, memberId, name, userId) => {
    const canEdit = await tripAccessService.canEdit(tripId, userId);
    if (!canEdit) return { type: 'error', reason: 'forbidden' };

    const member = await memberRepository.findById(memberId);
    if (!member || member.tripId !== tripId) return { type: 'error', reason: 'not_found' };

    const updated = await memberRepository.update(memberId, { name });
    return { type: 'success', member: updated };
  };
}
