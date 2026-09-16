import { createModule } from '@evyweb/ioctopus';
import type { AppRegistry } from '../tokens';
import { prisma } from '../../db/prisma';
import { auth } from '../../auth';
import { createPrismaTripRepository } from '../../infrastructure/repositories/prisma-trip.repository';
import { createPrismaExpenseRepository } from '../../infrastructure/repositories/prisma-expense.repository';
import { createPrismaMemberRepository } from '../../infrastructure/repositories/prisma-member.repository';
import { createPrismaInvitationRepository } from '../../infrastructure/repositories/prisma-invitation.repository';
import { createPrismaUserRepository } from '../../infrastructure/repositories/prisma-user.repository';
import { createPrismaTripMemberRepository } from '../../infrastructure/repositories/prisma-trip-member.repository';
import { createBetterAuthService } from '../../infrastructure/services/better-auth.service';
import { createBrevoEmailService } from '../../infrastructure/services/brevo-email.service';
import { createInMemoryRateLimitService } from '../../infrastructure/services/in-memory-rate-limit.service';
import { createPrismaTripAccessService } from '../../infrastructure/services/prisma-trip-access.service';
import { createPrismaTransactionManager } from '../../infrastructure/prisma-transaction-manager';
import { createInMemoryCache } from '../../infrastructure/in-memory-cache';
import { createCachingTripRepository } from '../../infrastructure/repositories/caching-trip.repository';

const WINDOW_MS = 60_000;
const authMax = process.env.AUTH_RATE_LIMIT_MAX ? parseInt(process.env.AUTH_RATE_LIMIT_MAX, 10) : 20;

export function createInfrastructureModule() {
  const mod = createModule<AppRegistry>();

  mod.bind('PRISMA_CLIENT').toValue(prisma);
  mod.bind('CACHE').toValue(createInMemoryCache());

  mod.bind('PRISMA_TRIP_REPOSITORY').toHigherOrderFunction(createPrismaTripRepository, { prisma: 'PRISMA_CLIENT' });
  mod.bind('TRIP_REPOSITORY').toHigherOrderFunction(createCachingTripRepository, { repository: 'PRISMA_TRIP_REPOSITORY', cache: 'CACHE' });
  mod.bind('EXPENSE_REPOSITORY').toHigherOrderFunction(createPrismaExpenseRepository, { prisma: 'PRISMA_CLIENT' });
  mod.bind('MEMBER_REPOSITORY').toHigherOrderFunction(createPrismaMemberRepository, { prisma: 'PRISMA_CLIENT' });
  mod.bind('INVITATION_REPOSITORY').toHigherOrderFunction(createPrismaInvitationRepository, { prisma: 'PRISMA_CLIENT' });
  mod.bind('USER_REPOSITORY').toHigherOrderFunction(createPrismaUserRepository, { prisma: 'PRISMA_CLIENT' });
  mod.bind('TRIP_MEMBER_REPOSITORY').toHigherOrderFunction(createPrismaTripMemberRepository, { prisma: 'PRISMA_CLIENT' });

  mod.bind('AUTH_SERVICE').toValue(createBetterAuthService({ auth }));
  mod.bind('EMAIL_SERVICE').toValue(createBrevoEmailService());
  mod.bind('AUTH_RATE_LIMITER').toValue(createInMemoryRateLimitService(authMax, WINDOW_MS));
  mod.bind('API_RATE_LIMITER').toValue(createInMemoryRateLimitService(100, WINDOW_MS));
  mod.bind('EMAIL_RATE_LIMITER').toValue(createInMemoryRateLimitService(5, WINDOW_MS));
  mod.bind('TRIP_ACCESS_SERVICE').toHigherOrderFunction(createPrismaTripAccessService, { prisma: 'PRISMA_CLIENT' });
  mod.bind('TRANSACTION_MANAGER').toHigherOrderFunction(createPrismaTransactionManager, { prisma: 'PRISMA_CLIENT' });

  return mod;
}
