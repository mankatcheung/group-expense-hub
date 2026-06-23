import { randomUUID } from 'crypto';

export interface TestUser {
  name: string;
  email: string;
  password: string;
}

/**
 * Builds a unique throwaway user per test run/test case, so tests never
 * collide on a duplicate-email sign-up error and remain independent of each
 * other (no shared state between tests).
 */
export function createTestUser(label = 'user'): TestUser {
  return {
    name: `E2E ${label}`,
    email: `e2e-${label}-${randomUUID()}@example.com`,
    password: 'Password123!',
  };
}
