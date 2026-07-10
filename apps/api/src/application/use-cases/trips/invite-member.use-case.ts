import type { ITripRepository } from '../../../application/ports/repositories/trip.repository.js';
import type { ITripMemberRepository } from '../../../application/ports/repositories/trip-member.repository.js';
import type { IInvitationRepository } from '../../../application/ports/repositories/invitation.repository.js';
import type { IUserRepository } from '../../../application/ports/repositories/user.repository.js';
import type { ITripAccessService } from '../../../application/ports/services/trip-access.service.js';
import type { IEmailService } from '../../../application/ports/services/email.service.js';
import type { ITransactionManager } from '../../../application/ports/transaction-manager.js';
import { INVITATION } from '@group-expense-hub/db/constants';
import { getDisplayName } from '../../../domain/entities/user.js';
import { getRandomColor } from '../../../lib/colors.js';

type Deps = {
  tripRepository: ITripRepository;
  tripMemberRepository: ITripMemberRepository;
  invitationRepository: IInvitationRepository;
  userRepository: IUserRepository;
  tripAccessService: ITripAccessService;
  emailService: IEmailService;
  transactionManager: ITransactionManager;
};

export type InviteMemberResult =
  | { type: 'already_sent' }
  | { type: 'invitation_sent'; email: string }
  | { type: 'user_added'; userId: string; userName: string | null; userEmail: string; userImage: string | null; memberId: string; memberName: string; memberColor: string }
  | { type: 'error'; reason: 'forbidden' | 'trip_not_found' | 'already_member' | 'self_invite' };

export type InviteMemberUseCase = (tripId: string, email: string, userId: string) => Promise<InviteMemberResult>;

export function createInviteMemberUseCase({ tripRepository, tripMemberRepository, invitationRepository, userRepository, tripAccessService, emailService, transactionManager }: Deps): InviteMemberUseCase {
  return async (tripId, email, userId) => {
    const isOwner = await tripAccessService.isOwner(tripId, userId);
    if (!isOwner) return { type: 'error', reason: 'forbidden' };

    const trip = await tripRepository.findNameAndOwner(tripId);
    if (!trip) return { type: 'error', reason: 'trip_not_found' };

    const inviterName = trip.user?.name || trip.user?.email || 'Someone';
    const appUrl = emailService.getAppUrl();

    const userToInvite = await userRepository.findByEmail(email);

    if (!userToInvite) {
      const existing = await invitationRepository.findByTripAndEmail(tripId, email);
      if (existing && existing.expiresAt > new Date()) return { type: 'already_sent' };

      const token = crypto.randomUUID();
      await invitationRepository.upsert(tripId, email, token, new Date(Date.now() + INVITATION.EXPIRES_IN));
      await emailService.sendTripInvitationEmail({ to: email, inviterName, tripName: trip.name, inviteUrl: `${appUrl}/join/${token}` });
      return { type: 'invitation_sent', email };
    }

    if (userToInvite.id === userId) return { type: 'error', reason: 'self_invite' };

    const existingMember = await tripMemberRepository.findByTripAndUser(tripId, userToInvite.id);
    if (existingMember) return { type: 'error', reason: 'already_member' };

    const memberName = getDisplayName(userToInvite);
    const memberId = crypto.randomUUID();
    const memberColor = getRandomColor();

    await transactionManager.transaction(async ({ tripMemberRepository: txTm, memberRepository: txMember }) => {
      await txTm.create({ tripId, userId: userToInvite.id, role: 'collaborator' });
      await txMember.create({ id: memberId, name: memberName, color: memberColor, tripId });
    });

    await emailService.sendTripAddedNotification({ to: userToInvite.email, name: userToInvite.name, inviterName, tripName: trip.name, tripUrl: `${appUrl}/trip/${tripId}` });

    return { type: 'user_added', userId: userToInvite.id, userName: userToInvite.name, userEmail: userToInvite.email, userImage: userToInvite.image, memberId, memberName, memberColor };
  };
}
