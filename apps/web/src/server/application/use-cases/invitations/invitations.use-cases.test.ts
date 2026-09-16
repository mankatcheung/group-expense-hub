import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createGetInvitationsUseCase } from './get-invitations.use-case';
import { createAcceptInvitationUseCase } from './accept-invitation.use-case';
import { makeInvitationRepository, makeTransactionManager, makeTripMemberRepository } from '../../../test/mocks';

const NOW = new Date('2026-09-01T12:00:00.000Z');
const user = { id: 'u2', name: 'Bob', email: 'bob@example.com', image: null };
const pending = { id: 'inv-1', tripId: 't1', email: 'bob@example.com', role: 'collaborator', status: 'pending', expiresAt: new Date('2026-09-08T12:00:00.000Z') };

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('getInvitations', () => {
  it('returns the pending invitations for the email', async () => {
    const rows = [{ id: 'inv-1' }];
    const invitationRepository = makeInvitationRepository({ findPendingByEmail: vi.fn().mockResolvedValue(rows) });

    expect(await createGetInvitationsUseCase({ invitationRepository })('bob@example.com')).toBe(rows);
    expect(invitationRepository.findPendingByEmail).toHaveBeenCalledWith('bob@example.com');
  });
});

describe('acceptInvitation', () => {
  function setup(invitation: typeof pending | null = pending, existingMember: { id: string } | null = null) {
    const invitationRepository = makeInvitationRepository({ findById: vi.fn().mockResolvedValue(invitation) });
    const tripMemberRepository = makeTripMemberRepository({ findByTripAndUser: vi.fn().mockResolvedValue(existingMember) });
    const { manager, context } = makeTransactionManager();
    const acceptInvitation = createAcceptInvitationUseCase({ invitationRepository, tripMemberRepository, transactionManager: manager });
    return { acceptInvitation, manager, context, tripMemberRepository };
  }

  it.each([
    ['not_found', null, null],
    ['wrong_user', { ...pending, email: 'someone-else@example.com' }, null],
    ['expired', { ...pending, expiresAt: new Date('2026-08-01T00:00:00.000Z') }, null],
    ['already_used', { ...pending, status: 'accepted' }, null],
    ['already_member', pending, { id: 'tm-1' }],
  ] as const)('returns %s', async (reason, invitation, existingMember) => {
    const { acceptInvitation, manager } = setup(invitation, existingMember);
    expect(await acceptInvitation('inv-1', user)).toEqual({ type: 'error', reason });
    expect(manager.transaction).not.toHaveBeenCalled();
  });

  it('checks the recipient before revealing whether the invitation expired', async () => {
    const { acceptInvitation } = setup({ ...pending, email: 'someone-else@example.com', expiresAt: new Date('2026-08-01') });
    expect(await acceptInvitation('inv-1', user)).toEqual({ type: 'error', reason: 'wrong_user' });
  });

  it('marks the invitation accepted and adds the user as collaborator and member together', async () => {
    const { acceptInvitation, context, tripMemberRepository } = setup();

    expect(await acceptInvitation('inv-1', user)).toEqual({ type: 'success', tripId: 't1' });
    expect(tripMemberRepository.findByTripAndUser).toHaveBeenCalledWith('t1', 'u2');
    expect(context.invitationRepository.markAccepted).toHaveBeenCalledWith('inv-1');
    expect(context.tripMemberRepository.create).toHaveBeenCalledWith({ tripId: 't1', userId: 'u2', role: 'collaborator' });
    expect(context.memberRepository.create).toHaveBeenCalledWith({
      id: expect.any(String),
      name: 'Bob',
      color: expect.stringMatching(/^#[0-9A-F]{6}$/i),
      tripId: 't1',
    });
  });

  it("uses the email's local part as the member name when the user has no name", async () => {
    const { acceptInvitation, context } = setup();
    await acceptInvitation('inv-1', { ...user, name: null });
    expect(context.memberRepository.create).toHaveBeenCalledWith(expect.objectContaining({ name: 'bob' }));
  });
});
