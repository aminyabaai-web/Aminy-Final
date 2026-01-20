# External Services Setup Guide

**Last Updated:** January 15, 2026

This guide walks you through setting up all external services required to run Aminy in production. Complete these in order.

---

## 1. Stripe Setup (Payments)

### 1.1 Create Stripe Account
1. Go to https://dashboard.stripe.com/register
2. Complete business verification
3. Activate your account (required for live payments)

### 1.2 Get API Keys
1. Go to **Developers > API keys**
2. Copy your **Publishable key** (starts with `pk_live_`)
3. Copy your **Secret key** (starts with `sk_live_`)

### 1.3 Create Subscription Products

Go to **Product catalog > Products > + Add product**

| Product Name | Monthly Price | Annual Price |
|--------------|--------------|--------------|
| Aminy Starter | $9/month | $79/year (save $29) |
| Aminy Core | $29/month | $249/year (save $99) |
| Aminy Pro | $79/month | $699/year (save $249) |
| Aminy Pro Plus | $149/month | $1,299/year (save $489) |

**For each product:**
1. Click **+ Add product**
2. Enter name (e.g., "Aminy Starter")
3. Add description
4. Under **Pricing**, add both monthly and annual prices
5. Set billing period (monthly or yearly)
6. Click **Save product**
7. **IMPORTANT:** Copy the Price ID (starts with `price_`) for each price

### 1.4 Create Visit Products

| Product Name | Price | Description |
|--------------|-------|-------------|
| Initial Consultation | $149 | 60-minute initial telehealth visit |
| Follow-up Visit | $99 | 30-minute follow-up visit |
| Emergency Consultation | $199 | Same-day urgent consultation |
| Extended Session | $199 | 90-minute extended visit |

### 1.5 Set Up Webhooks

1. Go to **Developers > Webhooks**
2. Click **+ Add endpoint**
3. Enter endpoint URL: `https://YOUR-DOMAIN.com/api/webhooks/stripe`
4. Select events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
5. Click **Add endpoint**
6. Copy the **Signing secret** (starts with `whsec_`)

### 1.6 Update Environment Variables

Add to your `.env.local`:

```bash
# Stripe Configuration
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxxxxxxxxxxx
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxx

# Subscription Price IDs
VITE_PRICE_STARTER_MONTHLY=price_xxxxxxxxxxxxxxxxxxxxx
VITE_PRICE_STARTER_ANNUAL=price_xxxxxxxxxxxxxxxxxxxxx
VITE_PRICE_CORE_MONTHLY=price_xxxxxxxxxxxxxxxxxxxxx
VITE_PRICE_CORE_ANNUAL=price_xxxxxxxxxxxxxxxxxxxxx
VITE_PRICE_PRO_MONTHLY=price_xxxxxxxxxxxxxxxxxxxxx
VITE_PRICE_PRO_ANNUAL=price_xxxxxxxxxxxxxxxxxxxxx
VITE_PRICE_PROPLUS_MONTHLY=price_xxxxxxxxxxxxxxxxxxxxx
VITE_PRICE_PROPLUS_ANNUAL=price_xxxxxxxxxxxxxxxxxxxxx

# Visit Price IDs
VITE_PRICE_INITIAL_CONSULT=price_xxxxxxxxxxxxxxxxxxxxx
VITE_PRICE_FOLLOWUP=price_xxxxxxxxxxxxxxxxxxxxx
VITE_PRICE_EMERGENCY=price_xxxxxxxxxxxxxxxxxxxxx
VITE_PRICE_EXTENDED=price_xxxxxxxxxxxxxxxxxxxxx
```

### 1.7 Test the Integration

1. Use Stripe test mode first (with `pk_test_` keys)
2. Test card: `4242 4242 4242 4242`, any future date, any CVC
3. Complete a test subscription
4. Verify webhook received in Stripe dashboard
5. Switch to live keys when ready

---

## 2. Daily.co Setup (Video)

### 2.1 Create Daily.co Account
1. Go to https://www.daily.co/
2. Sign up for an account
3. Verify your email

