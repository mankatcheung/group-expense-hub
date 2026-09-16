import { randomUUID } from 'crypto';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createPrismaTripRepository } from './prisma-trip.repository';
import { createCachingTripRepository } from './caching-trip.repository';
import { createPrismaTripMemberRepository } from './prisma-trip-member.repository';
import { createInMemoryCache } from '../in-memory-cache';
import { createGetTripsUseCase } from '../../application/use-cases/trips/get-trips.use-case';
import { createCreateTripUseCase } from '../../application/use-cases/trips/create-trip.use-case';
import { createDeleteTripUseCase } from '../../application/use-cases/trips/delete-trip.use-case';
import { createTestDb, createUser, type TestDb } from '../../test/test-db';

// On Vercel, requests for the same user can land on different function
// instances, each with its own in-memory cache. These tests model two
// instances sharing one database.

let db: TestDb;

beforeAll(async () => {
  db = await createTestDb();
});

afterAll(async () => {
  await db.cleanup();
});

function instance() {
  const tripRepository = createCachingTripRepository({
    repository: createPrismaTripRepository({ prisma: db.prisma }),
    cache: createInMemoryCache(),
  });
  const tripMemberRepository = createPrismaTripMemberRepository({ prisma: db.prisma });
  return {
    getTrips: createGetTripsUseCase({ tripRepository, tripMemberRepository }),
    createTrip: createCreateTripUseCase({ tripRepository }),
    deleteTrip: createDeleteTripUseCase({ tripRepository }),
  };
}

describe('trip list consistency across instances', () => {
  it('lists a trip created through a different instance', async () => {
    const user = await createUser(db.prisma);
    const a = instance();
    const b = instance();
    expect(await b.getTrips(user.id)).toEqual([]);

    const trip = await a.createTrip({ id: randomUUID(), name: 'Created on A' }, user.id);

    expect((await b.getTrips(user.id)).map((t) => t.id)).toEqual([trip.id]);
  });

  it('stops listing a trip deleted through a different instance', async () => {
    const user = await createUser(db.prisma);
    const a = instance();
    const b = instance();
    const trip = await a.createTrip({ id: randomUUID(), name: 'Doomed' }, user.id);
    expect((await b.getTrips(user.id)).map((t) => t.id)).toEqual([trip.id]);

    await a.deleteTrip(trip.id, user.id);

    expect(await b.getTrips(user.id)).toEqual([]);
  });

  it('lists a trip the user was added to as a collaborator after their list was loaded', async () => {
    const owner = await createUser(db.prisma);
    const collaborator = await createUser(db.prisma);
    const a = instance();
    const ownTrip = await a.createTrip({ id: randomUUID(), name: 'Own' }, collaborator.id);
    const shared = await a.createTrip({ id: randomUUID(), name: 'Shared' }, owner.id);
    expect((await a.getTrips(collaborator.id)).map((t) => t.id)).toEqual([ownTrip.id]);

    await db.prisma.tripMember.create({ data: { tripId: shared.id, userId: collaborator.id } });

    expect((await a.getTrips(collaborator.id)).map((t) => t.id).sort()).toEqual([ownTrip.id, shared.id].sort());
  });

  it('reflects expense totals added after the list was loaded', async () => {
    const user = await createUser(db.prisma);
    const a = instance();
    const trip = await a.createTrip({ id: randomUUID(), name: 'Totals' }, user.id);
    expect((await a.getTrips(user.id))[0]!.expenses).toEqual([]);

    const member = await db.prisma.member.create({ data: { id: randomUUID(), name: 'M', color: '#EF4444', tripId: trip.id } });
    await db.prisma.expense.create({ data: { id: randomUUID(), description: 'x', amount: 25, currency: 'USD', tripId: trip.id, paidById: member.id } });

    expect((await a.getTrips(user.id))[0]!.expenses).toEqual([{ amount: 25, currency: 'USD' }]);
  });
});
