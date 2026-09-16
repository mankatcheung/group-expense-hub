import { describe, it, expect, vi } from 'vitest';
import { createCreateMemberUseCase } from './create-member.use-case';
import { createUpdateMemberUseCase } from './update-member.use-case';
import { createDeleteMemberUseCase } from './delete-member.use-case';
import { makeMemberRepository, makeTripAccess } from '../../../test/mocks';

const alice = { id: 'm1', name: 'Alice', color: '#EF4444', tripId: 't1' };

describe('createMember', () => {
  it('returns forbidden without writing when the user cannot edit the trip', async () => {
    const memberRepository = makeMemberRepository();
    const result = await createCreateMemberUseCase({ memberRepository, tripAccessService: makeTripAccess(null) })('t1', { id: 'm1', name: 'Alice', color: '#EF4444' }, 'u1');

    expect(result).toEqual({ type: 'error', reason: 'forbidden' });
    expect(memberRepository.create).not.toHaveBeenCalled();
  });

  it('creates the member in the trip', async () => {
    const memberRepository = makeMemberRepository({ create: vi.fn().mockResolvedValue(alice) });
    const result = await createCreateMemberUseCase({ memberRepository, tripAccessService: makeTripAccess('collaborator') })('t1', { id: 'm1', name: 'Alice', color: '#EF4444' }, 'u1');

    expect(result).toEqual({ type: 'success', member: alice });
    expect(memberRepository.create).toHaveBeenCalledWith(alice);
  });
});

describe('updateMember', () => {
  const setup = (level: 'owner' | 'collaborator' | null, existing: typeof alice | null) => {
    const memberRepository = makeMemberRepository({
      findById: vi.fn().mockResolvedValue(existing),
      update: vi.fn().mockResolvedValue({ ...alice, name: 'Alicia' }),
    });
    return { updateMember: createUpdateMemberUseCase({ memberRepository, tripAccessService: makeTripAccess(level) }), memberRepository };
  };

  it('returns forbidden when the user cannot edit the trip', async () => {
    const { updateMember, memberRepository } = setup(null, alice);
    expect(await updateMember('t1', 'm1', 'Alicia', 'u1')).toEqual({ type: 'error', reason: 'forbidden' });
    expect(memberRepository.update).not.toHaveBeenCalled();
  });

  it.each([
    ['missing', null],
    ['in another trip', { ...alice, tripId: 'other-trip' }],
  ])('returns not_found for a member %s', async (_label, existing) => {
    const { updateMember, memberRepository } = setup('owner', existing);
    expect(await updateMember('t1', 'm1', 'Alicia', 'u1')).toEqual({ type: 'error', reason: 'not_found' });
    expect(memberRepository.update).not.toHaveBeenCalled();
  });

  it('renames the member', async () => {
    const { updateMember, memberRepository } = setup('owner', alice);
    expect(await updateMember('t1', 'm1', 'Alicia', 'u1')).toEqual({ type: 'success', member: { ...alice, name: 'Alicia' } });
    expect(memberRepository.update).toHaveBeenCalledWith('m1', { name: 'Alicia' });
  });
});

describe('deleteMember', () => {
  const setup = (level: 'owner' | 'collaborator' | null, existing: typeof alice | null, expenseCount = 0) => {
    const memberRepository = makeMemberRepository({
      findById: vi.fn().mockResolvedValue(existing),
      countExpenses: vi.fn().mockResolvedValue(expenseCount),
    });
    return { deleteMember: createDeleteMemberUseCase({ memberRepository, tripAccessService: makeTripAccess(level) }), memberRepository };
  };

  it('returns forbidden when the user cannot edit the trip', async () => {
    const { deleteMember, memberRepository } = setup(null, alice);
    expect(await deleteMember('t1', 'm1', 'u1')).toEqual({ type: 'error', reason: 'forbidden' });
    expect(memberRepository.delete).not.toHaveBeenCalled();
  });

  it.each([
    ['missing', null],
    ['in another trip', { ...alice, tripId: 'other-trip' }],
  ])('returns not_found for a member %s', async (_label, existing) => {
    const { deleteMember, memberRepository } = setup('owner', existing);
    expect(await deleteMember('t1', 'm1', 'u1')).toEqual({ type: 'error', reason: 'not_found' });
    expect(memberRepository.delete).not.toHaveBeenCalled();
  });

  it('refuses to delete a member involved in expenses, reporting how many', async () => {
    const { deleteMember, memberRepository } = setup('collaborator', alice, 3);

    expect(await deleteMember('t1', 'm1', 'u1')).toEqual({ type: 'has_expenses', expenseCount: 3, memberName: 'Alice' });
    expect(memberRepository.countExpenses).toHaveBeenCalledWith('t1', 'm1');
    expect(memberRepository.delete).not.toHaveBeenCalled();
  });

  it('deletes a member with no expenses', async () => {
    const { deleteMember, memberRepository } = setup('owner', alice, 0);
    expect(await deleteMember('t1', 'm1', 'u1')).toEqual({ type: 'success' });
    expect(memberRepository.delete).toHaveBeenCalledWith('m1');
  });
});
