import { betterAuth } from 'better-auth';
import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import { prismaAdapter } from '@better-auth/prisma-adapter';

import { nextCookies } from 'better-auth/next-js';
import { sendPasswordResetEmail } from './email';
import { SESSION, TIME } from './constants';

const dbUrl = process.env.TURSO_DATABASE_URL || 'file:./dev.db';
const authToken = process.env.TURSO_AUTH_TOKEN;

const adapter = new PrismaLibSql({
  url: dbUrl,
  ...(authToken ? { authToken } : {}),
});
const prisma = new PrismaClient({ adapter });

export const auth = betterAuth({
  plugins: [nextCookies()],
  baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:3000',
  database: prismaAdapter(prisma, {
    provider: 'sqlite',
  }),
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
      maxAge: TIME.SECONDS.ONE_MINUTE * 5,
    },
  },
  trustedOrigins: ['localhost:*', process.env.BETTER_AUTH_URL].filter((origin): origin is string =>
    Boolean(origin)
  ),
});
