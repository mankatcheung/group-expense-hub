import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { TEST_USER } from './test-utils';
import { auth } from '@/lib/auth';

describe('Authentication Integration Tests', () => {
  beforeAll(async () => {});

  afterAll(async () => {
    try {
      const prisma = (auth as any).database.client;
      await prisma.user.deleteMany({
        where: { email: { startsWith: 'test-' } },
      });
    } catch {
      // ignore cleanup errors
    }
  });

  describe('User Registration', () => {
    it('should create a new user with email and password', async () => {
      const uniqueEmail = `new-user-${Date.now()}@example.com`;

      const { headers } = await auth.api.signUpEmail({
        body: {
          email: uniqueEmail,
          password: TEST_USER.password,
          name: TEST_USER.name,
        },
        returnHeaders: true,
      });

      const cookie = headers.get('set-cookie');
      expect(cookie).toBeDefined();

      const session = await auth.api.getSession({
        headers: { cookie: cookie! },
      });

      expect(session).toBeDefined();
      expect(session?.user.email).toBe(uniqueEmail);
      expect(session?.user.name).toBe(TEST_USER.name);
    });

    it('should not allow duplicate email registration', async () => {
      const uniqueEmail = `dup-test-${Date.now()}@example.com`;

      await auth.api.signUpEmail({
        body: {
          email: uniqueEmail,
          password: TEST_USER.password,
          name: TEST_USER.name,
        },
      });

      await expect(
        auth.api.signUpEmail({
          body: {
            email: uniqueEmail,
            password: 'different-password',
            name: 'Another User',
          },
        })
      ).rejects.toThrow();
    });
  });

  describe('User Sign In', () => {
    let testEmail: string;

    beforeEach(async () => {
      testEmail = `signin-test-${Date.now()}@example.com`;
      await auth.api.signUpEmail({
        body: {
          email: testEmail,
          password: TEST_USER.password,
          name: TEST_USER.name,
        },
      });
    });

    it('should sign in with valid credentials', async () => {
      const { headers } = await auth.api.signInEmail({
        body: {
          email: testEmail,
          password: TEST_USER.password,
        },
        returnHeaders: true,
      });

      const cookie = headers.get('set-cookie');
      expect(cookie).toBeDefined();

      const session = await auth.api.getSession({
        headers: { cookie: cookie! },
      });

      expect(session).toBeDefined();
      expect(session?.user.email).toBe(testEmail);
    });

    it('should fail with invalid password', async () => {
      await expect(
        auth.api.signInEmail({
          body: {
            email: testEmail,
            password: 'wrong-password',
          },
        })
      ).rejects.toThrow();
    });

    it('should fail with non-existent email', async () => {
      await expect(
        auth.api.signInEmail({
          body: {
            email: 'nonexistent@example.com',
            password: TEST_USER.password,
          },
        })
      ).rejects.toThrow();
    });
  });

  describe('Session Management', () => {
    let sessionCookie: string;
    let testEmail: string;

    beforeEach(async () => {
      testEmail = `session-test-${Date.now()}@example.com`;
      const { headers } = await auth.api.signUpEmail({
        body: {
          email: testEmail,
          password: TEST_USER.password,
          name: TEST_USER.name,
        },
        returnHeaders: true,
      });
      sessionCookie = headers.get('set-cookie')!;
    });

    it('should get session with valid token', async () => {
      const session = await auth.api.getSession({
        headers: {
          cookie: sessionCookie,
        },
      });

      expect(session).toBeDefined();
      expect(session?.user.email).toBe(testEmail);
    });

    it('should return null for invalid token', async () => {
      const session = await auth.api.getSession({
        headers: {
          cookie: 'better-auth.session_token=invalid-token',
        },
      });

      expect(session).toBeNull();
    });

    it('should sign out and invalidate session', async () => {
      await auth.api.signOut({
        headers: {
          cookie: sessionCookie,
        },
      });

      const session = await auth.api.getSession({
        headers: {
          cookie: sessionCookie,
        },
      });

      expect(session).toBeNull();
    });
  });
});
