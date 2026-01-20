# Aminy: Path to 10/10 MVP - Investor-Ready Roadmap

**Date:** January 15, 2026
**Current Status:** 5.5/10 (Demo-Ready, Not Production-Ready)
**Target:** 10/10 Production + Investor Ready
**Time Estimate:** 2-3 weeks of focused work

---

## Executive Summary

Aminy has a **world-class UI/UX** and **comprehensive feature set** that aligns perfectly with Dr. Karen Hans's vision at Rise Services for "concierge-style clinical services integrated with therapy, alongside an online subscription-based platform." The core product is built. What's missing is **production hardening** - the infrastructure that makes the difference between a demo and a revenue-generating platform.

### Why 5.5/10 Now?

| Strength (What You Have) | Gap (What's Missing) |
|--------------------------|----------------------|
| Beautiful One Medical-style telehealth flow | Stripe not connected (can't collect money) |
| 72-hour routing rule enforced | Daily.co not configured (video won't work) |
| Referral packet PDF export | No tests (can't trust deployments) |
| Q&A sessions with registration | Console.logs in production code |
| Evidence-based playbooks library | Hard-coded API keys in codebase |
| 12 provider roles including Care Coordinator | No CI/CD pipeline |
| Compliance language guardrails | No monitoring/alerting |
| Mobile-responsive PWA | Mock data mode enabled |

**The demo is impressive. The infrastructure to run it in production is not ready.**

---

## The 10/10 Path

### Phase 1: Revenue Enablement (CRITICAL - Days 1-3)
*You cannot generate revenue until these are complete.*

#### 1.1 Stripe Production Setup
```
Priority: CRITICAL
Time: 4-6 hours
Impact: Enables all subscription revenue
```

**What's Needed:**
1. Create Stripe account at https://dashboard.stripe.com
2. Get production API keys (publishable + secret)
3. Create 4 Products with 8 Prices in Stripe Dashboard:

| Product | Monthly Price ID | Annual Price ID | Monthly $ | Annual $ |
|---------|------------------|-----------------|-----------|----------|
| Starter | price_starter_monthly | price_starter_annual | $9/mo | $79/yr |
| Core | price_core_monthly | price_core_annual | $29/mo | $249/yr |
| Pro | price_pro_monthly | price_pro_annual | $79/mo | $699/yr |
| Pro Plus | price_proplus_monthly | price_proplus_annual | $149/mo | $1,299/yr |

4. Create Visit Products:

| Visit Type | Price ID | Price |
|------------|----------|-------|
| Initial Consultation | price_initial_consult | $149 |
| Follow-up | price_followup | $99 |
| Emergency | price_emergency | $199 |
| Extended | price_extended | $199 |

5. Update `.env.local`:
```bash
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxx
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxx
VITE_PRICE_STARTER_MONTHLY=price_xxxxxxxxxxxx
VITE_PRICE_STARTER_ANNUAL=price_xxxxxxxxxxxx
# ... all 8 subscription prices
# ... all 4 visit prices
```

6. Set up webhook endpoint: `https://your-domain.com/api/webhooks/stripe`
7. Configure webhook events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`

**Files to Update:**
- `src/lib/stripe-service.ts` - Replace placeholder price IDs
- `.env.local` - Add all keys
- `supabase/functions/server/stripe-routes.ts` - Add webhook signature verification

#### 1.2 Daily.co Video Setup
```
Priority: CRITICAL
Time: 2-3 hours
Impact: Enables all telehealth video calls
```

**What's Needed:**
1. Create Daily.co account at https://dashboard.daily.co
2. Get API key from Settings > Developers
3. Note your domain (e.g., `aminy.daily.co`)

4. Update `.env.local`:
```bash
VITE_DAILY_DOMAIN=aminy.daily.co
DAILY_API_KEY=xxxxxxxxxxxx
```

5. Configure room settings in Daily.co dashboard:
   - Enable recordings (HIPAA-compliant storage)
   - Set max participants: 2
   - Enable waiting room
   - Set room expiration: 2 hours

**Files to Update:**
- `src/lib/daily-video.ts` - Verify configuration
- `.env.local` - Add keys

#### 1.3 AI Provider Setup
```
Priority: HIGH
Time: 1 hour
Impact: Enables Aminy AI chat and summaries
```

**What's Needed:**
1. Get Anthropic API key from https://console.anthropic.com
2. Update `.env.local`:
```bash
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxx
```

3. Set up usage limits in Anthropic console to prevent runaway costs

---

### Phase 2: Production Hardening (Days 3-5)

#### 2.1 Remove Debug Code
```
Priority: HIGH
Time: 2-3 hours
Impact: Security & Performance
```

**Action Items:**
1. Remove/guard all console.log statements:
```typescript
// Replace:
console.log('Debug:', data);

// With:
if (import.meta.env.DEV) {
  console.log('Debug:', data);
}
```

2. Key files to clean:
- `src/lib/feature-flags.ts` (15+ console statements)
- `src/lib/analytics-engine.ts`
- `src/lib/env-validation.ts`
- `src/components/telehealth/*.tsx` (console.log in handlers)

3. Remove `window.aminyFlags` developer tools from production

#### 2.2 Environment Variable Security
```
Priority: CRITICAL
Time: 1 hour
Impact: Security
```

**Action Items:**
1. Remove hard-coded keys from `src/utils/supabase/info.tsx`
2. Replace with environment variable references
3. Add `.env.local` to `.gitignore` if not already
4. Create `.env.production` template without secrets
5. Document required environment variables

#### 2.3 Disable Mock Data Mode
```
Priority: CRITICAL
Time: 30 minutes
Impact: Use real data
```

**Action Items:**
1. In `.env.local`, change:
```bash
VITE_USE_MOCK_DATA=false
```

2. Verify all API endpoints work with real Supabase data
3. Seed production database with initial data

---

### Phase 3: Testing Foundation (Days 5-7)

#### 3.1 Critical Path Tests
```
Priority: HIGH
Time: 1-2 days
Impact: Deployment confidence
```

**What to Test (Minimum):**
1. **Authentication Flow:**
   - Sign up with email
   - Login with email
   - Password reset
   - Session persistence

2. **Subscription Flow:**
   - View pricing
   - Select tier
   - Complete checkout
   - Verify subscription active

3. **Booking Flow:**
   - Browse concerns
   - View providers
   - Select time slot
   - Complete payment
   - Receive confirmation

4. **Video Flow:**
   - Join video room
   - Audio/video toggle
   - Leave call

**Files to Create:**
- `src/__tests__/auth.test.ts`
- `src/__tests__/subscription.test.ts`
- `src/__tests__/booking.test.ts`
- `e2e/critical-flows.spec.ts`

#### 3.2 CI/CD Pipeline
```
Priority: MEDIUM
Time: 3-4 hours
Impact: Automated quality gates
```

**Create `.github/workflows/ci.yml`:**
```yaml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run lint
      - run: npm run type-check
      - run: npm run test
      - run: npm run build
```

---

### Phase 4: Monitoring & Analytics (Days 7-9)

#### 4.1 Error Monitoring
```
Priority: HIGH
Time: 2 hours
Impact: Know when things break
```

**Action Items:**
1. Create Sentry account at https://sentry.io
2. Get DSN from project settings
3. Update `.env.local`:
```bash
VITE_SENTRY_DSN=https://xxxx@sentry.io/yyyy
```

4. Verify Sentry integration in `src/lib/sentry.ts`

#### 4.2 Analytics Setup
```
Priority: MEDIUM
Time: 2 hours
Impact: Track user behavior
```

**Action Items:**
1. Create Google Analytics 4 property
2. Get Measurement ID (G-XXXXXXXXXX)
3. Update `.env.local`:
```bash
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

4. Define key events to track:
   - `sign_up_completed`
   - `subscription_started`
   - `visit_booked`
   - `video_session_joined`
   - `referral_packet_downloaded`

---

### Phase 5: Partner Integration Optimization (Days 9-12)

**This is where you make Aminy irresistible to Rise, AACT, Chimes, and Acumen.**

#### 5.1 White-Label Capabilities
```
Priority: HIGH for Partner Revenue
Time: 1 day
```

**Action Items:**
1. Create organization/partner configuration system
2. Allow custom branding (logo, colors)
3. Allow custom provider pools per organization
4. Allow custom pricing per organization

**Files to Create:**
- `src/types/organization.ts` - Partner/org data model
- `src/lib/organization-service.ts` - Org management
- `src/components/admin/OrganizationSettings.tsx` - Admin UI

#### 5.2 Provider Import/Export
```
Priority: HIGH for Rise/AACT
Time: 1 day
```

**What Partners Need:**
1. Bulk provider import (CSV/Excel)
2. Provider credentialing status tracking
3. License state management
4. Provider availability sync

**Value Proposition for Rise:**
> "Instead of building your own platform, use Aminy. We'll import all your BCBAs, SLPs, and OTs. Your families get immediate access to telehealth. You get a revenue share."

#### 5.3 Integration APIs
```
Priority: MEDIUM
Time: 1 day
```

**Create Partner API Endpoints:**
- `POST /api/partners/providers` - Add providers
- `GET /api/partners/sessions` - Get session data
- `GET /api/partners/families` - Get family data
- `GET /api/partners/reports` - Analytics

**Document in:**
- `docs/PARTNER_API.md` - API documentation
- `docs/INTEGRATION_GUIDE.md` - Setup guide

#### 5.4 Acumen Fiscal Agent Integration
```
Priority: HIGH for Revenue
Time: 1 day
```

**For self-directed families using Acumen:**
1. Generate Acumen-compatible invoices
2. Track service authorizations
3. Export billing data in required format
4. Support DCI/Acumen payment workflows

---

### Phase 6: Investor-Ready Polish (Days 12-14)

#### 6.1 Demo Mode
```
Priority: HIGH for Pitches
Time: 4 hours
```

**Create Investor Demo Flow:**
1. Pre-seeded demo account with rich data
2. Guided tour highlighting key features
3. Sample video session recording
4. Sample analytics dashboard

**Files to Create:**
- `src/lib/demo-mode.ts` - Demo data seeding
- `src/components/demo/DemoTour.tsx` - Guided walkthrough

#### 6.2 Metrics Dashboard
```
Priority: HIGH for Investors
Time: 1 day
```

**Create Admin Analytics showing:**
- Monthly Recurring Revenue (MRR)
- Active subscribers by tier
- Session completion rate
- Provider utilization
- Family satisfaction scores
- Churn rate

#### 6.3 Pitch Deck Assets
```
Priority: HIGH
Time: 4 hours
```

**Prepare:**
1. Feature screenshots (high-res)
2. User flow diagrams
3. Architecture diagram
4. Revenue projection model
5. Competitive analysis matrix

---

## Partner Value Propositions

### For Rise Services
> "Dr. Hans, you described wanting 'concierge-style clinical services integrated with therapy, alongside a subscription-based platform for parents.' Aminy is exactly that - built and ready. Instead of building from scratch, partner with us. Your BCBAs and therapists get immediate access to a world-class telehealth platform. Your families get 24/7 AI support, evidence-based playbooks, and seamless booking. You focus on what you do best - clinical excellence - while we handle the technology."

**Partnership Model:**
- Per-session revenue share
- White-labeled for Rise branding
- Bulk provider import
- Dedicated support

### For AACT/Rise Pediatric Therapies
> "Expand your reach beyond Arizona. With Aminy, your specialists can see families nationwide through telehealth. No geographic limits. Same quality care."

### For Chimes ID&D
> "Serve ID/DD families with specialized telehealth support. Parent coaching, behavior consultation, care coordination - all accessible from anywhere."

### For Acumen/DCI
> "Aminy integrates with self-directed funding models. Families using Acumen can easily book services and generate compliant invoices for reimbursement."

---

## Technical Architecture for Scale

```
┌─────────────────────────────────────────────────────────────────┐
│                         Aminy Platform                          │
├─────────────────────────────────────────────────────────────────┤
│  Frontend (React + Vite)                                        │
│  ├── Public App (families)                                      │
│  ├── Provider Portal                                            │
│  └── Admin Dashboard                                            │
├─────────────────────────────────────────────────────────────────┤
│  Backend (Supabase Edge Functions)                              │
│  ├── Authentication (Supabase Auth)                             │
│  ├── Database (PostgreSQL with RLS)                             │
│  ├── Realtime (Supabase Realtime)                              │
│  └── Storage (Supabase Storage)                                │
├─────────────────────────────────────────────────────────────────┤
│  Integrations                                                   │
│  ├── Stripe (Payments)                                          │
│  ├── Daily.co (Video)                                           │
│  ├── Anthropic (AI)                                             │
│  ├── Sentry (Monitoring)                                        │
│  └── Partner APIs (Rise, AACT, etc.)                           │
└─────────────────────────────────────────────────────────────────┘
```

---

## Investment Ask Context

### Traction Metrics to Show
1. **Product Completeness:** 100% of MVP features built
2. **Clinical Compliance:** 72-hour rule, consent controls, HIPAA-ready
3. **Partner Interest:** Rise Services actively seeking this solution
4. **Technical Foundation:** Modern stack, scalable architecture

### Use of Funds
1. **Go-to-Market:** Sales, marketing, partner onboarding
2. **Clinical Network:** Provider recruitment, credentialing
3. **Engineering:** Additional features, scale infrastructure
4. **Compliance:** HIPAA certification, SOC 2

---

## 10/10 Checklist

### Revenue Infrastructure
- [ ] Stripe production keys configured
- [ ] All 8 subscription prices created
- [ ] All 4 visit prices created
- [ ] Webhook handling verified
- [ ] Test transactions completed

### Video Infrastructure
- [ ] Daily.co production domain configured
- [ ] Recording enabled
- [ ] Room settings optimized
- [ ] Test calls verified

### AI Infrastructure
- [ ] Anthropic API key configured
- [ ] Rate limits set
- [ ] Error fallbacks working

### Security
- [ ] No hard-coded secrets in code
- [ ] Environment variables validated
- [ ] Console.logs removed/guarded
- [ ] HTTPS enforced
- [ ] RLS policies verified

### Testing
- [ ] Auth flow tested
- [ ] Subscription flow tested
- [ ] Booking flow tested
- [ ] Video flow tested
- [ ] CI pipeline running

### Monitoring
- [ ] Sentry configured
- [ ] Analytics configured
- [ ] Alerting set up

### Partner-Ready
- [ ] White-label configuration available
- [ ] Provider import working
- [ ] Partner API documented
- [ ] Acumen integration ready

### Investor-Ready
- [ ] Demo mode working
- [ ] Metrics dashboard live
- [ ] Pitch materials ready
- [ ] Architecture documented

---

## Summary

**Current State:** Aminy is a beautifully designed, feature-complete prototype with impressive clinical compliance. It demonstrates everything Dr. Hans described wanting.

**Gap:** The infrastructure to actually run it in production (payments, video, monitoring, testing) is not connected.

**Solution:** 2-3 weeks of focused work on the items above will transform this from a 5.5/10 demo into a 10/10 production-ready, revenue-generating platform that can:
1. Collect real subscription and visit payments
2. Run real video telehealth sessions
3. Scale to thousands of families
4. Report metrics to investors
5. Integrate with partners like Rise, AACT, Chimes, and Acumen

**The hard part is done.** The UI, the flows, the clinical logic - all built. Now it's about connecting the wires and hardening for production.

---

*Document created: January 15, 2026*
*Author: Claude Code + Aminy Engineering*
