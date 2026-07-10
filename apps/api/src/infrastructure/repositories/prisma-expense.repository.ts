import type { PrismaClient } from '@prisma/client';
import type { IExpenseRepository, CreateExpenseData, UpdateExpenseData } from '../../application/ports/repositories/expense.repository.js';

export function createPrismaExpenseRepository({ prisma }: { prisma: PrismaClient }): IExpenseRepository {
  return {
    async findById(id) {
      return prisma.expense.findUnique({ where: { id }, select: { id: true, tripId: true } });
    },

    async create(data: CreateExpenseData) {
      await prisma.expense.create({
        data: {
          id: data.id,
          description: data.description,
          amount: data.amount,
          currency: data.currency,
          date: data.date,
          tripId: data.tripId,
          paidById: data.paidById,
          splits: { create: data.splitAmong.map(memberId => ({ memberId })) },
        },
      });
    },

    async update(id: string, data: UpdateExpenseData) {
      await prisma.expense.update({
        where: { id },
        data: {
          description: data.description,
          amount: data.amount,
          currency: data.currency,
          date: data.date,
          tripId: data.tripId,
          paidById: data.paidById,
          splits: { deleteMany: {}, create: data.splitAmong.map(memberId => ({ memberId })) },
        },
      });
    },

    async delete(id: string) {
      await prisma.expense.delete({ where: { id } });
    },
  };
}
