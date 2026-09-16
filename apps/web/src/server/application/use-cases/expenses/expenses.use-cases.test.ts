import { describe, it, expect, vi } from 'vitest';
import { createCreateExpenseUseCase } from './create-expense.use-case';
import { createUpdateExpenseUseCase } from './update-expense.use-case';
import { createDeleteExpenseUseCase } from './delete-expense.use-case';
import { makeExpenseRepository, makeTripAccess } from '../../../test/mocks';

const input = {
  description: 'Dinner',
  amount: 42.5,
  currency: 'USD',
  paidBy: 'm1',
  splitAmong: ['m1', 'm2'],
};

describe('createExpense', () => {
  it('returns forbidden without writing when the user cannot edit the trip', async () => {
    const expenseRepository = makeExpenseRepository();
    const result = await createCreateExpenseUseCase({ expenseRepository, tripAccessService: makeTripAccess(null) })('t1', { id: 'e1', ...input }, 'u1');

    expect(result).toEqual({ type: 'error', reason: 'forbidden' });
    expect(expenseRepository.create).not.toHaveBeenCalled();
  });

  it('creates the expense, mapping paidBy and parsing the date', async () => {
    const expenseRepository = makeExpenseRepository();
    const result = await createCreateExpenseUseCase({ expenseRepository, tripAccessService: makeTripAccess('collaborator') })(
      't1',
      { id: 'e1', ...input, date: '2026-03-01T00:00:00.000Z' },
      'u1'
    );

    expect(result).toEqual({ type: 'success' });
    expect(expenseRepository.create).toHaveBeenCalledWith({
      id: 'e1',
      description: 'Dinner',
      amount: 42.5,
      currency: 'USD',
      date: new Date('2026-03-01T00:00:00.000Z'),
      tripId: 't1',
      paidById: 'm1',
      splitAmong: ['m1', 'm2'],
    });
  });

  it('leaves the date to the database default when omitted', async () => {
    const expenseRepository = makeExpenseRepository();
    await createCreateExpenseUseCase({ expenseRepository, tripAccessService: makeTripAccess('owner') })('t1', { id: 'e1', ...input }, 'u1');
    expect(expenseRepository.create).toHaveBeenCalledWith(expect.objectContaining({ date: undefined }));
  });
});

describe('updateExpense', () => {
  const setup = (level: 'owner' | 'collaborator' | null, existing: { id: string; tripId: string } | null) => {
    const expenseRepository = makeExpenseRepository({ findById: vi.fn().mockResolvedValue(existing) });
    const updateExpense = createUpdateExpenseUseCase({ expenseRepository, tripAccessService: makeTripAccess(level) });
    return { updateExpense, expenseRepository };
  };

  it('returns forbidden before looking up the expense', async () => {
    const { updateExpense, expenseRepository } = setup(null, { id: 'e1', tripId: 't1' });
    expect(await updateExpense('t1', 'e1', input, 'u1')).toEqual({ type: 'error', reason: 'forbidden' });
    expect(expenseRepository.findById).not.toHaveBeenCalled();
  });

  it('returns not_found for a missing expense', async () => {
    const { updateExpense } = setup('owner', null);
    expect(await updateExpense('t1', 'e1', input, 'u1')).toEqual({ type: 'error', reason: 'not_found' });
  });

  it('returns not_found for an expense that belongs to another trip', async () => {
    const { updateExpense, expenseRepository } = setup('owner', { id: 'e1', tripId: 'other-trip' });
    expect(await updateExpense('t1', 'e1', input, 'u1')).toEqual({ type: 'error', reason: 'not_found' });
    expect(expenseRepository.update).not.toHaveBeenCalled();
  });

  it('updates the expense', async () => {
    const { updateExpense, expenseRepository } = setup('collaborator', { id: 'e1', tripId: 't1' });

    expect(await updateExpense('t1', 'e1', { ...input, date: '2026-04-01T00:00:00.000Z' }, 'u1')).toEqual({ type: 'success' });
    expect(expenseRepository.update).toHaveBeenCalledWith('e1', {
      description: 'Dinner',
      amount: 42.5,
      currency: 'USD',
      date: new Date('2026-04-01T00:00:00.000Z'),
      tripId: 't1',
      paidById: 'm1',
      splitAmong: ['m1', 'm2'],
    });
  });
});

describe('deleteExpense', () => {
  const setup = (level: 'owner' | 'collaborator' | null, existing: { id: string; tripId: string } | null) => {
    const expenseRepository = makeExpenseRepository({ findById: vi.fn().mockResolvedValue(existing) });
    const deleteExpense = createDeleteExpenseUseCase({ expenseRepository, tripAccessService: makeTripAccess(level) });
    return { deleteExpense, expenseRepository };
  };

  it('returns forbidden when the user cannot edit the trip', async () => {
    const { deleteExpense, expenseRepository } = setup(null, { id: 'e1', tripId: 't1' });
    expect(await deleteExpense('t1', 'e1', 'u1')).toEqual({ type: 'error', reason: 'forbidden' });
    expect(expenseRepository.delete).not.toHaveBeenCalled();
  });

  it.each([
    ['missing', null],
    ['in another trip', { id: 'e1', tripId: 'other-trip' }],
  ])('returns not_found for an expense %s', async (_label, existing) => {
    const { deleteExpense, expenseRepository } = setup('owner', existing);
    expect(await deleteExpense('t1', 'e1', 'u1')).toEqual({ type: 'error', reason: 'not_found' });
    expect(expenseRepository.delete).not.toHaveBeenCalled();
  });

  it('deletes the expense', async () => {
    const { deleteExpense, expenseRepository } = setup('collaborator', { id: 'e1', tripId: 't1' });
    expect(await deleteExpense('t1', 'e1', 'u1')).toEqual({ type: 'success' });
    expect(expenseRepository.delete).toHaveBeenCalledWith('e1');
  });
});
