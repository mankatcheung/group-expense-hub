import 'dotenv/config';
import { betterAuth } from 'better-auth';
import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import { prismaAdapter } from '@better-auth/prisma-adapter';
import { sendPasswordResetEmail } from './services/email.js';
import { SESSION } from '@group-expense-hub/db/constants';
import { getTrustedOrigins } from './lib/trusted-origins.js';

const dbUrl = process.env.TURSO_DATABASE_URL || 'file:./dev.db';
const authToken = process.env.TURSO_AUTH_TOKEN;

const adapter = new PrismaLibSql({
  url: dbUrl,
  ...(authToken ? { authToken } : {}),
});

const prisma = new PrismaClient({ adapter });

const isDev = process.env.NODE_ENV !== 'production';

// Origin checks must be explicitly opted out via env var rather than inferred
// from NODE_ENV, so a misconfigured deployment can't silently disable them.
const disableOriginCheck = process.env.DISABLE_ORIGIN_CHECK === 'true';

const apiUrl =
  process.env.NEXT_PUBLIC_API_URL || process.env.BETTER_AUTH_URL || 'http://localhost:4040';

// Using any for better-auth - types are complex to extract
export const auth: any = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'sqlite',
  }),
  baseURL: apiUrl,
  advanced: {
    disableOriginCheck,
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
    cookie: {
      sameSite: isDev ? 'lax' : 'none',
      path: '/',
      secure: !isDev,
    },
  },
  trustedOrigins: getTrustedOrigins(),
});

export { prisma };
