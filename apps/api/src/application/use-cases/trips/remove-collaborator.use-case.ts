import type { ITripMemberRepository } from '../../../application/ports/repositories/trip-member.repository.js';
import type { IMemberRepository } from '../../../application/ports/repositories/member.repository.js';
import type { ITripAccessService } from '../../../application/ports/services/trip-access.service.js';
import type { ITransactionManager } from '../../../application/ports/transaction-manager.js';
import { getDisplayName } from '../../../domain/entities/user.js';

type Deps = {
  tripMemberRepository: ITripMemberRepository;
  memberRepository: IMemberRepository;
  tripAccessService: ITripAccessService;
  transactionManager: ITransactionManager;
};

export type RemoveCollaboratorResult =
  | { type: 'success' }
  | { type: 'error'; reason: 'forbidden' | 'not_found' };

export type RemoveCollaboratorUseCase = (tripId: string, tripMemberId: string, userId: string) => Promise<RemoveCollaboratorResult>;

export function createRemoveCollaboratorUseCase({ tripMemberRepository, memberRepository, tripAccessService, transactionManager }: Deps): RemoveCollaboratorUseCase {
  return async (tripId, tripMemberId, userId) => {
    const isOwner = await tripAccessService.isOwner(tripId, userId);
    if (!isOwner) return { type: 'error', reason: 'forbidden' };

    const tripMember = await tripMemberRepository.findById(tripMemberId);
    if (!tripMember) return { type: 'error', reason: 'not_found' };

    const memberName = getDisplayName(tripMember.user);
    const member = await memberRepository.findByTripAndName(tripId, memberName);

    await transactionManager.transaction(async ({ tripMemberRepository: txTm, memberRepository: txMember }) => {
      await txTm.delete(tripMemberId);
      if (member) await txMember.delete(member.id);
    });

    return { type: 'success' };
  };
}
