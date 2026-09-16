import { describe, it, expect } from 'vitest';
import { formatTrip, formatTripSummary } from './trip.formatter';
import type { TripFull, TripSummaryRow } from '../../application/ports/repositories/trip.repository';

const owner = { id: 'u1', name: 'Alice', email: 'alice@example.com', image: null };
const createdAt = new Date('2026-01-01T00:00:00.000Z');

describe('formatTripSummary', () => {
  const row = {
    id: 't1',
    name: 'Bali',
    createdAt,
    userId: 'u1',
    user: owner,
    members: [{ id: 'm1' }, { id: 'm2' }],
    expenses: [
      { amount: 10, currency: 'USD' },
      { amount: 5.5, currency: 'USD' },
      { amount: 1000, currency: 'JPY' },
    ],
  } as TripSummaryRow;

  it('summarizes counts and totals per currency', () => {
    expect(formatTripSummary(row, 'u1')).toEqual({
      id: 't1',
      name: 'Bali',
      createdAt: '2026-01-01T00:00:00.000Z',
      isOwner: true,
      owner,
      memberCount: 2,
      expenseCount: 3,
      totalsByCurrency: { USD: 15.5, JPY: 1000 },
    });
  });

  it('marks trips owned by someone else and handles a missing owner', () => {
    const summary = formatTripSummary({ ...row, user: null, userId: null } as TripSummaryRow, 'u2');
    expect(summary.isOwner).toBe(false);
    expect(summary.owner).toBeNull();
  });
});

describe('formatTrip', () => {
  it('flattens members, collaborators, and expenses into the client shape', () => {
    const trip = {
      id: 't1',
      name: 'Bali',
      createdAt,
      userId: 'u1',
      user: owner,
      members: [{ id: 'm1', name: 'Alice', color: '#EF4444', tripId: 't1' }],
      tripMembers: [
        {
          id: 'tm1',
          tripId: 't1',
          userId: 'u2',
          role: 'collaborator',
          createdAt,
          user: { id: 'u2', name: 'Bob', email: 'bob@example.com', image: null, emailVerified: false, createdAt, updatedAt: createdAt },
        },
      ],
      expenses: [
        {
          id: 'e1',
          description: 'Dinner',
          amount: 42.5,
          currency: 'USD',
          date: createdAt,
          tripId: 't1',
          paidById: 'm1',
          splits: [{ id: 's1', expenseId: 'e1', memberId: 'm1' }],
        },
      ],
    } as unknown as TripFull;

    expect(formatTrip(trip, 'u2')).toEqual({
      id: 't1',
      name: 'Bali',
      createdAt: '2026-01-01T00:00:00.000Z',
      isOwner: false,
      owner,
      members: [{ id: 'm1', name: 'Alice', color: '#EF4444' }],
      tripMembers: [{ id: 'tm1', userId: 'u2', role: 'collaborator', user: { id: 'u2', name: 'Bob', email: 'bob@example.com', image: null } }],
      expenses: [
        { id: 'e1', description: 'Dinner', amount: 42.5, currency: 'USD', date: '2026-01-01T00:00:00.000Z', paidBy: 'm1', splitAmong: ['m1'] },
      ],
    });
  });
});
