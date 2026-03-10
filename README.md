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

- **Next.js API Routes / Server Actions** - Backend API
- **Better-Auth** - Authentication framework
- **Prisma** - ORM with Prisma Client
- **Turso (libSQL)** - SQLite-compatible database
- **Zod** - Schema validation

### Development

- **Vite** - Build tool (test runner)
- **Vitest** - Testing framework
- **ESLint** - Code linting
- **PostCSS** - CSS processing
- **Prisma CLI** - Database migrations and code generation

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/group-expense-hub.git
cd group-expense-hub

# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Database Setup

The project uses a SQLite database by default for local development. To set up the database:

```bash
# Push Prisma schema to database
npx prisma db push

# Or create a migration
npx prisma migrate dev
```

### Environment Variables

Create a `.env` file in the root directory:

```env
# Database (Turso/libSQL)
TURSO_DATABASE_URL=file:./dev.db
TURSO_AUTH_TOKEN=

# Better Auth
BETTER_AUTH_SECRET=your-secret-key-here
```

## Project Structure

```
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   └── auth/         # Better Auth endpoints
│   ├── login/            # Login page
│   ├── register/         # Registration page
│   ├── forgot-password/  # Password reset
│   ├── trip/             # Trip pages
│   │   └── [tripId]/    # Dynamic trip routes
│   └── page.tsx          # Home page
├── src/
│   ├── components/       # React components
│   │   └── ui/           # shadcn/ui components
│   ├── context/          # React contexts
│   │   ├── AuthContext.tsx
│   │   └── TripContext.tsx
│   ├── lib/              # Utilities
│   │   ├── auth.ts       # Better Auth config
│   │   ├── auth-client.ts
│   │   ├── balances.ts
│   │   ├── currencies.ts
│   │   ├── server/       # Server actions
│   │   └── types.ts
│   └── services/         # API client
├── prisma/
│   └── schema.prisma     # Database schema
└── public/               # Static assets
```

## Scripts

```bash
npm run dev       # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
npm run test     # Run tests
```

## License

MIT License
