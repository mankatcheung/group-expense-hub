# AGENTS.md

Conventions for working in this repository, referenced by `CLAUDE.md`.

## Apps

- `apps/api` — Fastify backend, source of truth for auth, business logic, and the database.
- `apps/web` — Next.js 16 / React 19 frontend. Thin client; calls the API through a proxy route, never the database directly.
- `apps/mobile` — Expo/React Native app. **Early scaffold stage**: `app/` and `src/` exist only as empty directory structure with no implementation. Don't assume any mobile functionality exists without checking first.
- `packages/db` — shared `@group-expense-hub/db` package: Prisma schema, generated client, Zod schemas, shared types/constants, exported via `.`, `./types`, `./constants`, `./schemas`, `./balances`.

## Code Style

- ESM imports: `apps/api` uses NodeNext resolution and requires `.js` extensions on local imports even in `.ts` files (e.g. `import { x } from './lib/utils.js'`). `apps/web` and `packages/db` use bundler resolution and import extension-less.
- Files: kebab-case. Components: PascalCase (e.g. `ThemeProvider.tsx`). Hooks: camelCase `useX` (e.g. `use-invitations.ts` exporting `useInvitations`).
- Tests live alongside source (`lib/balances.ts` → `lib/balances.test.ts`), using Vitest. Applies to both `apps/api` and `apps/web`.
- Validate request bodies with Zod; reuse schemas from `@group-expense-hub/db/schemas` and types from `@group-expense-hub/db/types` where the shape is shared between api and web, rather than redefining them locally.
- Shared business logic (e.g. balance calculation) belongs in `packages/db`, not duplicated per-app.
