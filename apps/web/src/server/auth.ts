import { betterAuth } from 'better-auth';
import { prismaAdapter } from '@better-auth/prisma-adapter';
import { SESSION } from '@group-expense-hub/db/constants';
import { prisma } from './db/prisma';
import { createBrevoEmailService } from './infrastructure/services/brevo-email.service';
import { getTrustedOrigins } from './lib/trusted-origins';

const disableOriginCheck = process.env.DISABLE_ORIGIN_CHECK === 'true';
const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

const emailService = createBrevoEmailService();

// better-auth's inferred return type references internal @better-auth/core
// paths that aren't portable under pnpm's nested node_modules, which breaks
// `tsc` emit (TS2742) even though `tsc --noEmit` doesn't catch it. An
// explicit type annotation is the documented workaround.
export const auth: any = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'sqlite',
  }),
  baseURL: appUrl,
  advanced: {
    disableOriginCheck,
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    async sendResetPassword({ user, url }) {
      await emailService.sendPasswordResetEmail({ to: user.email, name: user.name, resetUrl: url });
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
