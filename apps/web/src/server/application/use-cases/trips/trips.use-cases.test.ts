import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { INVITATION } from '@group-expense-hub/db/constants';
import { createCreateTripUseCase } from './create-trip.use-case';
import { createDeleteTripUseCase } from './delete-trip.use-case';
import { createGetTripUseCase } from './get-trip.use-case';
import { createGetTripsUseCase } from './get-trips.use-case';
import { createUpdateTripUseCase } from './update-trip.use-case';
import { createInviteMemberUseCase } from './invite-member.use-case';
import { createJoinTripUseCase } from './join-trip.use-case';
import { createRemoveCollaboratorUseCase } from './remove-collaborator.use-case';
import {
  makeEmailService,
  makeInvitationRepository,
  makeMemberRepository,
  makeTransactionManager,
  makeTripAccess,
  makeTripMemberRepository,
  makeTripRepository,
  makeUserRepository,
} from '../../../test/mocks';

const NOW = new Date('2026-09-01T12:00:00.000Z');

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('createTrip', () => {
  it('creates the trip for the user, converting createdAt to a Date', async () => {
    const tripRepository = makeTripRepository({ create: vi.fn().mockResolvedValue({ id: 't1', name: 'Bali', createdAt: NOW }) });
    const createTrip = createCreateTripUseCase({ tripRepository });

    const result = await createTrip({ id: 't1', name: 'Bali', createdAt: '2026-01-01T00:00:00.000Z' }, 'u1');

    expect(result).toEqual({ id: 't1', name: 'Bali', createdAt: NOW });
    expect(tripRepository.create).toHaveBeenCalledWith({ id: 't1', name: 'Bali', userId: 'u1', createdAt: new Date('2026-01-01T00:00:00.000Z') });
  });

  it('leaves createdAt undefined when not provided', async () => {
    const tripRepository = makeTripRepository({ create: vi.fn().mockResolvedValue({}) });
    await createCreateTripUseCase({ tripRepository })({ id: 't1', name: 'Bali' }, 'u1');
    expect(tripRepository.create).toHaveBeenCalledWith(expect.objectContaining({ createdAt: undefined }));
  });
});

describe('deleteTrip', () => {
  it('scopes the delete to the requesting user', async () => {
    const tripRepository = makeTripRepository();
    await createDeleteTripUseCase({ tripRepository })('t1', 'u1');
    expect(tripRepository.delete).toHaveBeenCalledWith('t1', 'u1');
  });
});

describe('getTrip', () => {
  it('returns null without loading the trip when the user has no access', async () => {
    const tripRepository = makeTripRepository();
    const getTrip = createGetTripUseCase({ tripRepository, tripAccessService: makeTripAccess(null) });

    expect(await getTrip('t1', 'u1')).toBeNull();
    expect(tripRepository.findByIdFull).not.toHaveBeenCalled();
  });

  it.each(['owner', 'collaborator'] as const)('returns the full trip for a %s', async (level) => {
    const trip = { id: 't1' };
    const tripRepository = makeTripRepository({ findByIdFull: vi.fn().mockResolvedValue(trip) });
    const getTrip = createGetTripUseCase({ tripRepository, tripAccessService: makeTripAccess(level) });

    expect(await getTrip('t1', 'u1')).toBe(trip);
  });
});

describe('getTrips', () => {
  it('returns owned trips followed by trips the user collaborates on', async () => {
    const owned = [{ id: 'own-1' }];
    const shared = [{ id: 'shared-1' }, { id: 'shared-2' }];
    const tripRepository = makeTripRepository({
      findSummariesOwnedByUser: vi.fn().mockResolvedValue(owned),
      findSummariesByIds: vi.fn().mockResolvedValue(shared),
    });
    const tripMemberRepository = makeTripMemberRepository({ findIdsByUserId: vi.fn().mockResolvedValue(['shared-1', 'shared-2']) });

    const trips = await createGetTripsUseCase({ tripRepository, tripMemberRepository })('u1');

    expect(trips).toEqual([...owned, ...shared]);
    expect(tripRepository.findSummariesOwnedByUser).toHaveBeenCalledWith('u1');
    expect(tripRepository.findSummariesByIds).toHaveBeenCalledWith(['shared-1', 'shared-2']);
  });
});

describe('updateTrip', () => {
  it('returns forbidden without updating when the user cannot edit', async () => {
    const tripRepository = makeTripRepository();
    const result = await createUpdateTripUseCase({ tripRepository, tripAccessService: makeTripAccess(null) })('t1', 'New', 'u1');

    expect(result).toEqual({ error: 'forbidden' });
    expect(tripRepository.update).not.toHaveBeenCalled();
  });

  it('renames the trip for a collaborator', async () => {
    const updated = { id: 't1', name: 'New', createdAt: NOW };
    const tripRepository = makeTripRepository({ update: vi.fn().mockResolvedValue(updated) });
    const result = await createUpdateTripUseCase({ tripRepository, tripAccessService: makeTripAccess('collaborator') })('t1', 'New', 'u1');

    expect(result).toBe(updated);
    expect(tripRepository.update).toHaveBeenCalledWith('t1', { name: 'New' });
  });
});

