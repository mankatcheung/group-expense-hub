import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createTestPrisma, TEST_TRIP, TEST_MEMBER } from './test-utils';

describe('Expense Creation Integration Tests', () => {
  let prisma: ReturnType<typeof createTestPrisma>;

  beforeAll(async () => {
    prisma = createTestPrisma();
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await prisma.trip.deleteMany();
    await prisma.member.deleteMany();
    await prisma.expense.deleteMany();
    await prisma.expenseSplit.deleteMany();
  });

  describe('Trip Creation', () => {
    beforeEach(async () => {
      try {
        await prisma.user.create({
          data: {
            id: 'test-user-1',
            name: 'Test User',
            email: 'testtrip@example.com',
            emailVerified: true,
          },
        });
      } catch {
        // user already exists
      }
    });

    it('should create a new trip', async () => {
      const trip = await prisma.trip.create({
        data: {
          id: 'trip-1',
          name: TEST_TRIP.name,
          userId: 'test-user-1',
        },
      });

      expect(trip).toBeDefined();
      expect(trip.id).toBe('trip-1');
      expect(trip.name).toBe(TEST_TRIP.name);
      expect(trip.userId).toBe('test-user-1');
    });

    it('should associate trip with owner', async () => {
      const trip = await prisma.trip.create({
        data: {
          id: 'trip-2',
          name: TEST_TRIP.name,
          userId: 'test-user-1',
        },
        include: {
          user: true,
        },
      });

      expect(trip.user).toBeDefined();
      expect(trip.user?.email).toBe('testtrip@example.com');
    });
  });

  describe('Member Management', () => {
    let tripId: string;

    beforeEach(async () => {
      const trip = await prisma.trip.create({
        data: {
          id: TEST_TRIP.id,
          name: TEST_TRIP.name,
          userId: 'test-user-1',
        },
      });
      tripId = trip.id;
    });

    it('should add a member to a trip', async () => {
      const member = await prisma.member.create({
        data: {
          id: TEST_MEMBER.id,
          name: TEST_MEMBER.name,
          color: TEST_MEMBER.color,
          tripId,
        },
      });

      expect(member).toBeDefined();
      expect(member.id).toBe(TEST_MEMBER.id);
      expect(member.name).toBe(TEST_MEMBER.name);
      expect(member.color).toBe(TEST_MEMBER.color);
      expect(member.tripId).toBe(tripId);
    });

    it('should allow multiple members in a trip', async () => {
      await prisma.member.createMany({
        data: [
          {
            id: 'member-1',
            name: 'Alice',
            color: '#EF4444',
            tripId,
          },
          {
            id: 'member-2',
            name: 'Bob',
            color: '#3B82F6',
            tripId,
          },
          {
            id: 'member-3',
            name: 'Charlie',
            color: '#22C55E',
            tripId,
          },
        ],
      });

      const members = await prisma.member.findMany({
        where: { tripId },
      });

      expect(members).toHaveLength(3);
    });
  });

  describe('Expense Creation', () => {
    let tripId: string;
    let member1Id: string;
    let member2Id: string;

    beforeEach(async () => {
      const trip = await prisma.trip.create({
        data: {
          id: TEST_TRIP.id,
          name: TEST_TRIP.name,
          userId: 'test-user-1',
        },
      });
      tripId = trip.id;

      const m1 = await prisma.member.create({
        data: {
          id: 'member-1',
          name: 'Alice',
          color: '#EF4444',
          tripId,
        },
      });
      member1Id = m1.id;

      const m2 = await prisma.member.create({
        data: {
          id: 'member-2',
          name: 'Bob',
          color: '#3B82F6',
          tripId,
        },
      });
      member2Id = m2.id;
    });

    it('should create an expense with splits', async () => {
      const expense = await prisma.expense.create({
        data: {
          id: 'expense-1',
          description: 'Dinner',
          amount: 100.0,
          currency: 'USD',
          tripId,
          paidById: member1Id,
          splits: {
            create: [{ memberId: member1Id }, { memberId: member2Id }],
          },
        },
        include: {
          splits: true,
        },
      });

      expect(expense).toBeDefined();
      expect(expense.description).toBe('Dinner');
      expect(expense.amount).toBe(100.0);
      expect(expense.currency).toBe('USD');
      expect(expense.paidById).toBe(member1Id);
      expect(expense.splits).toHaveLength(2);
    });

    it('should create an expense split equally among all members', async () => {
      const expenseAmount = 90.0;

      const m3 = await prisma.member.create({
        data: {
          id: 'member-3',
          name: 'Charlie',
          color: '#22C55E',
          tripId,
        },
      });

      const expense = await prisma.expense.create({
        data: {
          id: 'expense-1',
          description: 'Lunch',
          amount: expenseAmount,
          currency: 'USD',
          tripId,
          paidById: member1Id,
          splits: {
            create: [{ memberId: member1Id }, { memberId: member2Id }, { memberId: m3.id }],
          },
        },
        include: {
          splits: true,
        },
      });

      expect(expense.splits).toHaveLength(3);
    });

    it('should update an expense', async () => {
      const expense = await prisma.expense.create({
        data: {
          id: 'expense-1',
          description: 'Dinner',
          amount: 100.0,
          currency: 'USD',
          tripId,
          paidById: member1Id,
          splits: {
            create: [{ memberId: member1Id }],
          },
        },
      });

      const updated = await prisma.expense.update({
        where: { id: expense.id },
        data: {
          description: 'Breakfast',
          amount: 50.0,
        },
      });

      expect(updated.description).toBe('Breakfast');
      expect(updated.amount).toBe(50.0);
    });

    it('should delete an expense', async () => {
      const expense = await prisma.expense.create({
        data: {
          id: 'expense-1',
          description: 'Dinner',
          amount: 100.0,
          currency: 'USD',
          tripId,
          paidById: member1Id,
          splits: {
            create: [{ memberId: member1Id }],
          },
        },
      });

      await prisma.expense.delete({
        where: { id: expense.id },
      });

      const deleted = await prisma.expense.findUnique({
        where: { id: expense.id },
      });

      expect(deleted).toBeNull();
    });
  });

  describe('Full Expense Flow', () => {
    it('should complete full flow: create trip, add members, add expenses, calculate balances', async () => {
      const trip = await prisma.trip.create({
        data: {
          id: 'flow-trip',
          name: 'Vacation',
          userId: 'test-user-1',
        },
      });

      const alice = await prisma.member.create({
        data: {
          id: 'alice',
          name: 'Alice',
          color: '#EF4444',
          tripId: trip.id,
        },
      });

      const bob = await prisma.member.create({
        data: {
          id: 'bob',
          name: 'Bob',
          color: '#3B82F6',
          tripId: trip.id,
        },
      });

      const charlie = await prisma.member.create({
        data: {
          id: 'charlie',
          name: 'Charlie',
          color: '#22C55E',
          tripId: trip.id,
        },
      });

      await prisma.expense.create({
        data: {
          id: 'expense-1',
          description: 'Hotel',
          amount: 300.0,
          currency: 'USD',
          tripId: trip.id,
          paidById: alice.id,
          splits: {
            create: [{ memberId: alice.id }, { memberId: bob.id }, { memberId: charlie.id }],
          },
        },
      });

      await prisma.expense.create({
        data: {
          id: 'expense-2',
          description: 'Dinner',
          amount: 90.0,
          currency: 'USD',
          tripId: trip.id,
          paidById: bob.id,
          splits: {
            create: [{ memberId: alice.id }, { memberId: bob.id }, { memberId: charlie.id }],
          },
        },
      });

      const expenses = await prisma.expense.findMany({
        where: { tripId: trip.id },
        include: { splits: true },
      });

      expect(expenses).toHaveLength(2);

      const alicePaid = expenses
        .filter((e) => e.paidById === alice.id)
        .reduce((sum, e) => sum + e.amount, 0);
      const bobPaid = expenses
        .filter((e) => e.paidById === bob.id)
        .reduce((sum, e) => sum + e.amount, 0);

      expect(alicePaid).toBe(300.0);
      expect(bobPaid).toBe(90.0);

      const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
      const perPersonShare = totalExpenses / 3;

      expect(perPersonShare).toBe(130.0);

      const aliceBalance = alicePaid - perPersonShare;
      const bobBalance = bobPaid - perPersonShare;

      expect(aliceBalance).toBe(170.0);
      expect(bobBalance).toBe(-40.0);
    });
  });
});
