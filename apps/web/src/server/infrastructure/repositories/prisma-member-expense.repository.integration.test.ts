import { randomUUID } from 'crypto';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createPrismaMemberRepository } from './prisma-member.repository';
import { createPrismaExpenseRepository } from './prisma-expense.repository';
import { createMember, createTestDb, createTrip, createUser, type TestDb } from '../../test/test-db';

let db: TestDb;

beforeAll(async () => {
  db = await createTestDb();
});

afterAll(async () => {
  await db.cleanup();
});

async function tripWithMembers(...names: string[]) {
  const owner = await createUser(db.prisma);
  const trip = await createTrip(db.prisma, owner.id);
  const members = [];
  for (const name of names) members.push(await createMember(db.prisma, trip.id, name));
  return { trip, members };
}

describe('PrismaMemberRepository', () => {
  it('creates, finds, renames, and deletes a member', async () => {
    const { trip } = await tripWithMembers();
    const repo = createPrismaMemberRepository({ prisma: db.prisma });
    const id = randomUUID();

    expect(await repo.create({ id, name: 'Alice', color: '#EF4444', tripId: trip.id })).toEqual({ id, name: 'Alice', color: '#EF4444', tripId: trip.id });
    expect(await repo.findById(id)).toMatchObject({ name: 'Alice' });
    expect(await repo.update(id, { name: 'Alicia' })).toMatchObject({ id, name: 'Alicia' });

    await repo.delete(id);
    expect(await repo.findById(id)).toBeNull();
  });

  it('finds a member by exact name within a trip only', async () => {
    const { trip, members } = await tripWithMembers('Alice');
    const { trip: otherTrip } = await tripWithMembers('Alice');
    const repo = createPrismaMemberRepository({ prisma: db.prisma });

    expect((await repo.findByTripAndName(trip.id, 'Alice'))?.id).toBe(members[0]!.id);
    expect((await repo.findByTripAndName(otherTrip.id, 'Alice'))?.id).not.toBe(members[0]!.id);
    expect(await repo.findByTripAndName(trip.id, 'Nobody')).toBeNull();
  });

  it('returns lower-cased member names for a trip', async () => {
    const { trip } = await tripWithMembers('Alice', 'BOB');
    expect(await createPrismaMemberRepository({ prisma: db.prisma }).findNamesByTripId(trip.id)).toEqual(new Set(['alice', 'bob']));
  });

  it('counts expenses a member paid for or is split into, without double counting', async () => {
    const { trip, members } = await tripWithMembers('Alice', 'Bob', 'Carl');
    const [alice, bob, carl] = members as [typeof members[0], typeof members[0], typeof members[0]];
    const expenses = createPrismaExpenseRepository({ prisma: db.prisma });
    await expenses.create({ id: randomUUID(), description: 'paid and split', amount: 10, currency: 'USD', tripId: trip.id, paidById: alice.id, splitAmong: [alice.id, bob.id] });
    await expenses.create({ id: randomUUID(), description: 'split only', amount: 10, currency: 'USD', tripId: trip.id, paidById: bob.id, splitAmong: [alice.id] });
    const repo = createPrismaMemberRepository({ prisma: db.prisma });

    expect(await repo.countExpenses(trip.id, alice.id)).toBe(2);
    expect(await repo.countExpenses(trip.id, bob.id)).toBe(2);
    expect(await repo.countExpenses(trip.id, carl.id)).toBe(0);
  });
});

describe('PrismaExpenseRepository', () => {
  it('creates an expense with its splits and default date', async () => {
    const { trip, members } = await tripWithMembers('Alice', 'Bob');
    const repo = createPrismaExpenseRepository({ prisma: db.prisma });
    const id = randomUUID();
    const before = Date.now();

    await repo.create({ id, description: 'Dinner', amount: 42.5, currency: 'USD', tripId: trip.id, paidById: members[0]!.id, splitAmong: members.map((m) => m.id) });

    expect(await repo.findById(id)).toEqual({ id, tripId: trip.id });
    const stored = await db.prisma.expense.findUniqueOrThrow({ where: { id }, include: { splits: true } });
    expect(stored).toMatchObject({ description: 'Dinner', amount: 42.5, paidById: members[0]!.id });
    expect(stored.splits.map((s) => s.memberId).sort()).toEqual(members.map((m) => m.id).sort());
    expect(stored.date.getTime()).toBeGreaterThanOrEqual(before - 1000);
  });

  it('replaces the splits on update', async () => {
    const { trip, members } = await tripWithMembers('Alice', 'Bob', 'Carl');
    const [alice, bob, carl] = members as [typeof members[0], typeof members[0], typeof members[0]];
    const repo = createPrismaExpenseRepository({ prisma: db.prisma });
    const id = randomUUID();
    await repo.create({ id, description: 'Dinner', amount: 10, currency: 'USD', tripId: trip.id, paidById: alice.id, splitAmong: [alice.id, bob.id] });

    await repo.update(id, { description: 'Lunch', amount: 20, currency: 'EUR', date: new Date('2026-05-01T00:00:00.000Z'), tripId: trip.id, paidById: carl.id, splitAmong: [carl.id] });

    const stored = await db.prisma.expense.findUniqueOrThrow({ where: { id }, include: { splits: true } });
    expect(stored).toMatchObject({ description: 'Lunch', amount: 20, currency: 'EUR', paidById: carl.id, date: new Date('2026-05-01T00:00:00.000Z') });
    expect(stored.splits.map((s) => s.memberId)).toEqual([carl.id]);
  });

  it('deletes an expense and its splits', async () => {
    const { trip, members } = await tripWithMembers('Alice');
    const repo = createPrismaExpenseRepository({ prisma: db.prisma });
    const id = randomUUID();
    await repo.create({ id, description: 'x', amount: 1, currency: 'USD', tripId: trip.id, paidById: members[0]!.id, splitAmong: [members[0]!.id] });

    await repo.delete(id);

    expect(await repo.findById(id)).toBeNull();
    expect(await db.prisma.expenseSplit.count({ where: { expenseId: id } })).toBe(0);
  });

  it('cascades expense removal when the paying member is deleted', async () => {
    const { trip, members } = await tripWithMembers('Alice');
    const repo = createPrismaExpenseRepository({ prisma: db.prisma });
    const id = randomUUID();
    await repo.create({ id, description: 'x', amount: 1, currency: 'USD', tripId: trip.id, paidById: members[0]!.id, splitAmong: [members[0]!.id] });

    await createPrismaMemberRepository({ prisma: db.prisma }).delete(members[0]!.id);

    expect(await repo.findById(id)).toBeNull();
  });
});