describe('inviteMember', () => {
  const trip: { name: string; user: { name: string | null; email: string } | null } = {
    name: 'Bali',
    user: { name: 'Olivia Owner', email: 'olivia@example.com' },
  };

  function setup(overrides: {
    level?: 'owner' | 'collaborator' | null;
    trip?: typeof trip | null;
    userToInvite?: { id: string; name: string | null; email: string; image: string | null } | null;
    existingInvitation?: { id: string; expiresAt: Date; status: string } | null;
    existingMember?: { id: string } | null;
  } = {}) {
    const tripRepository = makeTripRepository({ findNameAndOwner: vi.fn().mockResolvedValue(overrides.trip === undefined ? trip : overrides.trip) });
    const userRepository = makeUserRepository({ findByEmail: vi.fn().mockResolvedValue(overrides.userToInvite ?? null) });
    const invitationRepository = makeInvitationRepository({ findByTripAndEmail: vi.fn().mockResolvedValue(overrides.existingInvitation ?? null) });
    const tripMemberRepository = makeTripMemberRepository({ findByTripAndUser: vi.fn().mockResolvedValue(overrides.existingMember ?? null) });
    const emailService = makeEmailService('https://app.example.com');
    const { manager, context } = makeTransactionManager();
    const tripAccessService = makeTripAccess(overrides.level === undefined ? 'owner' : overrides.level);

    const inviteMember = createInviteMemberUseCase({
      tripRepository,
      tripMemberRepository,
      invitationRepository,
      userRepository,
      tripAccessService,
      emailService,
      transactionManager: manager,
    });
    return { inviteMember, tripRepository, userRepository, invitationRepository, emailService, manager, context };
  }

  it('only lets the owner invite, before any other lookup', async () => {
    const { inviteMember, tripRepository, userRepository } = setup({ level: 'collaborator' });

    expect(await inviteMember('t1', 'new@example.com', 'u1')).toEqual({ type: 'error', reason: 'forbidden' });
    expect(tripRepository.findNameAndOwner).not.toHaveBeenCalled();
    expect(userRepository.findByEmail).not.toHaveBeenCalled();
  });

  it('returns trip_not_found when the trip is gone', async () => {
    const { inviteMember } = setup({ trip: null });
    expect(await inviteMember('t1', 'new@example.com', 'u1')).toEqual({ type: 'error', reason: 'trip_not_found' });
  });

  it('stores a pending invitation and emails a join link for an unregistered email', async () => {
    const { inviteMember, invitationRepository, emailService } = setup();

    const result = await inviteMember('t1', 'new@example.com', 'u1');

    expect(result).toEqual({ type: 'invitation_sent', email: 'new@example.com' });
    expect(invitationRepository.upsert).toHaveBeenCalledWith('t1', 'new@example.com', expect.any(String), new Date(NOW.getTime() + INVITATION.EXPIRES_IN));
    const token = vi.mocked(invitationRepository.upsert).mock.calls[0]![2];
    expect(emailService.sendTripInvitationEmail).toHaveBeenCalledWith({
      to: 'new@example.com',
      inviterName: 'Olivia Owner',
      tripName: 'Bali',
      inviteUrl: `https://app.example.com/join/${token}`,
    });
  });

  it.each([
    ['owner email when the owner has no name', { name: null, email: 'olivia@example.com' }, 'olivia@example.com'],
    ['"Someone" when the trip has no owner', null, 'Someone'],
  ])('names the inviter by %s', async (_label, user, expected) => {
    const { inviteMember, emailService } = setup({ trip: { name: 'Bali', user } });
    await inviteMember('t1', 'new@example.com', 'u1');
    expect(emailService.sendTripInvitationEmail).toHaveBeenCalledWith(expect.objectContaining({ inviterName: expected }));
  });

  it('does not resend while an earlier invitation is still valid', async () => {
    const { inviteMember, invitationRepository, emailService } = setup({
      existingInvitation: { id: 'inv-1', expiresAt: new Date(NOW.getTime() + 1000), status: 'pending' },
    });

    expect(await inviteMember('t1', 'new@example.com', 'u1')).toEqual({ type: 'already_sent' });
    expect(invitationRepository.upsert).not.toHaveBeenCalled();
    expect(emailService.sendTripInvitationEmail).not.toHaveBeenCalled();
  });

  it('re-issues an expired invitation', async () => {
    const { inviteMember, invitationRepository } = setup({
      existingInvitation: { id: 'inv-1', expiresAt: new Date(NOW.getTime() - 1000), status: 'pending' },
    });

    expect(await inviteMember('t1', 'new@example.com', 'u1')).toEqual({ type: 'invitation_sent', email: 'new@example.com' });
    expect(invitationRepository.upsert).toHaveBeenCalled();
  });

  it('refuses to invite yourself', async () => {
    const { inviteMember } = setup({ userToInvite: { id: 'u1', name: 'Me', email: 'me@example.com', image: null } });
    expect(await inviteMember('t1', 'me@example.com', 'u1')).toEqual({ type: 'error', reason: 'self_invite' });
  });

  it('refuses a user who is already a collaborator', async () => {
    const { inviteMember, manager } = setup({
      userToInvite: { id: 'u2', name: 'Bob', email: 'bob@example.com', image: null },
      existingMember: { id: 'tm-1' },
    });
    expect(await inviteMember('t1', 'bob@example.com', 'u1')).toEqual({ type: 'error', reason: 'already_member' });
    expect(manager.transaction).not.toHaveBeenCalled();
  });

  it('adds a registered user directly as a collaborator and member, then notifies them', async () => {
    const userToInvite = { id: 'u2', name: null, email: 'bob@example.com', image: 'https://img' };
    const { inviteMember, context, emailService, invitationRepository } = setup({ userToInvite });

    const result = await inviteMember('t1', 'bob@example.com', 'u1');

    expect(result).toEqual({
      type: 'user_added',
      userId: 'u2',
      userName: null,
      userEmail: 'bob@example.com',
      userImage: 'https://img',
      memberId: expect.any(String),
      memberName: 'bob',
      memberColor: expect.stringMatching(/^#[0-9A-F]{6}$/i),
    });
    expect(context.tripMemberRepository.create).toHaveBeenCalledWith({ tripId: 't1', userId: 'u2', role: 'collaborator' });
    expect(context.memberRepository.create).toHaveBeenCalledWith({
      id: (result as { memberId: string }).memberId,
      name: 'bob',
      color: (result as { memberColor: string }).memberColor,
      tripId: 't1',
    });
    expect(emailService.sendTripAddedNotification).toHaveBeenCalledWith({
      to: 'bob@example.com',
      name: null,
      inviterName: 'Olivia Owner',
      tripName: 'Bali',
      tripUrl: 'https://app.example.com/trip/t1',
    });
    expect(invitationRepository.upsert).not.toHaveBeenCalled();
  });
});

describe('joinTrip', () => {
  const pending = { id: 'inv-1', tripId: 't1', status: 'pending', expiresAt: new Date('2026-12-01'), role: 'collaborator' };

  function setup(overrides: {
    invitation?: typeof pending | null;
    existingMember?: { id: string } | null;
    user?: { id: string; name: string | null; email: string; image: string | null } | null;
    existingNames?: string[];
  } = {}) {
    const invitationRepository = makeInvitationRepository({ findByToken: vi.fn().mockResolvedValue(overrides.invitation === undefined ? pending : overrides.invitation) });
    const tripMemberRepository = makeTripMemberRepository({ findByTripAndUser: vi.fn().mockResolvedValue(overrides.existingMember ?? null) });
    const userRepository = makeUserRepository({
      findById: vi.fn().mockResolvedValue(overrides.user === undefined ? { id: 'u2', name: 'Bob', email: 'bobby@example.com', image: null } : overrides.user),
    });
    const memberRepository = makeMemberRepository({ findNamesByTripId: vi.fn().mockResolvedValue(new Set(overrides.existingNames ?? [])) });
    const { manager, context } = makeTransactionManager();
    const joinTrip = createJoinTripUseCase({ invitationRepository, tripMemberRepository, userRepository, memberRepository, transactionManager: manager });
    return { joinTrip, context, manager };
  }

  it.each([
    ['not_found', { invitation: null }],
    ['expired', { invitation: { ...pending, expiresAt: new Date('2026-01-01') } }],
    ['already_used', { invitation: { ...pending, status: 'accepted' } }],
    ['already_member', { existingMember: { id: 'tm-1' } }],
  ] as const)('returns %s', async (reason, overrides) => {
    const { joinTrip, manager } = setup(overrides);
    expect(await joinTrip('token', 'u2')).toEqual({ type: 'error', reason });
    expect(manager.transaction).not.toHaveBeenCalled();
  });

  it('accepts the invitation and adds the user as collaborator and member in one transaction', async () => {
    const { joinTrip, context } = setup();

    expect(await joinTrip('token', 'u2')).toEqual({ type: 'success', tripId: 't1' });
    expect(context.invitationRepository.markAccepted).toHaveBeenCalledWith('inv-1');
    expect(context.tripMemberRepository.create).toHaveBeenCalledWith({ tripId: 't1', userId: 'u2', role: 'collaborator' });
    expect(context.memberRepository.create).toHaveBeenCalledWith(expect.objectContaining({ name: 'Bob', tripId: 't1' }));
  });

  it("falls back to the email's local part when the display name is already taken (case-insensitively)", async () => {
    const { joinTrip, context } = setup({ existingNames: ['bob'] });
    await joinTrip('token', 'u2');
    expect(context.memberRepository.create).toHaveBeenCalledWith(expect.objectContaining({ name: 'bobby' }));
  });

  it('uses the invitation role, defaulting to collaborator when empty', async () => {
    const { joinTrip, context } = setup({ invitation: { ...pending, role: '' } });
    await joinTrip('token', 'u2');
    expect(context.tripMemberRepository.create).toHaveBeenCalledWith(expect.objectContaining({ role: 'collaborator' }));
  });

  it('names the member "User" when the user record is missing', async () => {
    const { joinTrip, context } = setup({ user: null });
    await joinTrip('token', 'u2');
    expect(context.memberRepository.create).toHaveBeenCalledWith(expect.objectContaining({ name: 'User' }));
  });
});

describe('removeCollaborator', () => {
  const collaborator = { id: 'tm-1', userId: 'u2', tripId: 't1', role: 'collaborator', user: { name: 'Bob', email: 'bob@example.com' } };

  function setup(overrides: { level?: 'owner' | 'collaborator' | null; tripMember?: typeof collaborator | null; member?: { id: string } | null } = {}) {
    const tripMemberRepository = makeTripMemberRepository({ findById: vi.fn().mockResolvedValue(overrides.tripMember === undefined ? collaborator : overrides.tripMember) });
    const memberRepository = makeMemberRepository({
      findByTripAndName: vi.fn().mockResolvedValue(overrides.member === undefined ? { id: 'm-bob', name: 'Bob', color: '#fff', tripId: 't1' } : overrides.member),
    });
    const { manager, context } = makeTransactionManager();
    const tripAccessService = makeTripAccess(overrides.level === undefined ? 'owner' : overrides.level);
    const removeCollaborator = createRemoveCollaboratorUseCase({ tripMemberRepository, memberRepository, tripAccessService, transactionManager: manager });
    return { removeCollaborator, memberRepository, context, manager };
  }

  it('only lets the owner remove collaborators', async () => {
    const { removeCollaborator, manager } = setup({ level: 'collaborator' });
    expect(await removeCollaborator('t1', 'tm-1', 'u1')).toEqual({ type: 'error', reason: 'forbidden' });
    expect(manager.transaction).not.toHaveBeenCalled();
  });

  it('returns not_found for an unknown trip member', async () => {
    const { removeCollaborator } = setup({ tripMember: null });
    expect(await removeCollaborator('t1', 'tm-x', 'u1')).toEqual({ type: 'error', reason: 'not_found' });
  });

  it('removes the collaborator and their same-named member', async () => {
    const { removeCollaborator, memberRepository, context } = setup();

    expect(await removeCollaborator('t1', 'tm-1', 'u1')).toEqual({ type: 'success' });
    expect(memberRepository.findByTripAndName).toHaveBeenCalledWith('t1', 'Bob');
    expect(context.tripMemberRepository.delete).toHaveBeenCalledWith('tm-1');
    expect(context.memberRepository.delete).toHaveBeenCalledWith('m-bob');
  });

  it('still removes the collaborator when no matching member exists', async () => {
    const { removeCollaborator, context } = setup({ member: null });

    expect(await removeCollaborator('t1', 'tm-1', 'u1')).toEqual({ type: 'success' });
    expect(context.tripMemberRepository.delete).toHaveBeenCalledWith('tm-1');
    expect(context.memberRepository.delete).not.toHaveBeenCalled();
  });

  // Known bug, reproduced against both the Fastify API and this port: an owner
  // of trip A can remove a collaborator of trip B by passing A's id in the URL,
  // because the trip member's tripId is never compared. `it.fails` keeps this
  // visible; it will start failing (prompting removal of `.fails`) once fixed.
  it.fails('refuses a trip member that belongs to a different trip', async () => {
    const { removeCollaborator, context } = setup({ tripMember: { ...collaborator, tripId: 'other-trip' } });

    expect(await removeCollaborator('t1', 'tm-1', 'u1')).toEqual({ type: 'error', reason: 'not_found' });
    expect(context.tripMemberRepository.delete).not.toHaveBeenCalled();
  });
});
