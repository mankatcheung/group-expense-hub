import { createModule } from '@evyweb/ioctopus';
import type { AppRegistry } from '../tokens';
import { createGetTripsUseCase } from '../../application/use-cases/trips/get-trips.use-case';
import { createCreateTripUseCase } from '../../application/use-cases/trips/create-trip.use-case';
import { createGetTripUseCase } from '../../application/use-cases/trips/get-trip.use-case';
import { createUpdateTripUseCase } from '../../application/use-cases/trips/update-trip.use-case';
import { createDeleteTripUseCase } from '../../application/use-cases/trips/delete-trip.use-case';
import { createInviteMemberUseCase } from '../../application/use-cases/trips/invite-member.use-case';
import { createJoinTripUseCase } from '../../application/use-cases/trips/join-trip.use-case';
import { createRemoveCollaboratorUseCase } from '../../application/use-cases/trips/remove-collaborator.use-case';
import { createCreateExpenseUseCase } from '../../application/use-cases/expenses/create-expense.use-case';
import { createUpdateExpenseUseCase } from '../../application/use-cases/expenses/update-expense.use-case';
import { createDeleteExpenseUseCase } from '../../application/use-cases/expenses/delete-expense.use-case';
import { createCreateMemberUseCase } from '../../application/use-cases/members/create-member.use-case';
import { createUpdateMemberUseCase } from '../../application/use-cases/members/update-member.use-case';
import { createDeleteMemberUseCase } from '../../application/use-cases/members/delete-member.use-case';
import { createGetInvitationsUseCase } from '../../application/use-cases/invitations/get-invitations.use-case';
import { createAcceptInvitationUseCase } from '../../application/use-cases/invitations/accept-invitation.use-case';
import { createUpdateProfileUseCase } from '../../application/use-cases/users/update-profile.use-case';
import { createCheckEmailUseCase } from '../../application/use-cases/check-email/check-email.use-case';

export function createUseCasesModule() {
  const mod = createModule<AppRegistry>();

  mod.bind('GET_TRIPS_USE_CASE').toHigherOrderFunction(createGetTripsUseCase, {
    tripRepository: 'TRIP_REPOSITORY',
    tripMemberRepository: 'TRIP_MEMBER_REPOSITORY',
  });

  mod.bind('CREATE_TRIP_USE_CASE').toHigherOrderFunction(createCreateTripUseCase, {
    tripRepository: 'TRIP_REPOSITORY',
  });

  mod.bind('GET_TRIP_USE_CASE').toHigherOrderFunction(createGetTripUseCase, {
    tripRepository: 'TRIP_REPOSITORY',
    tripAccessService: 'TRIP_ACCESS_SERVICE',
  });

  mod.bind('UPDATE_TRIP_USE_CASE').toHigherOrderFunction(createUpdateTripUseCase, {
    tripRepository: 'TRIP_REPOSITORY',
    tripAccessService: 'TRIP_ACCESS_SERVICE',
  });

  mod.bind('DELETE_TRIP_USE_CASE').toHigherOrderFunction(createDeleteTripUseCase, {
    tripRepository: 'TRIP_REPOSITORY',
  });

  mod.bind('INVITE_MEMBER_USE_CASE').toHigherOrderFunction(createInviteMemberUseCase, {
    tripRepository: 'TRIP_REPOSITORY',
    tripMemberRepository: 'TRIP_MEMBER_REPOSITORY',
    invitationRepository: 'INVITATION_REPOSITORY',
    userRepository: 'USER_REPOSITORY',
    tripAccessService: 'TRIP_ACCESS_SERVICE',
    emailService: 'EMAIL_SERVICE',
    transactionManager: 'TRANSACTION_MANAGER',
  });

  mod.bind('JOIN_TRIP_USE_CASE').toHigherOrderFunction(createJoinTripUseCase, {
    invitationRepository: 'INVITATION_REPOSITORY',
    tripMemberRepository: 'TRIP_MEMBER_REPOSITORY',
    userRepository: 'USER_REPOSITORY',
    memberRepository: 'MEMBER_REPOSITORY',
    transactionManager: 'TRANSACTION_MANAGER',
  });

  mod.bind('REMOVE_COLLABORATOR_USE_CASE').toHigherOrderFunction(createRemoveCollaboratorUseCase, {
    tripMemberRepository: 'TRIP_MEMBER_REPOSITORY',
    memberRepository: 'MEMBER_REPOSITORY',
    tripAccessService: 'TRIP_ACCESS_SERVICE',
    transactionManager: 'TRANSACTION_MANAGER',
  });

  mod.bind('CREATE_EXPENSE_USE_CASE').toHigherOrderFunction(createCreateExpenseUseCase, {
    expenseRepository: 'EXPENSE_REPOSITORY',
    tripAccessService: 'TRIP_ACCESS_SERVICE',
  });

  mod.bind('UPDATE_EXPENSE_USE_CASE').toHigherOrderFunction(createUpdateExpenseUseCase, {
    expenseRepository: 'EXPENSE_REPOSITORY',
    tripAccessService: 'TRIP_ACCESS_SERVICE',
  });

  mod.bind('DELETE_EXPENSE_USE_CASE').toHigherOrderFunction(createDeleteExpenseUseCase, {
    expenseRepository: 'EXPENSE_REPOSITORY',
    tripAccessService: 'TRIP_ACCESS_SERVICE',
  });

  mod.bind('CREATE_MEMBER_USE_CASE').toHigherOrderFunction(createCreateMemberUseCase, {
    memberRepository: 'MEMBER_REPOSITORY',
    tripAccessService: 'TRIP_ACCESS_SERVICE',
  });

  mod.bind('UPDATE_MEMBER_USE_CASE').toHigherOrderFunction(createUpdateMemberUseCase, {
    memberRepository: 'MEMBER_REPOSITORY',
    tripAccessService: 'TRIP_ACCESS_SERVICE',
  });

  mod.bind('DELETE_MEMBER_USE_CASE').toHigherOrderFunction(createDeleteMemberUseCase, {
    memberRepository: 'MEMBER_REPOSITORY',
    tripAccessService: 'TRIP_ACCESS_SERVICE',
  });

  mod.bind('GET_INVITATIONS_USE_CASE').toHigherOrderFunction(createGetInvitationsUseCase, {
    invitationRepository: 'INVITATION_REPOSITORY',
  });

  mod.bind('ACCEPT_INVITATION_USE_CASE').toHigherOrderFunction(createAcceptInvitationUseCase, {
    invitationRepository: 'INVITATION_REPOSITORY',
    tripMemberRepository: 'TRIP_MEMBER_REPOSITORY',
    transactionManager: 'TRANSACTION_MANAGER',
  });

  mod.bind('UPDATE_PROFILE_USE_CASE').toHigherOrderFunction(createUpdateProfileUseCase, {
    userRepository: 'USER_REPOSITORY',
  });

  mod.bind('CHECK_EMAIL_USE_CASE').toHigherOrderFunction(createCheckEmailUseCase, {
    userRepository: 'USER_REPOSITORY',
  });

  return mod;
}
