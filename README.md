# Aminy

Behavioral wellness platform for neurodivergent families — AI-powered coaching, telehealth, care planning, and daily routine management.

[![CI](https://github.com/estaren/aminy/actions/workflows/ci.yml/badge.svg)](https://github.com/estaren/aminy/actions/workflows/ci.yml)
[![E2E](https://github.com/estaren/aminy/actions/workflows/e2e-playwright.yml/badge.svg)](https://github.com/estaren/aminy/actions/workflows/e2e-playwright.yml)

## What is Aminy?

Aminy is a Progressive Web App that helps parents of neurodivergent children manage behavioral goals, track progress, access telehealth consultations, and get AI-powered coaching — all in one place. It also includes a provider portal for BCBAs (Board Certified Behavior Analysts) to manage caseloads and clinical reports.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19 + TypeScript |
| Build | Vite 6 + PWA (vite-plugin-pwa) |
| Styling | Tailwind CSS v4 + Radix UI primitives |
| Animation | motion/react v12 |
| Backend | Supabase (Postgres, Auth, Edge Functions, Storage) |
| Payments | Stripe (subscriptions + one-time telehealth visits) |
| AI | Anthropic Claude via Supabase Edge Functions |
| Telehealth | Daily.co video calling |
| Monitoring | Sentry (error tracking + session replay) |
| Testing | Vitest (unit) + Playwright (E2E) |

## Getting Started

### Prerequisites

- Node.js 20+
- npm 10+
- A Supabase project (for backend features)
- Stripe account (for payment features)

### Setup

```bash
# Clone the repository
git clone https://github.com/estaren/aminy.git
cd aminy

# Install dependencies
npm install --legacy-peer-deps

# Copy environment template and fill in your keys
cp .env.example .env.local
# Edit .env.local with your Supabase, Stripe, and other API keys

# Start development server
npm run dev
```

The app opens at `http://localhost:3000`.

### Environment Variables

See `.env.example` for the complete list with descriptions. Key services:

| Variable | Purpose |
|----------|---------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key |
| `VITE_DAILY_DOMAIN` | Daily.co domain for telehealth |
| `VITE_VAPID_PUBLIC_KEY` | Web push notification key |
| `VITE_SENTRY_DSN` | Sentry error tracking DSN |

## Project Structure

```
src/
├── components/       # 339 React components (screens, UI, features)
├── lib/              # Business logic services (AI, payments, analytics, auth)
├── types/            # Shared TypeScript interfaces
├── hooks/            # Custom React hooks
├── context/          # React context providers (auth, theme, etc.)
├── utils/            # Utility functions
├── ai/               # AI conversation engine & prompt configs
├── i18n/             # Internationalization
├── supabase/         # Supabase client & data access layer
├── assets/           # Static assets (images, icons)
├── styles/           # Additional stylesheets
├── test/             # Test setup & utilities
└── __tests__/        # Integration test files

supabase/
├── migrations/       # Database schema migrations
└── functions/        # Deno edge functions (Stripe webhooks, AI, video)

e2e/                  # Playwright end-to-end tests
scripts/              # Database & infrastructure setup scripts
public/               # Static files (manifest, icons, service worker)
```

## Architecture

### Navigation

The app uses a **screen-based navigation** pattern via `currentScreen` state in `App.tsx` instead of React Router. Each screen is a top-level component rendered conditionally. This supports the PWA's single-page architecture with smooth transitions.

### Backend

All backend operations go through **Supabase**:
- **Auth**: Email/password + social login via Supabase Auth
- **Database**: PostgreSQL with Row Level Security (RLS)
- **Edge Functions**: Deno-based serverless functions for Stripe webhooks, AI chat (Claude), and telehealth room creation
- **Storage**: Document vault for uploading and managing files

### Payments

Stripe handles two payment models:
- **Subscriptions**: 5 tiers (Free → Pro+) with monthly/annual billing
- **One-time**: Telehealth visit payments and session bundles

Webhooks (`checkout.session.completed`, `customer.subscription.*`) automatically update user tiers in the database with retry logic on failure.

### PWA

The app is a fully installable PWA with:
- Service worker (Workbox) for offline caching
- Web push notifications (VAPID)
- App manifest for home screen installation

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Vite dev server (port 3000) |
| `npm run build` | Production build to `build/` |
| `npm run preview` | Preview production build locally |
| `npm run typecheck` | Run TypeScript compiler checks |
| `npm run lint` | Run ESLint on `src/` |
| `npm test` | Run Vitest in watch mode |
| `npm run test:run` | Run Vitest once (CI mode) |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run test:e2e` | Run Playwright E2E tests |
| `npm run test:e2e:ui` | Open Playwright UI mode |
| `npm run db:setup` | Set up local database |
| `npm run db:migrate` | Run database migrations |
| `npm run db:seed` | Seed database with sample data |

## Testing

### Unit Tests

```bash
# Run all tests
npm run test:run

# Run with coverage
npm run test:coverage

# Watch mode
npm test
```

### E2E Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run specific test suites
npm run test:e2e:accessibility    # Accessibility audits
npm run test:e2e:journeys         # User flow tests
npm run test:e2e:components       # Component interaction tests

# Debug mode
npm run test:e2e:debug
```

## Deployment

### Frontend

```bash
npm run build          # Outputs to build/
# Deploy build/ to your hosting (Vercel, Netlify, Cloudflare Pages, etc.)
```

### Edge Functions

```bash
supabase functions deploy make-server-8a022548
```

### Database

```bash
supabase db push       # Apply migrations to remote
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines, code style, and PR process.

## License

Proprietary — All rights reserved.
