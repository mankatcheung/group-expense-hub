# AGENTS.md

Conventions for working in this repository, referenced by `CLAUDE.md`.

## Apps

- `apps/web` — Next.js 16 / React 19 app serving both the UI and the API. Route handlers live in `app/api/**`; auth, business logic, and database access live in `src/server/**` (domain → application ports/use cases → infrastructure, wired by a DI container). Client code calls the API through `src/services/api.ts` and never imports from `src/server`.
- `apps/mobile` — Expo/React Native app. **Early scaffold stage**: `app/` and `src/` exist only as empty directory structure with no implementation. Don't assume any mobile functionality exists without checking first.
- `packages/db` — shared `@group-expense-hub/db` package: Prisma schema and migrations, generated client, Zod schemas, shared types/constants, exported via `.`, `./types`, `./constants`, `./schemas`, `./balances`.

## Code Style

- ESM imports: `apps/web` and `packages/db` use bundler resolution and import extension-less (e.g. `import { x } from './lib/utils'`).
- Files: kebab-case. Components: PascalCase (e.g. `ThemeProvider.tsx`). Hooks: camelCase `useX` (e.g. `use-invitations.ts` exporting `useInvitations`).
- Tests live alongside source (`lib/balances.ts` → `lib/balances.test.ts`), using Vitest. Vitest runs three projects: `client` (jsdom), `server` (node, `src/server/**/*.test.ts`), and `server-integration` (`src/server/**/*.integration.test.ts`, real migrated SQLite). End-to-end tests use Playwright in `apps/web/e2e`.
- Every API route handler is wrapped in `withApiRoute` (Origin/CSRF check and error shape) and declares `export const runtime = 'nodejs'`.
- Use cases take their dependencies as ports; don't import Next.js or better-auth into `src/server/application` or `src/server/domain`, and keep Prisma out of them too (the one existing exception is the type-only include/select shapes in `ports/repositories/trip.repository.ts`).
- Validate request bodies with Zod; reuse schemas from `@group-expense-hub/db/schemas` and types from `@group-expense-hub/db/types` where the shape is shared between server and client, rather than redefining them locally.
- Shared business logic (e.g. balance calculation) belongs in `packages/db`, not duplicated per-app.
