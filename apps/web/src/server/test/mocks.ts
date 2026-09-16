import { vi } from 'vitest';
import type { TripAccessLevel, ITripAccessService } from '../application/ports/services/trip-access.service';
import type { IMemberRepository } from '../application/ports/repositories/member.repository';
import type { ITripMemberRepository } from '../application/ports/repositories/trip-member.repository';
import type { IInvitationRepository } from '../application/ports/repositories/invitation.repository';
import type { IUserRepository } from '../application/ports/repositories/user.repository';
import type { ITripRepository } from '../application/ports/repositories/trip.repository';
import type { IExpenseRepository } from '../application/ports/repositories/expense.repository';
import type { IEmailService } from '../application/ports/services/email.service';
import type { ITransactionManager, TransactionalContext } from '../application/ports/transaction-manager';

export function makeTripAccess(level: TripAccessLevel): ITripAccessService {
  return {
    getAccessLevel: vi.fn().mockResolvedValue(level),
    canEdit: vi.fn().mockResolvedValue(level === 'owner' || level === 'collaborator'),
    isOwner: vi.fn().mockResolvedValue(level === 'owner'),
  };
}

export function makeTripRepository(overrides: Partial<ITripRepository> = {}): ITripRepository {
  return {
    findSummariesOwnedByUser: vi.fn().mockResolvedValue([]),
    findSummariesByIds: vi.fn().mockResolvedValue([]),
    findByIdFull: vi.fn().mockResolvedValue(null),
    findNameAndOwner: vi.fn().mockResolvedValue(null),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

export function makeExpenseRepository(overrides: Partial<IExpenseRepository> = {}): IExpenseRepository {
  return {
    findById: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue(undefined),
    update: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

export function makeMemberRepository(overrides: Partial<IMemberRepository> = {}): IMemberRepository {
  return {
    findById: vi.fn().mockResolvedValue(null),
    findByTripAndName: vi.fn().mockResolvedValue(null),
    findNamesByTripId: vi.fn().mockResolvedValue(new Set()),
    countExpenses: vi.fn().mockResolvedValue(0),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

export function makeTripMemberRepository(overrides: Partial<ITripMemberRepository> = {}): ITripMemberRepository {
  return {
    findIdsByUserId: vi.fn().mockResolvedValue([]),
    findByTripAndUser: vi.fn().mockResolvedValue(null),
    findById: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue({ id: 'tm-new' }),
    delete: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

export function makeInvitationRepository(overrides: Partial<IInvitationRepository> = {}): IInvitationRepository {
  return {
    findPendingByEmail: vi.fn().mockResolvedValue([]),
    findById: vi.fn().mockResolvedValue(null),
    findByToken: vi.fn().mockResolvedValue(null),
    findByTripAndEmail: vi.fn().mockResolvedValue(null),
    upsert: vi.fn().mockResolvedValue(undefined),
    markAccepted: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

export function makeUserRepository(overrides: Partial<IUserRepository> = {}): IUserRepository {
  return {
    findById: vi.fn().mockResolvedValue(null),
    findByEmail: vi.fn().mockResolvedValue(null),
    update: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

export function makeEmailService(appUrl = 'https://app.example.com'): IEmailService {
  return {
    getAppUrl: vi.fn().mockReturnValue(appUrl),
    sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
    sendTripInvitationEmail: vi.fn().mockResolvedValue(undefined),
    sendTripAddedNotification: vi.fn().mockResolvedValue(undefined),
  };
}

/** Runs the callback against the given (mocked) transactional repositories. */
export function makeTransactionManager(ctx: Partial<TransactionalContext> = {}) {
  const context: TransactionalContext = {
    memberRepository: makeMemberRepository(),
    tripMemberRepository: makeTripMemberRepository(),
    invitationRepository: makeInvitationRepository(),
    ...ctx,
  };
  const manager: ITransactionManager = {
    transaction: vi.fn((fn) => fn(context)) as ITransactionManager['transaction'],
  };
  return { manager, context };
}
