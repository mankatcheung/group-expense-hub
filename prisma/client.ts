import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import dotenv from "dotenv";

dotenv.config();
// 2. Wrap it in the Prisma adapter
const adapter = new PrismaLibSql({
  url: process.env.TURSO_DATABASE_URL || "file:./prisma/dev.db",
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// 3. Pass the adapter to the PrismaClient constructor
const prisma = new PrismaClient({ adapter });

export default prisma;
