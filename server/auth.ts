import { betterAuth } from "better-auth";
import { prismaAdapter } from "@better-auth/prisma-adapter";
import prisma from "../prisma/client";
import { sendVerificationEmail, sendResetPasswordEmail } from "./email";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "sqlite",
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  emailVerification: {
    sendVerificationEmail,
  },
  forgotPassword: {
    sendResetPasswordEmail,
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
  baseURL: "http://localhost:4040",
});
