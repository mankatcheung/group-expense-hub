import type { PrismaClient } from '@prisma/client';
import type { IUserRepository, UpdateUserData } from '../../application/ports/repositories/user.repository.js';

export function createPrismaUserRepository({ prisma }: { prisma: PrismaClient }): IUserRepository {
  return {
    async findById(id) {
      return prisma.user.findUnique({
        where: { id },
        select: { id: true, name: true, email: true, image: true },
      });
    },

    async findByEmail(email) {
      return prisma.user.findUnique({
        where: { email },
        select: { id: true, name: true, email: true, image: true },
      });
    },

    async update(id: string, data: UpdateUserData) {
      await prisma.user.update({ where: { id }, data });
    },
  };
}
