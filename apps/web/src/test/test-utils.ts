import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';

const TEST_DB_PATH = path.join(process.cwd(), 'prisma', 'test.db');

export function createTestPrisma(): PrismaClient {
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
  }

  execSync(`npx prisma db push --schema prisma/schema.prisma --url "file:./prisma/test.db"`, {
    stdio: 'pipe',
  });

  const adapter = new PrismaBetterSqlite3({
    url: TEST_DB_PATH,
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
