import 'dotenv/config';
import { defineConfig } from 'prisma/config';

const tursoUrl = process.env.TURSO_DATABASE_URL || '';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: tursoUrl,
  },
});
