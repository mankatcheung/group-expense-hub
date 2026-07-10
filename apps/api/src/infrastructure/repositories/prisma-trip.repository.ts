import type { PrismaClient } from '@prisma/client';
import type { ITripRepository, CreateTripData, UpdateTripData } from '../../application/ports/repositories/trip.repository.js';
import { tripInclude, tripSummarySelect } from '../../application/ports/repositories/trip.repository.js';

export function createPrismaTripRepository({ prisma }: { prisma: PrismaClient }): ITripRepository {
  return {
    findSummariesOwnedByUser(userId) {
      return prisma.trip.findMany({
        where: { userId },
        select: tripSummarySelect,
        orderBy: { createdAt: 'desc' },
      });
    },

    findSummariesByIds(ids) {
      return prisma.trip.findMany({
        where: { id: { in: ids } },
        select: tripSummarySelect,
        orderBy: { createdAt: 'desc' },
      });
    },

    findByIdFull(id) {
      return prisma.trip.findUnique({ where: { id }, include: tripInclude });
    },

    findNameAndOwner(id) {
      return prisma.trip.findUnique({
        where: { id },
        select: { name: true, user: { select: { name: true, email: true } } },
      });
    },

    async create(data: CreateTripData) {
      return prisma.trip.create({
        data: {
          id: data.id,
          name: data.name,
          userId: data.userId,
          createdAt: data.createdAt,
        },
      });
    },

    async update(id: string, data: UpdateTripData) {
      return prisma.trip.update({ where: { id }, data: { name: data.name } });
    },

    async delete(id: string, userId: string) {
      await prisma.trip.delete({ where: { id, userId } });
    },
  };
}
