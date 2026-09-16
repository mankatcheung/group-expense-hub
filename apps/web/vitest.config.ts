import { defineConfig } from 'vitest/config';
import path from 'path';

// Playwright's e2e specs (e2e/**/*.spec.ts) live outside src/app specifically
// so they're never matched by these include globs.
const INTEGRATION_TESTS = 'src/server/**/*.integration.test.ts';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{ts,tsx}', 'app/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/test/**',
        'src/server/test/**',
        'src/server/presentation/routes/test-helpers.ts',
        'e2e/**',
      ],
    },
    projects: [
      {
        extends: true,
        test: {
          name: 'client',
          environment: 'jsdom',
          setupFiles: ['./src/test/setup.ts'],
          include: ['src/**/*.test.{ts,tsx}', 'app/**/*.test.{ts,tsx}'],
          exclude: ['src/server/**', 'node_modules/**'],
        },
      },
      {
        extends: true,
        test: {
          name: 'server',
          environment: 'node',
          include: ['src/server/**/*.test.ts'],
          exclude: [INTEGRATION_TESTS, 'node_modules/**'],
        },
      },
      {
        // Real migrated SQLite databases, one copy per test file.
        extends: true,
        test: {
          name: 'server-integration',
          environment: 'node',
          include: [INTEGRATION_TESTS],
          globalSetup: ['./src/server/test/integration-global-setup.ts'],
          testTimeout: 20_000,
          hookTimeout: 60_000,
        },
      },
    ],
  },
});
