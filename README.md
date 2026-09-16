# SplitTrip

A modern web application for splitting group travel expenses with friends. No more awkward math - SplitTrip makes it easy to track, share, and settle expenses for trips with anyone.

## Features

- **Trip Management** - Create and organize trips with custom names
- **Expense Tracking** - Add expenses and specify who paid and who to split among
- **Balance Calculation** - Automatically calculates who owes whom
- **Member Management** - Add trip members and invite collaborators via email
- **Invitation System** - Accept trip invitations via email links
- **User Authentication** - Secure email/password authentication with session management
- **Responsive Design** - Works on desktop and mobile devices

## Tech Stack

### Frontend

- **Next.js 16** - React framework with App Router
- **React 19** - UI library
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - UI component library built on Radix UI
- **Lucide React** - Icon library
- **Sonner** - Toast notifications
- **Recharts** - Data visualization
- **date-fns** - Date manipulation
- **React Hook Form** - Form handling with Zod validation
- **Tanstack React Query** - Data fetching (configured)

### Backend

- **Next.js Route Handlers** - API under `apps/web/app/api`, with business logic in `apps/web/src/server`
- **Better-Auth** - Authentication framework
- **Prisma** - ORM with Prisma Client
- **Turso (libSQL)** - SQLite-compatible database
- **Zod** - Schema validation

### Development

- **pnpm + Turborepo** - Monorepo tooling
- **Vitest** - Unit and integration tests
- **Playwright** - End-to-end tests
- **ESLint** - Code linting
- **Prisma CLI** - Database migrations and code generation

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/group-expense-hub.git
cd group-expense-hub

# Install dependencies
pnpm install

# Configure the web app (fill in the values; see comments in the file)
cp apps/web/.env.example apps/web/.env.local

# Generate the Prisma client
pnpm db:generate

# Start the development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Database Setup

Local development can use a SQLite file (`TURSO_DATABASE_URL=file:./dev.db`, which the app resolves inside `apps/web`) or a Turso database. The schema and migrations live in `packages/db/prisma`:

```bash
# Apply the migration history to the app's local SQLite file. Use an absolute
# path: Prisma resolves relative file: URLs from packages/db, not apps/web.
TURSO_DATABASE_URL="file:$PWD/apps/web/dev.db" pnpm --filter @group-expense-hub/db migrate:deploy

# Create a new migration after editing schema.prisma
pnpm --filter @group-expense-hub/db migrate
```

### Environment Variables

All variables are documented in [`apps/web/.env.example`](apps/web/.env.example). The minimum for local development:

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
TURSO_DATABASE_URL=file:./dev.db
BETTER_AUTH_SECRET=a-random-string-of-at-least-32-characters
```

In production these are set in the Vercel project; the server refuses to start if a required value is missing.

## Project Structure

```
├── apps/
│   ├── web/                  # Next.js app: UI and API
│   │   ├── app/
│   │   │   ├── [locale]/     # Pages (login, register, trips, settings, ...)
│   │   │   └── api/          # Route handlers (auth, trips, members, expenses, invitations, user)
│   │   ├── src/
│   │   │   ├── components/   # React components (shadcn/ui in components/ui)
│   │   │   ├── context/      # AuthContext, TripContext
│   │   │   ├── hooks/        # Data hooks (e.g. use-trip-detail)
│   │   │   ├── lib/          # Client utilities, auth client
│   │   │   ├── services/     # API client used by the UI
│   │   │   └── server/       # Server-only code: domain, use cases, Prisma repositories, auth, DI container
│   │   └── e2e/              # Playwright tests
│   └── mobile/               # Expo app (early scaffold)
└── packages/
    └── db/                   # Prisma schema and migrations, Zod schemas, shared types and balance logic
```

## Scripts

```bash
pnpm dev          # Start the development server
pnpm build        # Build for production
pnpm start        # Start the production server
pnpm lint         # Run ESLint
pnpm typecheck    # Type-check
pnpm test         # Run unit and integration tests
pnpm db:generate  # Regenerate the Prisma client

# In apps/web
pnpm test:e2e     # Run Playwright end-to-end tests
```

## License

MIT License
