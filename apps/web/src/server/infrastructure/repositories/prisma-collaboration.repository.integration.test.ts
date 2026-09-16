import { randomUUID } from 'crypto';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createPrismaInvitationRepository } from './prisma-invitation.repository';
import { createPrismaTripMemberRepository } from './prisma-trip-member.repository';
import { createPrismaUserRepository } from './prisma-user.repository';
import { createPrismaTransactionManager } from '../prisma-transaction-manager';
import { createMember, createTestDb, createTrip, createUser, type TestDb } from '../../test/test-db';

let db: TestDb;

beforeAll(async () => {
  db = await createTestDb();
});

afterAll(async () => {
  await db.cleanup();
});

const inOneWeek = () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

describe('PrismaInvitationRepository', () => {
  it('upserts one invitation per trip and email, refreshing token and expiry', async () => {
    const owner = await createUser(db.prisma);
    const trip = await createTrip(db.prisma, owner.id);
    const repo = createPrismaInvitationRepository({ prisma: db.prisma });

    await repo.upsert(trip.id, 'guest@example.com', 'token-1', new Date(Date.now() - 1000));
    const first = await repo.findByTripAndEmail(trip.id, 'guest@example.com');
    await repo.markAccepted(first!.id);
    const newExpiry = inOneWeek();
    await repo.upsert(trip.id, 'guest@example.com', 'token-2', newExpiry);

    const again = await repo.findByTripAndEmail(trip.id, 'guest@example.com');
    expect(again).toEqual({ id: first!.id, expiresAt: newExpiry, status: 'pending' });
    expect(await repo.findByToken('token-1')).toBeNull();
    expect(await repo.findByToken('token-2')).toMatchObject({ id: first!.id, tripId: trip.id, status: 'pending', role: 'collaborator' });
  });

  it('lists only pending, unexpired invitations for an email, with trip and inviter', async () => {
    const owner = await createUser(db.prisma, { name: 'Olivia' });
    const email = `${randomUUID()}@example.com`;
    const repo = createPrismaInvitationRepository({ prisma: db.prisma });
    const live = await createTrip(db.prisma, owner.id, 'Live');
    const expired = await createTrip(db.prisma, owner.id, 'Expired');
    const accepted = await createTrip(db.prisma, owner.id, 'Accepted');
    await repo.upsert(live.id, email, randomUUID(), inOneWeek());
    await repo.upsert(expired.id, email, randomUUID(), new Date(Date.now() - 1000));
    await repo.upsert(accepted.id, email, randomUUID(), inOneWeek());
    await repo.markAccepted((await repo.findByTripAndEmail(accepted.id, email))!.id);

    const pending = await repo.findPendingByEmail(email);

    expect(pending).toHaveLength(1);
    expect(pending[0]).toMatchObject({
      tripId: live.id,
      trip: { name: 'Live', user: { id: owner.id, name: 'Olivia', email: owner.email, image: null } },
    });
  });

  it('finds an invitation by id with the fields needed to accept it', async () => {
    const owner = await createUser(db.prisma);
    const trip = await createTrip(db.prisma, owner.id);
    const repo = createPrismaInvitationRepository({ prisma: db.prisma });
    await repo.upsert(trip.id, 'guest@example.com', randomUUID(), inOneWeek());
    const { id } = (await repo.findByTripAndEmail(trip.id, 'guest@example.com'))!;

    expect(await repo.findById(id)).toMatchObject({ id, tripId: trip.id, email: 'guest@example.com', role: 'collaborator', status: 'pending' });
    expect(await repo.findById(randomUUID())).toBeNull();
  });
});

