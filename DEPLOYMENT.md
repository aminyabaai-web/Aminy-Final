# Aminy MVP Deployment Guide

This guide covers all the configuration needed to deploy Aminy in production.

## Quick Start Checklist

- [ ] Set Supabase Edge Function secrets
- [ ] Configure Stripe webhook
- [ ] Set up Google OAuth
- [ ] Set up Apple OAuth
- [ ] Configure Daily.co (optional for video)
- [ ] Configure Sentry for error tracking
- [ ] Set environment variables
- [ ] Run database migrations

---

## 1. Supabase Configuration

### 1.1 Edge Function Secrets

Go to **Supabase Dashboard → Edge Functions → Secrets** and add:

```
STRIPE_SECRET_KEY=sk_live_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
ANTHROPIC_API_KEY=sk-ant-xxxxx
RESEND_API_KEY=re_xxxxx
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxxxx
```

### 1.2 Database Setup

Run the migrations in Supabase SQL Editor:

1. `supabase/migrations/001_telehealth_schema.sql` (if using telehealth)
2. `supabase/migrations/002_profiles_and_stripe.sql` (required)

**Important:** If you already ran these, skip this step.

### 1.3 Auth Providers

#### Google OAuth
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create OAuth 2.0 credentials
3. Add authorized redirect URI: `https://[YOUR-PROJECT].supabase.co/auth/v1/callback`
4. In Supabase: **Authentication → Providers → Google** → Add Client ID & Secret

#### Apple OAuth
1. Go to [Apple Developer](https://developer.apple.com)
2. Create Service ID for Sign in with Apple
3. Configure domain: `[YOUR-PROJECT].supabase.co`
4. Return URL: `https://[YOUR-PROJECT].supabase.co/auth/v1/callback`
5. In Supabase: **Authentication → Providers → Apple** → Add credentials

---

## 2. Stripe Configuration

### 2.1 Create Products

In [Stripe Dashboard](https://dashboard.stripe.com/products), create:

| Product | Monthly Price ID | Annual Price ID |
|---------|------------------|-----------------|
| Starter | `price_xxx` | `price_xxx` |
| Core | `price_xxx` | `price_xxx` |
| Pro | `price_xxx` | `price_xxx` |
| Pro Plus | `price_xxx` | `price_xxx` |

### 2.2 Configure Webhook

1. Go to **Stripe Dashboard → Developers → Webhooks**
2. Add endpoint: `https://[YOUR-PROJECT].supabase.co/functions/v1/make-server-8a022548/payments/webhook`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Copy the webhook signing secret to Supabase secrets

---

## 3. Environment Variables

### 3.1 Frontend (.env.local)

Create `.env.local` in the project root:

```env
# Supabase
VITE_SUPABASE_URL=https://[YOUR-PROJECT].supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxxxx

# Stripe (publishable key only - secret goes in Supabase)
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx

# Stripe Price IDs
VITE_PRICE_STARTER_MONTHLY=price_xxxxx
VITE_PRICE_STARTER_ANNUAL=price_xxxxx
VITE_PRICE_CORE_MONTHLY=price_xxxxx
VITE_PRICE_CORE_ANNUAL=price_xxxxx
VITE_PRICE_PRO_MONTHLY=price_xxxxx
VITE_PRICE_PRO_ANNUAL=price_xxxxx
VITE_PRICE_PROPLUS_MONTHLY=price_xxxxx
VITE_PRICE_PROPLUS_ANNUAL=price_xxxxx

# Video Calls (Daily.co)
VITE_DAILY_DOMAIN=aminy

# Error Tracking
VITE_SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx

# Analytics
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX

# App Info
VITE_APP_VERSION=1.0.0
VITE_APP_ENV=production
```

### 3.2 Vercel Environment Variables

If deploying to Vercel, add all VITE_* variables in:
**Project Settings → Environment Variables**

---

## 4. Daily.co Video Configuration (Optional)

1. Create account at [Daily.co](https://daily.co)
2. Create a domain (e.g., `aminy`)
3. Get API key from Dashboard
4. Add to environment: `VITE_DAILY_DOMAIN=aminy`
5. For server-side room creation, add to Supabase secrets: `DAILY_API_KEY=xxxxx`

---

## 5. Sentry Error Tracking

1. Create project at [Sentry](https://sentry.io)
2. Get DSN from **Project Settings → Client Keys**
3. Add to environment: `VITE_SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx`

---

## 6. Email Configuration (Resend)

1. Create account at [Resend](https://resend.com)
2. Add and verify your domain
3. Get API key
4. Add to Supabase secrets: `RESEND_API_KEY=re_xxxxx`

---

## 7. Security Headers

For Vercel deployment, create `vercel.json`:

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "SAMEORIGIN"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        },
        {
          "key": "Strict-Transport-Security",
          "value": "max-age=31536000; includeSubDomains"
        }
      ]
    }
  ]
}
```

---

## 8. Build and Deploy

### Local Build
```bash
npm install
npm run build
```

### Vercel Deployment
```bash
vercel --prod
```

### Manual Deployment
Upload the `build/` directory to your hosting provider.

---

## 9. Post-Deployment Verification

### Test Auth Flow
- [ ] Create new account
- [ ] Verify email confirmation
- [ ] Login with email/password
- [ ] Test password reset
- [ ] Test Google OAuth
- [ ] Test Apple OAuth

### Test Payments
- [ ] Start subscription checkout
- [ ] Complete test payment (card: 4242424242424242)
- [ ] Verify tier updated in profile
- [ ] Test customer portal access
- [ ] Test subscription cancellation

### Test AI Chat
- [ ] Send message as free user
- [ ] Verify rate limit enforced
- [ ] Verify paywall shown at limit

### Test Video (if configured)
- [ ] Start video session
- [ ] Verify camera/mic access
- [ ] Test connection quality

---

## 10. Monitoring

### Sentry Dashboard
Monitor for:
- JavaScript errors
- API failures
- Performance issues

### Stripe Dashboard
Monitor for:
- Failed payments
- Subscription churn
- Disputed charges

### Supabase Dashboard
Monitor for:
- Database usage
- Edge function invocations
- Auth metrics

---

## Troubleshooting

### Common Issues

**"Invalid API key"**
- Verify Supabase secrets are set correctly
- Check that keys match environment (test vs live)

**Webhook not firing**
- Verify webhook URL is correct
- Check Stripe webhook logs for errors
- Ensure webhook secret matches

**OAuth not working**
- Verify redirect URLs match exactly
- Check browser console for errors
- Ensure provider is enabled in Supabase

**Video not connecting**
- Verify Daily.co domain is correct
- Check browser permissions for camera/mic
- Ensure HTTPS is used (required for WebRTC)

---

## Support

For issues:
1. Check Sentry for error details
2. Review Supabase logs
3. Check Stripe webhook logs
4. Contact support with error details
