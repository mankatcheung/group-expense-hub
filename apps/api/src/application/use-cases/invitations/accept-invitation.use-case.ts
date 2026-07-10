import type { IInvitationRepository } from '../../../application/ports/repositories/invitation.repository.js';
import type { ITripMemberRepository } from '../../../application/ports/repositories/trip-member.repository.js';
import type { ITransactionManager } from '../../../application/ports/transaction-manager.js';
import type { AuthUser } from '../../../application/ports/services/auth.service.js';
import { isExpired, isPending } from '../../../domain/entities/invitation.js';
import { getDisplayName } from '../../../domain/entities/user.js';
import { getRandomColor } from '../../../lib/colors.js';

type Deps = {
  invitationRepository: IInvitationRepository;
  tripMemberRepository: ITripMemberRepository;
  transactionManager: ITransactionManager;
};

export type AcceptInvitationResult =
  | { type: 'success'; tripId: string }
  | { type: 'error'; reason: 'not_found' | 'wrong_user' | 'expired' | 'already_used' | 'already_member' };

export type AcceptInvitationUseCase = (invitationId: string, user: AuthUser) => Promise<AcceptInvitationResult>;

export function createAcceptInvitationUseCase({ invitationRepository, tripMemberRepository, transactionManager }: Deps): AcceptInvitationUseCase {
  return async (invitationId, user) => {
    const invitation = await invitationRepository.findById(invitationId);
    if (!invitation) return { type: 'error', reason: 'not_found' };
    if (invitation.email !== user.email) return { type: 'error', reason: 'wrong_user' };
    if (isExpired(invitation)) return { type: 'error', reason: 'expired' };
    if (!isPending(invitation)) return { type: 'error', reason: 'already_used' };

    const existing = await tripMemberRepository.findByTripAndUser(invitation.tripId, user.id);
    if (existing) return { type: 'error', reason: 'already_member' };

    const memberName = getDisplayName(user);
    await transactionManager.transaction(async ({ invitationRepository: txInv, tripMemberRepository: txTm, memberRepository: txMember }) => {
      await txInv.markAccepted(invitationId);
      await txTm.create({ tripId: invitation.tripId, userId: user.id, role: invitation.role || 'collaborator' });
      await txMember.create({ id: crypto.randomUUID(), name: memberName, color: getRandomColor(), tripId: invitation.tripId });
    });

    return { type: 'success', tripId: invitation.tripId };
  };
}
