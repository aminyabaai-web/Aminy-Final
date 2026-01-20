# Telehealth Production Setup Guide

This guide walks you through setting up all external services required for the Aminy telehealth feature.

## Table of Contents

1. [Supabase Setup](#1-supabase-setup)
2. [Stripe Setup](#2-stripe-setup)
3. [Daily.co Video Setup](#3-dailyco-video-setup)
4. [SendGrid Email Setup](#4-sendgrid-email-setup)
5. [Twilio SMS Setup](#5-twilio-sms-setup)
6. [Deploying Edge Functions](#6-deploying-edge-functions)
7. [Testing the Integration](#7-testing-the-integration)

---

## 1. Supabase Setup

### 1.1 Create/Access Your Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Create a new project or use your existing one
3. Note your **Project URL** and **Anon Key** from Settings > API

### 1.2 Run Database Migrations

1. Go to **SQL Editor** in your Supabase dashboard
2. Open the file `supabase/migrations/001_telehealth_schema.sql`
3. Copy the entire contents and paste into the SQL Editor
4. Click **Run** to execute the migration

This creates all required tables:
- `providers` - Healthcare provider profiles
- `provider_availability` - Provider schedules
- `appointments` - Booked appointments
- `payments` - Payment records
- `visit_summaries` - Post-visit documentation
- `action_items` - Patient to-dos
- `scheduled_reminders` - Email/SMS reminder queue
- `slot_holds` - Temporary slot reservations
- `waitlist` - Waitlist entries

### 1.3 Configure Environment Variables

Add to your `.env.local`:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

---

## 2. Stripe Setup

### 2.1 Create Stripe Account

1. Go to [stripe.com](https://stripe.com) and create an account
2. Complete business verification (required for live payments)

### 2.2 Get API Keys

1. Go to **Developers > API Keys**
2. Copy your **Publishable key** (starts with `pk_test_` or `pk_live_`)
3. Copy your **Secret key** (starts with `sk_test_` or `sk_live_`)

### 2.3 Configure Products (Optional)

Create products for your visit types in Stripe Dashboard:

1. Go to **Products > Add Product**
2. Create products:
   - **25-minute Consult** - $75.00
   - **50-minute Session** - $125.00
   - **15-minute Follow-up** - $50.00

### 2.4 Set Up Webhooks

1. Go to **Developers > Webhooks > Add endpoint**
2. Endpoint URL: `https://YOUR_PROJECT_ID.supabase.co/functions/v1/telehealth/payments/webhook`
3. Select events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.refunded`
4. Copy the **Webhook signing secret** (starts with `whsec_`)

### 2.5 Configure Environment Variables

Add to your `.env.local`:

```env
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_KEY_HERE
```

Add to Supabase Edge Function secrets (see Section 6):

```
STRIPE_SECRET_KEY=sk_test_YOUR_KEY_HERE
STRIPE_WEBHOOK_SECRET=whsec_YOUR_SECRET_HERE
```

---

## 3. Daily.co Video Setup

### 3.1 Create Daily.co Account

1. Go to [daily.co](https://daily.co) and sign up
2. Create a new domain (e.g., `aminy-health`)

### 3.2 Get API Key

1. Go to **Developers** in your Daily dashboard
2. Copy your **API Key**

### 3.3 Configure Room Settings (Optional)

In Daily dashboard, set default room properties:

- **Privacy**: Private (requires token to join)
- **Recording**: Enable if needed for compliance
- **Max participants**: 2 (provider + patient)
- **Enable chat**: Yes
- **Enable screen share**: Yes

### 3.4 Configure Environment Variables

Add to your `.env.local`:

```env
VITE_DAILY_DOMAIN=your-domain.daily.co
```

Add to Supabase Edge Function secrets:

```
DAILY_API_KEY=your_daily_api_key_here
```

---

## 4. SendGrid Email Setup

### 4.1 Create SendGrid Account

1. Go to [sendgrid.com](https://sendgrid.com) and sign up
2. Complete sender verification

### 4.2 Verify Sender Domain

1. Go to **Settings > Sender Authentication**
2. Add and verify your domain (recommended) or single sender email

### 4.3 Create API Key

1. Go to **Settings > API Keys > Create API Key**
2. Give it a name like "Aminy Telehealth"
3. Select **Restricted Access**
4. Enable **Mail Send > Full Access**
5. Copy the API key (shown only once!)

### 4.4 Create Email Templates (Optional)

Create dynamic templates in SendGrid for:

- **Appointment Confirmation** - Template ID: `d-xxxxx`
- **Appointment Reminder (24h)** - Template ID: `d-xxxxx`
- **Appointment Reminder (1h)** - Template ID: `d-xxxxx`
- **Appointment Cancelled** - Template ID: `d-xxxxx`

### 4.5 Configure Environment Variables

Add to Supabase Edge Function secrets:

```
SENDGRID_API_KEY=SG.your_api_key_here
SENDGRID_FROM_EMAIL=care@yourdomain.com
```

---

## 5. Twilio SMS Setup

### 5.1 Create Twilio Account

1. Go to [twilio.com](https://twilio.com) and sign up
2. Complete account verification

### 5.2 Get a Phone Number

1. Go to **Phone Numbers > Manage > Buy a number**
2. Select a number with SMS capability
3. Note the phone number (e.g., +1234567890)

### 5.3 Get API Credentials

1. Go to your Twilio Console dashboard
2. Copy your **Account SID** (starts with `AC`)
3. Copy your **Auth Token**

### 5.4 Configure Messaging Service (Optional)

For better deliverability:

1. Go to **Messaging > Services > Create Messaging Service**
2. Add your phone number to the service
3. Note the **Messaging Service SID** (starts with `MG`)

### 5.5 Configure Environment Variables

Add to Supabase Edge Function secrets:

```
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890
```

---

## 6. Deploying Edge Functions

### 6.1 Install Supabase CLI

```bash
npm install -g supabase
```

### 6.2 Login and Link Project

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_ID
```

### 6.3 Set Edge Function Secrets

```bash
# Stripe
supabase secrets set STRIPE_SECRET_KEY=sk_test_YOUR_KEY
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_YOUR_SECRET

# Daily.co
supabase secrets set DAILY_API_KEY=your_daily_api_key

# SendGrid
supabase secrets set SENDGRID_API_KEY=SG.your_key
supabase secrets set SENDGRID_FROM_EMAIL=care@yourdomain.com

# Twilio
supabase secrets set TWILIO_ACCOUNT_SID=ACxxxxx
supabase secrets set TWILIO_AUTH_TOKEN=your_token
supabase secrets set TWILIO_PHONE_NUMBER=+1234567890
```

### 6.4 Deploy Edge Functions

```bash
supabase functions deploy telehealth
```

### 6.5 Verify Deployment

Test the endpoint:

```bash
curl https://YOUR_PROJECT_ID.supabase.co/functions/v1/telehealth/providers
```

---

## 7. Testing the Integration

### 7.1 Test Mode Checklist

Before going live, test each integration:

- [ ] **Stripe**: Use test card `4242 4242 4242 4242`
- [ ] **Daily.co**: Create a test video room and join
- [ ] **SendGrid**: Send a test email
- [ ] **Twilio**: Send a test SMS

### 7.2 Test Appointment Flow

1. Select a concern and complete intake
2. Choose a provider and time slot
3. Complete payment (use test card)
4. Verify:
   - Appointment created in database
   - Confirmation email sent
   - Video room created
   - Calendar event downloadable

### 7.3 Test Video Call

1. Join as patient from appointment confirmation
2. Open provider portal and join as provider
3. Test:
   - Audio/video toggle
   - Screen sharing
   - End call flow

### 7.4 Going Live Checklist

- [ ] Switch Stripe to live keys
- [ ] Verify SendGrid domain authentication
- [ ] Test SMS with real phone number
- [ ] Review Daily.co room settings
- [ ] Enable Supabase RLS policies
- [ ] Set up error monitoring (Sentry, etc.)

---

## Environment Variables Summary

### Frontend (.env.local)

```env
# Supabase
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key

# Stripe (public key only)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx

# Daily.co
VITE_DAILY_DOMAIN=your-domain.daily.co

# Development mode
VITE_USE_MOCK_DATA=false
```

### Supabase Edge Function Secrets

```bash
# Stripe
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# Daily.co
DAILY_API_KEY=xxxxx

# SendGrid
SENDGRID_API_KEY=SG.xxxxx
SENDGRID_FROM_EMAIL=care@yourdomain.com

# Twilio
TWILIO_ACCOUNT_SID=ACxxxxx
TWILIO_AUTH_TOKEN=xxxxx
TWILIO_PHONE_NUMBER=+1234567890
```

---

## Troubleshooting

### Common Issues

**Stripe payments failing:**
- Check webhook signing secret matches
- Verify API key is correct (test vs live)
- Check Stripe dashboard for error details

**Video calls not connecting:**
- Verify Daily.co API key is set
- Check room was created successfully
- Ensure participant has camera/mic permissions

**Emails not sending:**
- Check SendGrid API key permissions
- Verify sender email/domain is authenticated
- Check SendGrid activity feed for bounces

**SMS not delivering:**
- Verify Twilio phone number has SMS capability
- Check Twilio logs for delivery status
- Ensure recipient number format is correct (+1...)

### Getting Help

- Stripe: [stripe.com/docs](https://stripe.com/docs)
- Daily.co: [docs.daily.co](https://docs.daily.co)
- SendGrid: [docs.sendgrid.com](https://docs.sendgrid.com)
- Twilio: [twilio.com/docs](https://twilio.com/docs)
- Supabase: [supabase.com/docs](https://supabase.com/docs)
