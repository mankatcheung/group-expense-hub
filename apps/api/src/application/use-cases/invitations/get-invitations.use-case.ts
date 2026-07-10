import type { IInvitationRepository, PendingInvitation } from '../../../application/ports/repositories/invitation.repository.js';

type Deps = { invitationRepository: IInvitationRepository };

export type GetInvitationsUseCase = (email: string) => Promise<PendingInvitation[]>;

export function createGetInvitationsUseCase({ invitationRepository }: Deps): GetInvitationsUseCase {
  return (email) => invitationRepository.findPendingByEmail(email);
}
