import type { PrismaClient } from '@prisma/client';
import type { IMemberRepository, CreateMemberData, UpdateMemberData } from '../../application/ports/repositories/member.repository.js';

export function createPrismaMemberRepository({ prisma }: { prisma: PrismaClient }): IMemberRepository {
  return {
    async findById(id) {
      return prisma.member.findUnique({ where: { id } });
    },

    async findByTripAndName(tripId, name) {
      return prisma.member.findFirst({ where: { tripId, name } });
    },

    async findNamesByTripId(tripId) {
      const rows = await prisma.member.findMany({ where: { tripId }, select: { name: true } });
      return new Set(rows.map(r => r.name.toLowerCase()));
    },

    async countExpenses(tripId, memberId) {
      return prisma.expense.count({
        where: { tripId, OR: [{ paidById: memberId }, { splits: { some: { memberId } } }] },
      });
    },

    async create(data: CreateMemberData) {
      return prisma.member.create({ data });
    },

    async update(id: string, data: UpdateMemberData) {
      return prisma.member.update({ where: { id }, data: { name: data.name } });
    },

    async delete(id: string) {
      await prisma.member.delete({ where: { id } });
    },
  };
}
