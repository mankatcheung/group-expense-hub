import 'dotenv/config';
import { betterAuth } from 'better-auth';
import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import { prismaAdapter } from '@better-auth/prisma-adapter';
import { sendPasswordResetEmail } from './services/email.js';
import { SESSION } from '@group-expense-hub/db/constants';

const dbUrl = process.env.TURSO_DATABASE_URL || 'file:./dev.db';
const authToken = process.env.TURSO_AUTH_TOKEN;

const adapter = new PrismaLibSql({
  url: dbUrl,
  ...(authToken ? { authToken } : {}),
});

const prisma = new PrismaClient({ adapter });

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const auth: any = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'sqlite',
  }),
  baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:4040',
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    async sendResetPassword({ user, url }) {
      await sendPasswordResetEmail({
        to: user.email,
        name: user.name,
        resetUrl: url,
      });
    },
  },
  session: {
    expiresIn: SESSION.EXPIRES_IN,
    updateAge: SESSION.UPDATE_AGE,
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
  },
  trustedOrigins: [
    'localhost:*',
    process.env.BETTER_AUTH_URL,
    process.env.NEXT_PUBLIC_APP_URL,
  ].filter(Boolean) as string[],
});

export { prisma };