### 2.2 Get API Credentials
1. Go to **Developers > API Keys**
2. Copy your **API Key**
3. Note your **Domain** (e.g., `your-workspace.daily.co`)

### 2.3 Configure Room Settings

Go to **Rooms > Room settings** and configure:

| Setting | Value |
|---------|-------|
| Max participants | 2 |
| Enable waiting room | Yes |
| Enable recording | Yes (for HIPAA compliance) |
| Recording type | Cloud |
| Room expiration | 2 hours |
| Enable chat | Yes |
| Enable screen share | Yes |

### 2.4 HIPAA Compliance (Optional but Recommended)

1. Contact Daily.co for HIPAA BAA
2. Enable encrypted recordings
3. Configure secure storage region

### 2.5 Update Environment Variables

Add to your `.env.local`:

```bash
# Daily.co Configuration
VITE_DAILY_DOMAIN=your-workspace.daily.co
DAILY_API_KEY=xxxxxxxxxxxxxxxxxxxxx
```

### 2.6 Test the Integration

1. Run the app locally
2. Create a test appointment
3. Click "Join Video Call"
4. Verify camera/microphone access
5. Test screen sharing
6. Leave call and verify cleanup

---

## 3. Supabase Setup (Database & Auth)

### 3.1 Create Supabase Project
1. Go to https://supabase.com/
2. Create new project
3. Choose region closest to your users
4. Set a strong database password

### 3.2 Get API Credentials
1. Go to **Settings > API**
2. Copy **Project URL** (e.g., `https://xxxxx.supabase.co`)
3. Copy **anon/public** key
4. Copy **service_role** key (for server-side)

### 3.3 Run Database Schema

1. Go to **SQL Editor**
2. Paste the schema from `docs/SUPABASE_SETUP.md`
3. Run the SQL

### 3.4 Configure Authentication

1. Go to **Authentication > Providers**
2. Enable **Email** (already enabled by default)
3. Configure email templates:
   - Confirmation email
   - Password reset email
   - Magic link email

4. Go to **Authentication > URL Configuration**
5. Add your production URL to **Site URL**
6. Add redirect URLs:
   - `https://your-domain.com/auth/callback`
   - `https://your-domain.com/reset-password`

### 3.5 Set Up Row Level Security (RLS)

```sql
-- Users can only see their own profiles
CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (auth.uid() = id);

-- Users can only see their own appointments
CREATE POLICY "Users can view own appointments"
ON appointments FOR SELECT
USING (auth.uid() = user_id);

-- Users can only see their own subscriptions
CREATE POLICY "Users can view own subscription"
ON subscriptions FOR SELECT
USING (auth.uid() = user_id);
```

### 3.6 Deploy Edge Functions

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link to project
supabase link --project-ref your-project-ref

# Deploy functions
supabase functions deploy
```

### 3.7 Update Environment Variables

Add to your `.env.local`:

```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxxxxxxxxxxxx
SUPABASE_SERVICE_ROLE_KEY=eyJxxxxxxxxxxxxx
```

---

## 4. Anthropic Setup (AI)

### 4.1 Create Anthropic Account
1. Go to https://console.anthropic.com/
2. Create account or sign in
3. Add payment method

### 4.2 Get API Key
1. Go to **API Keys**
2. Create new API key
3. Copy the key (starts with `sk-ant-`)

### 4.3 Set Usage Limits

1. Go to **Usage**
2. Set monthly spending limit (e.g., $100/month initially)
3. Set up alerts at 50%, 80%, 100% of limit

### 4.4 Update Environment Variables

Add to your `.env.local`:

```bash
# Anthropic Configuration
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxxx
```

---

## 5. Sentry Setup (Error Monitoring)

### 5.1 Create Sentry Account
1. Go to https://sentry.io/
2. Create account
3. Create new project (select "React" as platform)

### 5.2 Get DSN
1. Go to **Settings > Projects > Your Project > Client Keys (DSN)**
2. Copy the DSN URL

### 5.3 Update Environment Variables

Add to your `.env.local`:

```bash
# Sentry Configuration
VITE_SENTRY_DSN=https://xxxxx@sentry.io/xxxxx
```

---

## 6. Google Analytics Setup (Analytics)

### 6.1 Create GA4 Property
1. Go to https://analytics.google.com/
2. Create new property
3. Select "Web" as platform
4. Enter your website URL

### 6.2 Get Measurement ID
1. Go to **Admin > Data Streams > Your Stream**
2. Copy the **Measurement ID** (starts with `G-`)

### 6.3 Update Environment Variables

Add to your `.env.local`:

```bash
# Google Analytics Configuration
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

