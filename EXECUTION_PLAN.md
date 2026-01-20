# Aminy MVP: Execution Plan to 10/10

## Current State (After Code Review)

| Area | Status | What's Done | What's Missing |
|------|--------|-------------|----------------|
| **Auth** | 95% | Real Supabase auth, OAuth wired, rate limiting | Need to verify OAuth in Supabase dashboard |
| **Payments** | 90% | Real Stripe integration, webhook verification | Backend secrets not deployed |
| **AI/Claude** | 95% | Real Claude API (claude-sonnet-4-20250514) | Backend API key not deployed |
| **Database** | 100% | 15 tables with RLS, profiles, stripe_customers | Complete |
| **Security** | 100% | CSRF, rate limiting, security headers | Complete |
| **Tests** | 100% | 132 tests passing | Complete |
| **CI/CD** | 100% | GitHub Actions pipeline | Complete |
| **Code Quality** | 95% | Console.logs cleaned, backup files deleted | Complete |

---

## PHASE 1: Deploy Backend Secrets (30 minutes)

### 1.1 Supabase Edge Function Secrets
Go to: https://supabase.com/dashboard/project/qpzsvafwcwyrkdolrjbu/settings/functions

Add these secrets:
```
STRIPE_SECRET_KEY=sk_test_... (get from Stripe dashboard)
STRIPE_WEBHOOK_SECRET=whsec_... (create webhook first, then get secret)
ANTHROPIC_API_KEY=sk-ant-... (get from console.anthropic.com)
RESEND_API_KEY=re_... (get from resend.com)
```

### 1.2 Stripe Webhook Configuration
Go to: https://dashboard.stripe.com/webhooks

1. Click "Add endpoint"
2. URL: `https://qpzsvafwcwyrkdolrjbu.supabase.co/functions/v1/make-server-8a022548/payments/webhook`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Copy signing secret to `STRIPE_WEBHOOK_SECRET`

---

## PHASE 2: Configure OAuth (30 minutes)

### 2.1 Google OAuth
Go to: https://supabase.com/dashboard/project/qpzsvafwcwyrkdolrjbu/auth/providers

1. Enable Google provider
2. Create OAuth credentials at https://console.cloud.google.com
   - Authorized origins: `https://yourdomain.com`, `http://localhost:3000`
   - Authorized redirect: `https://qpzsvafwcwyrkdolrjbu.supabase.co/auth/v1/callback`
3. Paste Client ID and Client Secret in Supabase

### 2.2 Apple OAuth
1. Enable Apple provider in Supabase
2. Create App ID and Service ID at https://developer.apple.com
3. Configure domains and return URLs
4. Upload .p8 key file to Supabase

---

## PHASE 3: Configure Daily.co (15 minutes)

### 3.1 Set up Daily.co domain
1. Create account at https://daily.co
2. Get your domain (e.g., `aminy.daily.co`)
3. Update `.env.local`:
   ```
   VITE_DAILY_DOMAIN=aminy.daily.co
   ```
4. Get API key for backend (add to Supabase secrets if needed)

---

## PHASE 4: Deploy to Production (20 minutes)

### 4.1 Push to GitHub
```bash
git init
git add .
git commit -m "Initial production deployment"
git remote add origin https://github.com/yourusername/aminy-app.git
git push -u origin main
```

### 4.2 Set GitHub Secrets
Go to: Repository Settings > Secrets and variables > Actions

Add:
```
VERCEL_TOKEN=... (from vercel.com/account/tokens)
VERCEL_ORG_ID=... (from vercel.com/account)
VERCEL_PROJECT_ID=... (from project settings)
```

### 4.3 Production Environment Variables
In Vercel dashboard, add all VITE_* variables from .env.local

---

## PHASE 5: Verify Everything Works (30 minutes)

### 5.1 Auth Flow Checklist
- [ ] Create new account with email/password
- [ ] Receive email confirmation
- [ ] Login with email/password
- [ ] Password reset flow works
- [ ] Google OAuth login works
- [ ] Apple OAuth login works
- [ ] Session persists on page refresh
- [ ] Logout clears session completely

### 5.2 Payment Flow Checklist
- [ ] Upgrade button opens Stripe Checkout
- [ ] Complete test payment (card: 4242424242424242)
- [ ] Webhook fires and updates user tier
- [ ] Customer portal accessible
- [ ] Subscription shows correct tier
- [ ] Cancellation works (sets cancel_at_period_end)

### 5.3 AI Chat Checklist
- [ ] Messages route to Claude API
- [ ] Responses display correctly
- [ ] Rate limit enforced per tier
- [ ] Paywall shows when limit reached
- [ ] Conversation history persists

### 5.4 Telehealth Checklist
- [ ] Provider search works
- [ ] Appointment booking flow works
- [ ] Video call connects (requires Daily.co)

---

## PHASE 6: Optional Enhancements

### 6.1 Analytics (Optional)
Add to Supabase secrets:
```
VITE_SENTRY_DSN=https://xxx@sentry.io/xxx
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

### 6.2 Monitoring (Optional)
- Set up Sentry project for error tracking
- Set up Google Analytics for user behavior

---

## Quick Reference: What Goes Where

| Secret | Where | How to Get |
|--------|-------|------------|
| `STRIPE_SECRET_KEY` | Supabase Edge Function Secrets | Stripe Dashboard > API Keys |
| `STRIPE_WEBHOOK_SECRET` | Supabase Edge Function Secrets | Stripe Dashboard > Webhooks > Signing Secret |
| `ANTHROPIC_API_KEY` | Supabase Edge Function Secrets | console.anthropic.com |
| `RESEND_API_KEY` | Supabase Edge Function Secrets | resend.com |
| `VITE_DAILY_DOMAIN` | .env.local / Vercel | daily.co dashboard |
| Google OAuth | Supabase Auth Providers | console.cloud.google.com |
| Apple OAuth | Supabase Auth Providers | developer.apple.com |
| `VERCEL_TOKEN` | GitHub Secrets | vercel.com/account/tokens |

---

## Estimated Total Time: 2-3 hours

Most of the code work is already done. What remains is:
1. **Configuration** - Setting secrets in the right places
2. **Third-party setup** - OAuth, Stripe webhook, Daily.co
3. **Verification** - Testing each flow end-to-end

---

## Files Already Production-Ready

These files have been verified as using real integrations (not mocked):

- `src/components/LoginScreen.tsx` - Real Supabase auth
- `src/components/CreateAccountScreen.tsx` - Real signup + OAuth
- `src/supabase/functions/server/stripe-routes.ts` - Real Stripe API
- `src/supabase/functions/server/index.tsx` - Real Claude API
- `src/lib/security/csrf.ts` - CSRF protection
- `src/lib/security/auth-rate-limit.ts` - Rate limiting
- All 132 tests passing
- CI/CD pipeline configured

---

## Success Criteria for 10/10

- [ ] Users can create real accounts
- [ ] Users can pay with real credit cards
- [ ] AI chat uses real Claude API
- [ ] Video calls work via Daily.co
- [ ] All tests pass in CI
- [ ] No console.logs in production
- [ ] Error monitoring active
- [ ] Analytics tracking active
