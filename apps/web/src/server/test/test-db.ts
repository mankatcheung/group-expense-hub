import { randomUUID } from 'crypto';
import { copyFile, rm } from 'fs/promises';
import os from 'os';
import path from 'path';
import { inject } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';

export type TestDb = {
  prisma: PrismaClient;
  url: string;
  cleanup: () => Promise<void>;
};

export async function createTestDb(): Promise<TestDb> {
  const dbPath = path.join(os.tmpdir(), `geh-test-${randomUUID()}.db`);
  await copyFile(inject('templateDbPath'), dbPath);
  const url = `file:${dbPath}`;
  const prisma = new PrismaClient({ adapter: new PrismaLibSql({ url }) });

  return {
    prisma,
    url,
    async cleanup() {
      await prisma.$disconnect();
      await Promise.all([dbPath, `${dbPath}-journal`, `${dbPath}-wal`, `${dbPath}-shm`].map((p) => rm(p, { force: true })));
    },
  };
}

export async function createUser(prisma: PrismaClient, overrides: { name?: string | null; email?: string } = {}) {
  const id = randomUUID();
  return prisma.user.create({
    data: {
      id,
      name: overrides.name === undefined ? `User ${id.slice(0, 6)}` : overrides.name,
      email: overrides.email ?? `${id}@example.com`,
      emailVerified: false,
    },
  });
}

export async function createTrip(prisma: PrismaClient, userId: string, name = 'Trip') {
  return prisma.trip.create({ data: { id: randomUUID(), name, userId } });
}

export async function createMember(prisma: PrismaClient, tripId: string, name = 'Member') {
  return prisma.member.create({ data: { id: randomUUID(), name, color: '#EF4444', tripId } });
}
