import type { IMemberRepository } from './repositories/member.repository.js';
import type { ITripMemberRepository } from './repositories/trip-member.repository.js';
import type { IInvitationRepository } from './repositories/invitation.repository.js';

export interface TransactionalContext {
  memberRepository: IMemberRepository;
  tripMemberRepository: ITripMemberRepository;
  invitationRepository: IInvitationRepository;
}

export interface ITransactionManager {
  transaction<T>(fn: (ctx: TransactionalContext) => Promise<T>): Promise<T>;
}
