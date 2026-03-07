import { betterAuth, type Auth } from "better-auth";
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { prismaAdapter } from "@better-auth/prisma-adapter";

const isBuildTime = process.env.NEXT_PHASE === "phase-production-build";

let authInstance: Auth | null = null;

const getPrisma = () => {
  const adapter = new PrismaLibSql({
    url: process.env.TURSO_DATABASE_URL || "file:./dev.db",
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
  return new PrismaClient({ adapter });
};

export const getAuth = (): Auth => {
  if (!authInstance && !isBuildTime) {
    authInstance = betterAuth({
      baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
      database: prismaAdapter(getPrisma(), {
        provider: "sqlite",
      }),
      emailAndPassword: {
        enabled: true,
        requireEmailVerification: false,
      },
      session: {
        expiresIn: 60 * 60 * 24 * 7,
        updateAge: 60 * 60 * 24,
        cookieCache: {
          enabled: true,
          maxAge: 5 * 60,
        },
      },
      trustedOrigins: ["http://localhost:3000"],
    }) as Auth;
  }
  return authInstance!;
};

const authHandler: Auth = new Proxy({} as Auth, {
  get(_, prop) {
    return (...args: unknown[]) => {
      const instance = getAuth();
      if (!instance) return;
      return (instance as any)[prop];
    };
  }
});

export const auth = authHandler;
