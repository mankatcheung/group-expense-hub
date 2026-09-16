# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

SplitTrip ("group-expense-hub") — a group travel expense splitting app. pnpm + Turbo monorepo with two apps and one shared package:

- `apps/web` — Next.js 16 / React 19 app (port 3000). Serves both the UI and the API: route handlers under `app/api/**`, server code (auth, business logic, database access) under `src/server/**`.
- `apps/mobile` — Expo/React Native app. Early scaffold stage, mostly empty directories — don't assume functionality exists here without checking.
- `packages/db` — shared `@group-expense-hub/db` package: Prisma schema and migrations, Zod schemas, shared types/constants.

## Commands

```bash
pnpm dev / build / start / lint / typecheck / test / format / format:check   # via Turbo
pnpm db:generate      # regenerate the Prisma client after schema.prisma changes
pnpm db:push          # push schema to the database in TURSO_DATABASE_URL
pnpm --filter @group-expense-hub/db migrate   # create a migration (prisma migrate dev)
```

In `apps/web`:
```bash
pnpm dev                        # next dev (needs apps/web/.env.local — see .env.example)
pnpm test <file>                # single test file (vitest)
pnpm test -t "name"             # single test by name pattern
pnpm test --project server      # one project: client | server | server-integration
pnpm test:watch / test:coverage
pnpm test:e2e                   # Playwright; starts its own dev server on :3100 with a throwaway SQLite db
pnpm lint / typecheck
```

There is no test runner at the root for a single file — `cd apps/web` first.

## Architecture

**The API lives in `apps/web`: route handlers call use cases, which reach the database only through repository ports.**

- `packages/db/prisma/schema.prisma` is the canonical schema (SQLite via Turso/libSQL, `driverAdapters` preview feature). Run `pnpm db:generate` after any change before TypeScript will pick up new types.
- `apps/web/src/server` is layered (hexagonal):
  - `domain/entities` — plain types and pure helpers.
  - `application/ports` — repository/service interfaces; `application/use-cases` — framework-free functions built from ports (`createXUseCase(deps)`).
  - `infrastructure` — Prisma repositories, better-auth/Brevo/rate-limit services, `prisma-transaction-manager.ts` for multi-repository writes.
  - `container` — `@evyweb/ioctopus` DI wiring (`tokens.ts`, `modules/*`). Always use `getContainer()`: it's a per-instance singleton, and the in-memory cache and rate limiters are container state, so rebuilding it per request silently disables them.
  - `presentation/routes` — `createXRoutes(deps)` factories returning request handlers (unit-testable with mocked deps), wired to the container lazily in `presentation/routes/index.ts`.
  - `http/route-helpers.ts` — `withApiRoute`, `requireAuth`, `rateLimit`, `parseBody` (`http/validate-request.ts`).
- Route files in `app/api/**/route.ts` are thin: `export const runtime = 'nodejs'` and every handler wrapped in `withApiRoute`, which performs the Origin (CSRF) check, returns the standard `{ error, statusCode }` error shape, and reports 5xx errors to Sentry (it catches them, so Next's `onRequestError` never sees them). The wrapper is mandatory — `proxy.ts` excludes `/api`, so nothing else checks origins. To add an endpoint: use case (+ port if needed) → bind in `container/modules` and `container/tokens.ts` → handler in a `presentation/routes` factory → wire in `presentation/routes/index.ts` → route file.
- Trip permissions go through `ITripAccessService` (`getAccessLevel` / `canEdit` / `isOwner`) inside use cases. Trips have an owner (`Trip.userId`) and collaborators (`TripMember`). For child resources addressed by id, also check the child belongs to the trip in the URL (`expense.tripId !== tripId` → not_found); `remove-collaborator` is known to miss this check.
- Two parallel concepts are easy to conflate: `Member` (a person in a trip's expense split, may not have a user account) vs `TripMember`/`User` (an authenticated collaborator). Expenses are paid by and split among `Member` records; access is governed by `User`/`TripMember`.
- Auth is `better-auth`, configured in `src/server/auth.ts` and mounted by `app/api/auth/[...all]/route.ts` (which adds an Origin check and a per-IP auth rate limit). `src/lib/auth-client.ts` calls it same-origin. Sessions are cached in a signed cookie for 5 minutes, so after changing user data call `refreshUser()` from `AuthContext`, which bypasses that cache.
- `proxy.ts` is edge middleware: locale routing plus login redirects based on session-cookie presence only. It runs on the edge runtime and must never import from `src/server` (Prisma/libSQL are Node-only).
- Client state: `src/context/AuthContext.tsx` wraps `better-auth/react`'s `useSession`. `src/context/TripContext.tsx` (trip list) and `src/hooks/use-trip-detail.ts` (one trip) wrap TanStack Query over `src/services/api.ts`, with optimistic updates that roll back on error; trip-detail writes refetch the trip once the last pending write settles. Providers are composed in `src/components/Providers.tsx`.
- Environment: `src/server/env.ts` is checked at server startup by `instrumentation.ts` — a production server refuses to start with missing/invalid secrets. `apps/web/.env.example` documents every variable. Production values live in the Vercel project.
- On Vercel, anything held in memory (rate limiters, the `CACHE` used by `caching-trip.repository.ts`) is per function instance, and a write handled by one instance can't invalidate another's copy. Treat rate limits as best-effort, and don't cache data a user can see change — trip lists and trip details are read from the database on every request; only the trip name/owner lookup for invite emails is cached (`caching-trip.multi-instance.integration.test.ts` guards this).
- Deploy: `.github/workflows/ci.yml` runs lint/tests (`ci`), Playwright (`e2e-web`), and on `main` a single Vercel deploy (`deploy-web`, gated by `dorny/paths-filter`, Vercel CLI pinned to 55.0.0 — see the comment there before bumping).

## Code Style

(See `AGENTS.md` for the full list — summarized here.)

- ESM with extension-less local imports (bundler resolution): `import { x } from './lib/utils'`.
- Files: kebab-case. Components: PascalCase. Hooks: `useX` camelCase.
- Tests live alongside source (`lib/balances.ts` → `lib/balances.test.ts`), using Vitest. Database-backed tests are named `*.integration.test.ts` and use `src/server/test/test-db.ts` (a per-file copy of a migrated SQLite db); port mocks live in `src/server/test/mocks.ts`.
- Validate request bodies with Zod; reuse schemas from `@group-expense-hub/db/schemas` where the shape is shared between server and client.