describe('PrismaTripMemberRepository', () => {
  it('creates collaborators and looks them up by trip, user, and id', async () => {
    const owner = await createUser(db.prisma);
    const collaborator = await createUser(db.prisma, { name: null, email: `${randomUUID()}@example.com` });
    const tripA = await createTrip(db.prisma, owner.id);
    const tripB = await createTrip(db.prisma, owner.id);
    const repo = createPrismaTripMemberRepository({ prisma: db.prisma });

    const { id } = await repo.create({ tripId: tripA.id, userId: collaborator.id, role: 'collaborator' });
    await repo.create({ tripId: tripB.id, userId: collaborator.id, role: 'collaborator' });

    expect((await repo.findIdsByUserId(collaborator.id)).sort()).toEqual([tripA.id, tripB.id].sort());
    expect(await repo.findByTripAndUser(tripA.id, collaborator.id)).toEqual({ id });
    expect(await repo.findByTripAndUser(tripA.id, owner.id)).toBeNull();
    expect(await repo.findById(id)).toEqual({
      id,
      userId: collaborator.id,
      tripId: tripA.id,
      role: 'collaborator',
      user: { name: null, email: collaborator.email },
    });

    await repo.delete(id);
    expect(await repo.findById(id)).toBeNull();
  });

  it('rejects adding the same user to a trip twice', async () => {
    const owner = await createUser(db.prisma);
    const collaborator = await createUser(db.prisma);
    const trip = await createTrip(db.prisma, owner.id);
    const repo = createPrismaTripMemberRepository({ prisma: db.prisma });

    await repo.create({ tripId: trip.id, userId: collaborator.id, role: 'collaborator' });
    await expect(repo.create({ tripId: trip.id, userId: collaborator.id, role: 'collaborator' })).rejects.toThrow();
  });
});

describe('PrismaUserRepository', () => {
  it('finds users by id and email and updates them', async () => {
    const user = await createUser(db.prisma, { name: 'Alice' });
    const repo = createPrismaUserRepository({ prisma: db.prisma });

    expect(await repo.findById(user.id)).toEqual({ id: user.id, name: 'Alice', email: user.email, image: null });
    expect(await repo.findByEmail(user.email)).toEqual({ id: user.id, name: 'Alice', email: user.email, image: null });
    expect(await repo.findByEmail('nobody@example.com')).toBeNull();

    const newEmail = `${randomUUID()}@example.com`;
    await repo.update(user.id, { name: 'Alicia', email: newEmail });
    expect(await repo.findById(user.id)).toMatchObject({ name: 'Alicia', email: newEmail });
  });
});

describe('PrismaTransactionManager', () => {
  it('commits all repository writes made inside the transaction', async () => {
    const owner = await createUser(db.prisma);
    const guest = await createUser(db.prisma);
    const trip = await createTrip(db.prisma, owner.id);
    await createPrismaInvitationRepository({ prisma: db.prisma }).upsert(trip.id, guest.email, randomUUID(), inOneWeek());
    const invitation = await createPrismaInvitationRepository({ prisma: db.prisma }).findByTripAndEmail(trip.id, guest.email);
    const memberId = randomUUID();

    await createPrismaTransactionManager({ prisma: db.prisma }).transaction(async ({ invitationRepository, tripMemberRepository, memberRepository }) => {
      await invitationRepository.markAccepted(invitation!.id);
      await tripMemberRepository.create({ tripId: trip.id, userId: guest.id, role: 'collaborator' });
      await memberRepository.create({ id: memberId, name: 'Guest', color: '#EF4444', tripId: trip.id });
    });

    expect((await db.prisma.tripInvitation.findUniqueOrThrow({ where: { id: invitation!.id } })).status).toBe('accepted');
    expect(await db.prisma.tripMember.count({ where: { tripId: trip.id, userId: guest.id } })).toBe(1);
    expect(await db.prisma.member.findUnique({ where: { id: memberId } })).not.toBeNull();
  });

  it('rolls back every write when a later step fails', async () => {
    const owner = await createUser(db.prisma);
    const guest = await createUser(db.prisma);
    const trip = await createTrip(db.prisma, owner.id);
    const existing = await createMember(db.prisma, trip.id, 'Existing');

    await expect(
      createPrismaTransactionManager({ prisma: db.prisma }).transaction(async ({ tripMemberRepository, memberRepository }) => {
        await tripMemberRepository.create({ tripId: trip.id, userId: guest.id, role: 'collaborator' });
        await memberRepository.create({ id: existing.id, name: 'Duplicate id', color: '#EF4444', tripId: trip.id });
      })
    ).rejects.toThrow();

    expect(await db.prisma.tripMember.count({ where: { tripId: trip.id, userId: guest.id } })).toBe(0);
  });
});
