import { createModule } from '@evyweb/ioctopus';
import type { AppRegistry } from '../tokens.js';
import { prisma, auth } from '../../auth.js';
import { emailBloomFilter } from '../../plugins/email-bloom-filter.js';
import { createPrismaTripRepository } from '../../infrastructure/repositories/prisma-trip.repository.js';
import { createPrismaExpenseRepository } from '../../infrastructure/repositories/prisma-expense.repository.js';
import { createPrismaMemberRepository } from '../../infrastructure/repositories/prisma-member.repository.js';
import { createPrismaInvitationRepository } from '../../infrastructure/repositories/prisma-invitation.repository.js';
import { createPrismaUserRepository } from '../../infrastructure/repositories/prisma-user.repository.js';
import { createPrismaTripMemberRepository } from '../../infrastructure/repositories/prisma-trip-member.repository.js';
import { createBetterAuthService } from '../../infrastructure/services/better-auth.service.js';
import { createBrevoEmailService } from '../../infrastructure/services/brevo-email.service.js';
import { createInMemoryRateLimitService } from '../../infrastructure/services/in-memory-rate-limit.service.js';
import { createPrismaTripAccessService } from '../../infrastructure/services/prisma-trip-access.service.js';
import { createBloomFilterService } from '../../infrastructure/services/bloom-filter.service.js';
import { createPrismaTransactionManager } from '../../infrastructure/prisma-transaction-manager.js';

const WINDOW_MS = 60_000;
const authMax = process.env.AUTH_RATE_LIMIT_MAX ? parseInt(process.env.AUTH_RATE_LIMIT_MAX, 10) : 20;

export function createInfrastructureModule() {
  const mod = createModule<AppRegistry>();

  mod.bind('PRISMA_CLIENT').toValue(prisma);

  mod.bind('TRIP_REPOSITORY').toHigherOrderFunction(createPrismaTripRepository, { prisma: 'PRISMA_CLIENT' });
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
  mod.bind('EMAIL_BLOOM_FILTER_SERVICE').toValue(createBloomFilterService(emailBloomFilter));
  mod.bind('TRANSACTION_MANAGER').toHigherOrderFunction(createPrismaTransactionManager, { prisma: 'PRISMA_CLIENT' });

  return mod;
}
