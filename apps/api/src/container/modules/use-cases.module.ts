import { createModule } from '@evyweb/ioctopus';
import type { AppRegistry } from '../tokens.js';
import { createGetTripsUseCase } from '../../application/use-cases/trips/get-trips.use-case.js';
import { createCreateTripUseCase } from '../../application/use-cases/trips/create-trip.use-case.js';
import { createGetTripUseCase } from '../../application/use-cases/trips/get-trip.use-case.js';
import { createUpdateTripUseCase } from '../../application/use-cases/trips/update-trip.use-case.js';
import { createDeleteTripUseCase } from '../../application/use-cases/trips/delete-trip.use-case.js';
import { createInviteMemberUseCase } from '../../application/use-cases/trips/invite-member.use-case.js';
import { createJoinTripUseCase } from '../../application/use-cases/trips/join-trip.use-case.js';
import { createRemoveCollaboratorUseCase } from '../../application/use-cases/trips/remove-collaborator.use-case.js';
import { createCreateExpenseUseCase } from '../../application/use-cases/expenses/create-expense.use-case.js';
import { createUpdateExpenseUseCase } from '../../application/use-cases/expenses/update-expense.use-case.js';
import { createDeleteExpenseUseCase } from '../../application/use-cases/expenses/delete-expense.use-case.js';
import { createCreateMemberUseCase } from '../../application/use-cases/members/create-member.use-case.js';
import { createUpdateMemberUseCase } from '../../application/use-cases/members/update-member.use-case.js';
import { createDeleteMemberUseCase } from '../../application/use-cases/members/delete-member.use-case.js';
import { createGetInvitationsUseCase } from '../../application/use-cases/invitations/get-invitations.use-case.js';
import { createAcceptInvitationUseCase } from '../../application/use-cases/invitations/accept-invitation.use-case.js';
import { createUpdateProfileUseCase } from '../../application/use-cases/users/update-profile.use-case.js';
import { createCheckEmailUseCase } from '../../application/use-cases/check-email/check-email.use-case.js';

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
    emailBloomFilterService: 'EMAIL_BLOOM_FILTER_SERVICE',
    userRepository: 'USER_REPOSITORY',
  });

  return mod;
}
