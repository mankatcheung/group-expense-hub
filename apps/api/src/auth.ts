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

const getTrustedOrigins = (): string[] => {
  const origins = [
    'http://localhost:3000',
    'http://localhost:4040',
    'https://localhost:3000',
    'https://localhost:4040',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:4040',
  ];

  if (process.env.BETTER_AUTH_URL) origins.push(process.env.BETTER_AUTH_URL);
  if (process.env.NEXT_PUBLIC_APP_URL) origins.push(process.env.NEXT_PUBLIC_APP_URL);
  if (process.env.NEXT_PUBLIC_API_URL) origins.push(process.env.NEXT_PUBLIC_API_URL);

  return origins.filter(Boolean);
};

const isDev = process.env.NODE_ENV !== 'production';

// Using any for better-auth - types are complex to extract
export const auth: any = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'sqlite',
  }),
  baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:4040',
  advanced: {
    disableOriginCheck: isDev,
  },
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
  trustedOrigins: getTrustedOrigins(),
});

export { prisma };
