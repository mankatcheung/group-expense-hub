import type { IInvitationRepository } from '../../../application/ports/repositories/invitation.repository.js';
import type { ITripMemberRepository } from '../../../application/ports/repositories/trip-member.repository.js';
import type { IUserRepository } from '../../../application/ports/repositories/user.repository.js';
import type { IMemberRepository } from '../../../application/ports/repositories/member.repository.js';
import type { ITransactionManager } from '../../../application/ports/transaction-manager.js';
import { isExpired, isPending } from '../../../domain/entities/invitation.js';
import { getDisplayName } from '../../../domain/entities/user.js';
import { getRandomColor } from '../../../lib/colors.js';

type Deps = {
  invitationRepository: IInvitationRepository;
  tripMemberRepository: ITripMemberRepository;
  userRepository: IUserRepository;
  memberRepository: IMemberRepository;
  transactionManager: ITransactionManager;
};

export type JoinTripResult =
  | { type: 'success'; tripId: string }
  | { type: 'error'; reason: 'not_found' | 'expired' | 'already_used' | 'already_member' };

export type JoinTripUseCase = (token: string, userId: string) => Promise<JoinTripResult>;

export function createJoinTripUseCase({ invitationRepository, tripMemberRepository, userRepository, memberRepository, transactionManager }: Deps): JoinTripUseCase {
  return async (token, userId) => {
    const invitation = await invitationRepository.findByToken(token);
    if (!invitation) return { type: 'error', reason: 'not_found' };
    if (isExpired(invitation)) return { type: 'error', reason: 'expired' };
    if (!isPending(invitation)) return { type: 'error', reason: 'already_used' };

    const existing = await tripMemberRepository.findByTripAndUser(invitation.tripId, userId);
    if (existing) return { type: 'error', reason: 'already_member' };

    const userData = await userRepository.findById(userId);
    const existingNames = await memberRepository.findNamesByTripId(invitation.tripId);
    const proposed = userData ? getDisplayName(userData) : 'User';
    const emailFallback = userData?.email?.split('@')[0] ?? 'User';
    const memberName = existingNames.has(proposed.toLowerCase()) ? emailFallback : proposed;

    await transactionManager.transaction(async ({ invitationRepository: txInv, tripMemberRepository: txTm, memberRepository: txMember }) => {
      await txInv.markAccepted(invitation.id);
      await txTm.create({ tripId: invitation.tripId, userId, role: invitation.role || 'collaborator' });
      await txMember.create({ id: crypto.randomUUID(), name: memberName, color: getRandomColor(), tripId: invitation.tripId });
    });

    return { type: 'success', tripId: invitation.tripId };
  };
}
