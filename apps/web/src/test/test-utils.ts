import { PrismaClient } from '@group-expense-hub/db';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import path from 'path';

const DB_PATH = path.join(process.cwd(), '..', 'api', 'dev.db');

export function createTestPrisma(): PrismaClient {
  const adapter = new PrismaLibSql({
    url: `file:${DB_PATH}`,
  });
  return new PrismaClient({ adapter });
}

export async function seedTestData(prisma: PrismaClient) {
  const user = await prisma.user.create({
    data: {
      id: 'test-user-id',
      name: 'Test User',
      email: 'test@example.com',
      emailVerified: true,
    },
  });

  await prisma.account.create({
    data: {
      id: 'test-account-id',
      userId: user.id,
      accountId: 'test-account',
      providerId: 'credential',
      password: '$2a$10$test-hashed-password',
    },
  });

  const session = await prisma.session.create({
    data: {
      id: 'test-session-id',
      userId: user.id,
      token: 'test-session-token',
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
    },
  });

  return { user, session };
}

export const TEST_USER = {
  id: 'test-user-id',
  email: 'test@example.com',
  name: 'Test User',
  password: 'password123',
};

export const TEST_TRIP = {
  id: 'test-trip-id',
  name: 'Test Trip',
};

export const TEST_MEMBER = {
  id: 'test-member-id',
  name: 'Alice',
  color: '#EF4444',
};
