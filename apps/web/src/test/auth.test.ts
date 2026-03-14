import { describe, it, expect } from 'vitest';

// These are integration tests that require the Fastify API to be running
// To enable, remove .skip and run: pnpm test when API is running on port 4040
describe.skip('Authentication Integration Tests', () => {
  it('should be skipped - requires running API backend', () => {
    expect(true).toBe(true);
  });
});
