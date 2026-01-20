# Aminy MVP - Developer Setup Guide

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Copy environment template
cp env.example .env

# 3. Fill in your API keys in .env (see below)

# 4. Start development server
npm run dev

# 5. Open http://localhost:3000
```

## Required API Keys

### Minimum for Development
1. **Supabase** - Database & Auth
   - Go to [Supabase](https://app.supabase.com)
   - Create a project
   - Get URL and anon key from Settings > API

2. **Claude API** (for AI chat)
   - Go to [Anthropic Console](https://console.anthropic.com)
   - Create an API key
   - Add to Supabase Edge Function secrets

### For Full Features
3. **Stripe** (payments)
   - [Stripe Dashboard](https://dashboard.stripe.com/apikeys)

4. **Daily.co** (video calls)
   - [Daily Dashboard](https://dashboard.daily.co/developers)

## Developer Panel

Press **`Shift+D`** anywhere in the app to open the developer panel.

### Features:
- **Tier Switching**: Test free/starter/core/pro instantly
- **Mock Data Toggle**: Switch between mock and real data
- **Paywall Bypass**: Skip payment flows for testing
- **Test User**: One-click fill sample family data
- **Cache Clear**: Reset localStorage
- **Export Logs**: Download debug logs as JSON

### Keyboard Shortcuts:
| Shortcut | Destination |
|----------|-------------|
| `Shift+H` | Dashboard |
| `Shift+C` | Care tab |
| `Shift+R` | Reports |
| `Shift+T` | Telehealth |
| `Shift+P` | Provider Portal |
| `Shift+A` | Analytics |

## Project Structure

```
src/
├── components/     # React components (235+)
│   ├── ui/         # Radix UI primitives
│   └── ...         # Feature components
├── lib/            # Core logic
│   ├── store.ts    # Zustand global state
│   ├── memory-system.ts    # AI memory
│   ├── aminy-ai-brain.ts   # AI intelligence
│   └── tier-utils.ts       # Subscription logic
├── styles/         # CSS & design tokens
├── supabase/       # Edge Functions
│   └── functions/
│       └── server/ # API routes
└── utils/          # Helpers
```

## Key Files

| File | Purpose |
|------|---------|
| `src/App.tsx` | Main router & lazy loading |
| `src/components/Dashboard10.tsx` | Main dashboard |
| `src/lib/stripe-service.ts` | Payment integration |
| `src/lib/daily-video.ts` | Video call integration |
| `src/lib/provider-service.ts` | Provider API |
| `src/supabase/functions/server/index.tsx` | All API endpoints |

## Feature Flags

Located in `src/lib/feature-flags.ts`:

```typescript
// Enable experimental features
LIVE_VISION_AI: false,      // Camera-based behavior analysis
FILE_ATTACHMENTS: false,    // Document uploads
MULTI_LANGUAGE: false,      // i18n support
```

## Testing Users

The developer panel includes a "Fill Sample Data" button that creates:
- **Parent**: Sarah Johnson
- **Child**: Alex (6 years old, Autism Level 1)
- **Location**: California
- **Tier**: Free (switchable)

## Admin Portal

Access the admin metrics dashboard at the `/admin` route (or use `Shift+A`).

Tracks:
- Onboarding completion rate
- User activation metrics
- AI chat volume
- Revenue & subscriptions
- NPS scores

## Troubleshooting

### AI Chat Not Working
1. Check Supabase Edge Function logs
2. Verify ANTHROPIC_API_KEY is set in Supabase secrets
3. Try the fallback responses (works without API key)

### Payments Not Processing
1. Verify Stripe keys in .env
2. Check Stripe webhook is configured
3. Use Stripe test mode cards

### Video Calls Failing
1. Check DAILY_API_KEY in Supabase secrets
2. Allow camera/microphone permissions
3. Try a different browser

## Build for Production

```bash
# Type check
npm run typecheck

# Build
npm run build

# Preview production build
npm run preview
```

## Deployment

### Supabase Edge Functions
```bash
cd src/supabase/functions
supabase functions deploy make-server-8a022548
```

### Frontend (Vercel/Netlify)
- Connect to Git repo
- Set environment variables
- Deploy