---

## Complete .env.local Template

```bash
# ===========================================
# AMINY PRODUCTION ENVIRONMENT CONFIGURATION
# ===========================================

# App Settings
VITE_APP_NAME=Aminy
VITE_APP_URL=https://your-domain.com
VITE_USE_MOCK_DATA=false

# Supabase
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxxxxxxxxxxxx
SUPABASE_SERVICE_ROLE_KEY=eyJxxxxxxxxxxxxx

# Stripe
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxxx
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx

# Stripe Subscription Prices
VITE_PRICE_STARTER_MONTHLY=price_xxxxxxxxxxxxx
VITE_PRICE_STARTER_ANNUAL=price_xxxxxxxxxxxxx
VITE_PRICE_CORE_MONTHLY=price_xxxxxxxxxxxxx
VITE_PRICE_CORE_ANNUAL=price_xxxxxxxxxxxxx
VITE_PRICE_PRO_MONTHLY=price_xxxxxxxxxxxxx
VITE_PRICE_PRO_ANNUAL=price_xxxxxxxxxxxxx
VITE_PRICE_PROPLUS_MONTHLY=price_xxxxxxxxxxxxx
VITE_PRICE_PROPLUS_ANNUAL=price_xxxxxxxxxxxxx

# Stripe Visit Prices
VITE_PRICE_INITIAL_CONSULT=price_xxxxxxxxxxxxx
VITE_PRICE_FOLLOWUP=price_xxxxxxxxxxxxx
VITE_PRICE_EMERGENCY=price_xxxxxxxxxxxxx
VITE_PRICE_EXTENDED=price_xxxxxxxxxxxxx

# Daily.co Video
VITE_DAILY_DOMAIN=your-workspace.daily.co
DAILY_API_KEY=xxxxxxxxxxxxx

# Anthropic AI
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxx

# Sentry Error Monitoring
VITE_SENTRY_DSN=https://xxxxx@sentry.io/xxxxx

# Google Analytics
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

---

## Verification Checklist

After setting up all services, verify each integration:

### Stripe
- [ ] Can view pricing page with real prices
- [ ] Can complete test checkout
- [ ] Webhook events received in Stripe dashboard
- [ ] Subscription appears in database

### Daily.co
- [ ] Can create video room
- [ ] Can join video call
- [ ] Camera/microphone work
- [ ] Can leave call without errors

### Supabase
- [ ] Can sign up new user
- [ ] Can log in
- [ ] User data saved to database
- [ ] RLS policies working

### Anthropic
- [ ] Aminy AI chat responds
- [ ] Visit summaries generate
- [ ] No rate limit errors

### Sentry
- [ ] Test error appears in Sentry dashboard
- [ ] Source maps uploaded
- [ ] Alerts configured

### Google Analytics
- [ ] Page views tracking
- [ ] Events firing
- [ ] User properties set

---

## Troubleshooting

### Stripe webhook not receiving events
1. Check endpoint URL is correct
2. Verify webhook secret matches
3. Check Stripe dashboard for delivery attempts
4. Ensure HTTPS on production

### Daily.co video not working
1. Check browser permissions for camera/microphone
2. Verify Daily.co domain is correct
3. Check browser console for errors
4. Ensure API key has correct permissions

### Supabase auth failing
1. Check site URL configuration
2. Verify redirect URLs
3. Check RLS policies
4. Review Supabase logs

### AI not responding
1. Verify API key is valid
2. Check usage limits
3. Review error logs in Sentry
4. Test API key directly with curl

---

*Setup guide created: January 15, 2026*
