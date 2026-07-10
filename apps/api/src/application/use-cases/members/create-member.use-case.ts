import type { IMemberRepository, MemberRow } from '../../../application/ports/repositories/member.repository.js';
import type { ITripAccessService } from '../../../application/ports/services/trip-access.service.js';

type Deps = { memberRepository: IMemberRepository; tripAccessService: ITripAccessService };

export interface CreateMemberInput {
  id: string;
  name: string;
  color: string;
}

export type CreateMemberResult = { type: 'success'; member: MemberRow } | { type: 'error'; reason: 'forbidden' };

export type CreateMemberUseCase = (tripId: string, input: CreateMemberInput, userId: string) => Promise<CreateMemberResult>;

export function createCreateMemberUseCase({ memberRepository, tripAccessService }: Deps): CreateMemberUseCase {
  return async (tripId, input, userId) => {
    const canEdit = await tripAccessService.canEdit(tripId, userId);
    if (!canEdit) return { type: 'error', reason: 'forbidden' };

    const member = await memberRepository.create({ ...input, tripId });
    return { type: 'success', member };
  };
}
