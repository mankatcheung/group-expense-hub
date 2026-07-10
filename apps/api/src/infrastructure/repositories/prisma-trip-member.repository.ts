import type { PrismaClient } from '@prisma/client';
import type { ITripMemberRepository } from '../../application/ports/repositories/trip-member.repository.js';

export function createPrismaTripMemberRepository({ prisma }: { prisma: PrismaClient }): ITripMemberRepository {
  return {
    async findIdsByUserId(userId) {
      const rows = await prisma.tripMember.findMany({
        where: { userId },
        select: { tripId: true },
      });
      return rows.map(r => r.tripId);
    },

    async findByTripAndUser(tripId, userId) {
      return prisma.tripMember.findUnique({
        where: { tripId_userId: { tripId, userId } },
        select: { id: true },
      });
    },

    async findById(id) {
      return prisma.tripMember.findUnique({
        where: { id },
        select: { id: true, userId: true, tripId: true, role: true, user: { select: { name: true, email: true } } },
      });
    },

    async create(data) {
      const row = await prisma.tripMember.create({
        data: { tripId: data.tripId, userId: data.userId, role: data.role },
        select: { id: true },
      });
      return row;
    },

    async delete(id) {
      await prisma.tripMember.delete({ where: { id } });
    },
  };
}
