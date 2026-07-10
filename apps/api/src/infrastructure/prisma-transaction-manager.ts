import type { PrismaClient } from '@prisma/client';
import type { ITransactionManager, TransactionalContext } from '../application/ports/transaction-manager.js';
import { createPrismaMemberRepository } from './repositories/prisma-member.repository.js';
import { createPrismaTripMemberRepository } from './repositories/prisma-trip-member.repository.js';
import { createPrismaInvitationRepository } from './repositories/prisma-invitation.repository.js';

export function createPrismaTransactionManager({ prisma }: { prisma: PrismaClient }): ITransactionManager {
  return {
    transaction: <T>(fn: (ctx: TransactionalContext) => Promise<T>) =>
      prisma.$transaction((tx) =>
        fn({
          memberRepository: createPrismaMemberRepository({ prisma: tx as unknown as PrismaClient }),
          tripMemberRepository: createPrismaTripMemberRepository({ prisma: tx as unknown as PrismaClient }),
          invitationRepository: createPrismaInvitationRepository({ prisma: tx as unknown as PrismaClient }),
        })
      ),
  };
}
