// `bloom-filters` is CommonJS and defines its named exports via
// Object.defineProperty getters, which Node's CJS-to-ESM lexer doesn't
// reliably detect (confirmed empirically: `import { ScalableBloomFilter }`
// fails at real runtime under Node's native ESM loader even though it
// type-checks and passes under Vitest's own module transform). Importing
// the default (always reliable for CJS) and destructuring from it sidesteps
// the issue entirely.
import bloomFilters from 'bloom-filters';
import type { PrismaClient } from '@prisma/client';

const { ScalableBloomFilter } = bloomFilters;

/**
 * Fast, probabilistic "is this email taken" pre-check, backed by a Scalable
 * Bloom Filter (grows automatically as more users sign up, unlike a
 * fixed-size classic Bloom Filter which would need an upfront capacity
 * estimate to avoid its false-positive rate degrading over time).
 *
 * This NEVER replaces the database's `User.email @unique` constraint as the
 * source of truth - `.has()` returning true only means "maybe taken", since
 * false positives are possible (false negatives are not). Callers must still
 * confirm a "maybe" against the real database before treating an email as
 * unavailable.
 */
export const emailBloomFilter = new ScalableBloomFilter();

/**
 * Populates the filter with every existing user's email. Must run once,
 * before the server starts accepting traffic, so it's never stale on boot.
 *
 * Takes `prisma` as a parameter (rather than importing it from auth.ts)
 * specifically to avoid a circular import - auth.ts itself imports
 * `emailBloomFilter` from this module to wire up the after-create hook.
 */
export async function seedEmailBloomFilter(
  prisma: Pick<PrismaClient, 'user'>
): Promise<void> {
  const users = await prisma.user.findMany({ select: { email: true } });
  for (const user of users) {
    emailBloomFilter.add(user.email);
  }
}
