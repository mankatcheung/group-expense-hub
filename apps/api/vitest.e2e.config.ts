import { defineConfig } from 'vitest/config';
import { resolveTestDbUrl } from './src/test/e2e/env.js';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/test/e2e/**/*.test.ts'],
    globalSetup: ['./src/test/e2e/setup.ts'],
    // Vitest's `globalSetup` runs in the main process and doesn't propagate
    // process.env mutations to test workers - `test.env` is read at worker
    // bootstrap instead, so the test DB path must be set here.
    env: {
      TURSO_DATABASE_URL: resolveTestDbUrl(),
    },
    testTimeout: 20000,
    fileParallelism: false,
  },
});
