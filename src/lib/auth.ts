import { betterAuth } from "better-auth";
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { prismaAdapter } from "@better-auth/prisma-adapter";

import { nextCookies } from "better-auth/next-js";
import { sendPasswordResetEmail } from "./email";

const adapter = new PrismaLibSql({
  url: process.env.TURSO_DATABASE_URL || "file:./dev.db",
  authToken: process.env.TURSO_AUTH_TOKEN,
});
const prisma = new PrismaClient({ adapter });

export const auth = betterAuth({
  plugins: [nextCookies()],
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
  database: prismaAdapter(prisma, {
    provider: "sqlite",
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
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
  },
  trustedOrigins: ["localhost:*", process.env.BETTER_AUTH_URL].filter(
    (origin): origin is string => Boolean(origin),
  ),
});
