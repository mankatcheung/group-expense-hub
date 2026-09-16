import { randomUUID } from 'crypto';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Prisma } from '@prisma/client';
import { createPrismaTripRepository } from './prisma-trip.repository';
import { createPrismaTripAccessService } from '../services/prisma-trip-access.service';
import { createMember, createTestDb, createTrip, createUser, type TestDb } from '../../test/test-db';

let db: TestDb;

beforeAll(async () => {
  db = await createTestDb();
});

afterAll(async () => {
  await db.cleanup();
});

describe('PrismaTripRepository', () => {
  it('creates a trip and returns its id, name, and createdAt', async () => {
    const owner = await createUser(db.prisma);
    const repo = createPrismaTripRepository({ prisma: db.prisma });
    const id = randomUUID();
    const createdAt = new Date('2026-02-01T00:00:00.000Z');

    const trip = await repo.create({ id, name: 'Bali', userId: owner.id, createdAt });

    expect(trip).toMatchObject({ id, name: 'Bali', createdAt });
  });

  it('lists owned trip summaries newest first, with members and expense amounts', async () => {
    const owner = await createUser(db.prisma);
    const repo = createPrismaTripRepository({ prisma: db.prisma });
    const older = await repo.create({ id: randomUUID(), name: 'Older', userId: owner.id, createdAt: new Date('2026-01-01') });
    const newer = await repo.create({ id: randomUUID(), name: 'Newer', userId: owner.id, createdAt: new Date('2026-02-01') });
    const member = await createMember(db.prisma, newer.id);
    await db.prisma.expense.create({ data: { id: randomUUID(), description: 'x', amount: 12.5, currency: 'EUR', tripId: newer.id, paidById: member.id } });

    const summaries = await repo.findSummariesOwnedByUser(owner.id);

    expect(summaries.map((t) => t.id)).toEqual([newer.id, older.id]);
    expect(summaries[0]).toMatchObject({
      name: 'Newer',
      userId: owner.id,
      user: { id: owner.id, email: owner.email },
      members: [{ id: member.id }],
      expenses: [{ amount: 12.5, currency: 'EUR' }],
    });
  });

  it('finds summaries by id and returns nothing for an empty id list', async () => {
    const owner = await createUser(db.prisma);
    const repo = createPrismaTripRepository({ prisma: db.prisma });
    const a = await createTrip(db.prisma, owner.id, 'A');
    await createTrip(db.prisma, owner.id, 'B');

    expect((await repo.findSummariesByIds([a.id])).map((t) => t.name)).toEqual(['A']);
    expect(await repo.findSummariesByIds([])).toEqual([]);
  });

  it('loads a full trip with members, expense splits, collaborators, and owner', async () => {
    const owner = await createUser(db.prisma, { name: 'Olivia' });
    const collaborator = await createUser(db.prisma, { name: 'Bob' });
    const trip = await createTrip(db.prisma, owner.id);
    const alice = await createMember(db.prisma, trip.id, 'Alice');
    await db.prisma.tripMember.create({ data: { tripId: trip.id, userId: collaborator.id } });
    await db.prisma.expense.create({
      data: { id: randomUUID(), description: 'Dinner', amount: 30, currency: 'USD', tripId: trip.id, paidById: alice.id, splits: { create: [{ memberId: alice.id }] } },
    });

    const full = await createPrismaTripRepository({ prisma: db.prisma }).findByIdFull(trip.id);

    expect(full?.user).toEqual({ id: owner.id, name: 'Olivia', email: owner.email, image: null });
    expect(full?.members.map((m) => m.name)).toEqual(['Alice']);
    expect(full?.tripMembers[0]).toMatchObject({ userId: collaborator.id, role: 'collaborator', user: { name: 'Bob' } });
    expect(full?.expenses[0]).toMatchObject({ description: 'Dinner', paidById: alice.id, splits: [{ memberId: alice.id }] });
  });

  it('returns null for a missing trip', async () => {
    const repo = createPrismaTripRepository({ prisma: db.prisma });
    expect(await repo.findByIdFull(randomUUID())).toBeNull();
    expect(await repo.findNameAndOwner(randomUUID())).toBeNull();
  });

  it('finds the trip name and owner', async () => {
    const owner = await createUser(db.prisma, { name: 'Olivia' });
    const trip = await createTrip(db.prisma, owner.id, 'Tokyo');

    expect(await createPrismaTripRepository({ prisma: db.prisma }).findNameAndOwner(trip.id)).toEqual({
      name: 'Tokyo',
      user: { name: 'Olivia', email: owner.email },
    });
  });

  it('renames a trip', async () => {
    const owner = await createUser(db.prisma);
    const trip = await createTrip(db.prisma, owner.id, 'Old');

    const updated = await createPrismaTripRepository({ prisma: db.prisma }).update(trip.id, { name: 'New' });

    expect(updated.name).toBe('New');
  });

  it('deletes an owned trip and cascades to its members and expenses', async () => {
    const owner = await createUser(db.prisma);
    const trip = await createTrip(db.prisma, owner.id);
    const member = await createMember(db.prisma, trip.id);
    await db.prisma.expense.create({ data: { id: randomUUID(), description: 'x', amount: 1, currency: 'USD', tripId: trip.id, paidById: member.id } });

    await createPrismaTripRepository({ prisma: db.prisma }).delete(trip.id, owner.id);

    expect(await db.prisma.trip.findUnique({ where: { id: trip.id } })).toBeNull();
    expect(await db.prisma.member.count({ where: { tripId: trip.id } })).toBe(0);
    expect(await db.prisma.expense.count({ where: { tripId: trip.id } })).toBe(0);
  });

  // Delete is scoped to the owner: a collaborator's DELETE /api/trips/:id
  // leaves the trip intact, but surfaces as a 500 (record not found), not a 403.
  it("does not delete another user's trip", async () => {
    const owner = await createUser(db.prisma);
    const other = await createUser(db.prisma);
    const trip = await createTrip(db.prisma, owner.id);

    await expect(createPrismaTripRepository({ prisma: db.prisma }).delete(trip.id, other.id)).rejects.toBeInstanceOf(
      Prisma.PrismaClientKnownRequestError
    );
    expect(await db.prisma.trip.findUnique({ where: { id: trip.id } })).not.toBeNull();
  });
});

describe('PrismaTripAccessService', () => {
  it('distinguishes owner, collaborator, stranger, and missing trip', async () => {
    const owner = await createUser(db.prisma);
    const collaborator = await createUser(db.prisma);
    const stranger = await createUser(db.prisma);
    const trip = await createTrip(db.prisma, owner.id);
    await db.prisma.tripMember.create({ data: { tripId: trip.id, userId: collaborator.id } });
    const access = createPrismaTripAccessService({ prisma: db.prisma });

    expect(await access.getAccessLevel(trip.id, owner.id)).toBe('owner');
    expect(await access.getAccessLevel(trip.id, collaborator.id)).toBe('collaborator');
    expect(await access.getAccessLevel(trip.id, stranger.id)).toBeNull();
    expect(await access.getAccessLevel(randomUUID(), owner.id)).toBeNull();

    expect(await access.canEdit(trip.id, collaborator.id)).toBe(true);
    expect(await access.isOwner(trip.id, collaborator.id)).toBe(false);
    expect(await access.canEdit(trip.id, stranger.id)).toBe(false);
  });
});
