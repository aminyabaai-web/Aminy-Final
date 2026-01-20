# Stripe Setup Guide for Aminy

## Step 1: Create a Stripe Account

1. Go to [https://dashboard.stripe.com/register](https://dashboard.stripe.com/register)
2. Create an account (or sign in)
3. Complete business verification (required for production)

## Step 2: Get Your API Keys

1. Go to [https://dashboard.stripe.com/apikeys](https://dashboard.stripe.com/apikeys)
2. You'll see two sets of keys:
   - **Test mode** (for development) - use these first
   - **Live mode** (for production) - use when ready to charge real cards

3. Copy to your `.env` file:

```bash
# Test mode keys (for development)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...

# Live mode keys (for production - get when ready)
# VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
# STRIPE_SECRET_KEY=sk_live_...
```

## Step 3: Create Products and Prices

### Option A: Use Stripe Dashboard (Recommended for MVP)

1. Go to [Products](https://dashboard.stripe.com/test/products)
2. Click **+ Add product** for each tier:

#### Free Tier (no product needed - handled in code)

#### Starter Tier
- **Name**: Aminy Starter
- **Description**: Build daily habits with your AI companion
- Click **Add product**
- Then **Add price**:
  - Monthly: $4.99/month (Recurring)
  - Annual: $47.88/year (Recurring) - ~$4/mo

#### Core Tier
- **Name**: Aminy Core
- **Description**: The full companion experience
- Click **Add product**
- Then **Add price**:
  - Monthly: $9.99/month (Recurring)
  - Annual: $95.88/year (Recurring) - ~$8/mo

#### Pro Tier
- **Name**: Aminy Pro
- **Description**: Expert-level support with telehealth
- Click **Add product**
- Then **Add price**:
  - Monthly: $19.99/month (Recurring)
  - Annual: $191.88/year (Recurring) - ~$16/mo

3. Copy each **Price ID** (starts with `price_`) to your `.env`:

```bash
VITE_STRIPE_STARTER_MONTHLY=price_1ABC...
VITE_STRIPE_STARTER_ANNUAL=price_1DEF...
VITE_STRIPE_CORE_MONTHLY=price_1GHI...
VITE_STRIPE_CORE_ANNUAL=price_1JKL...
VITE_STRIPE_PRO_MONTHLY=price_1MNO...
VITE_STRIPE_PRO_ANNUAL=price_1PQR...
```

### Option B: Use Stripe CLI (for automation)

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Create products and prices
stripe products create \
  --name="Aminy Starter" \
  --description="Build daily habits"

stripe prices create \
  --product=prod_XXX \
  --unit-amount=499 \
  --currency=usd \
  --recurring[interval]=month

# Repeat for other tiers...
```

## Step 4: Set Up Webhooks

Webhooks notify your app when payments succeed, fail, or subscriptions change.

### For Development (Local Testing)

1. Install Stripe CLI:
```bash
brew install stripe/stripe-cli/stripe
```

2. Login and forward webhooks:
```bash
stripe login
stripe listen --forward-to localhost:54321/functions/v1/make-server-8a022548/payments/webhook
```

3. Copy the webhook signing secret (shown in terminal) to `.env`:
```bash
STRIPE_WEBHOOK_SECRET=whsec_...
```

### For Production

1. Go to [Webhooks](https://dashboard.stripe.com/webhooks)
2. Click **+ Add endpoint**
3. Enter your endpoint URL:
   ```
   https://YOUR_PROJECT_ID.supabase.co/functions/v1/make-server-8a022548/payments/webhook
   ```
4. Select events to listen to:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Click **Add endpoint**
6. Copy the **Signing secret** to your Supabase secrets

## Step 5: Configure Customer Portal

The Customer Portal lets users manage their subscriptions.

1. Go to [Customer Portal Settings](https://dashboard.stripe.com/test/settings/billing/portal)
2. Enable features:
   - ✅ Update payment method
   - ✅ View invoice history
   - ✅ Cancel subscription
   - ✅ Switch plans (optional)
3. Customize branding:
   - Add your logo
   - Set brand colors
   - Customize messages
4. Click **Save**

## Step 6: Add Secrets to Supabase

1. Go to Supabase Dashboard → **Settings** → **Edge Functions**
2. Click **Manage secrets**
3. Add:
   - `STRIPE_SECRET_KEY` = your sk_test_... or sk_live_...
   - `STRIPE_WEBHOOK_SECRET` = your whsec_...

## Step 7: Test the Integration

### Test Cards

Use these test card numbers:

| Card | Number | Result |
|------|--------|--------|
| Success | `4242 4242 4242 4242` | Payment succeeds |
| Declined | `4000 0000 0000 0002` | Payment declined |
| Requires Auth | `4000 0025 0000 3155` | 3D Secure required |
| Insufficient Funds | `4000 0000 0000 9995` | Insufficient funds |

- **Expiry**: Any future date (e.g., 12/34)
- **CVC**: Any 3 digits (e.g., 123)
- **ZIP**: Any 5 digits (e.g., 12345)

### Testing Flow

1. Start your app: `npm run dev`
2. Go to Paywall screen
3. Select a tier
4. Enter test card: `4242 4242 4242 4242`
5. Complete checkout
6. Verify:
   - Redirected to success page
   - Subscription shows in Stripe Dashboard
   - User tier updated in app

## Step 8: Go Live Checklist

Before accepting real payments:

- [ ] Business verification completed in Stripe
- [ ] Tax settings configured (Stripe Tax or manual)
- [ ] Payout schedule set up
- [ ] Live API keys obtained
- [ ] Webhook endpoint updated to production URL
- [ ] Customer Portal branding complete
- [ ] Receipt emails customized
- [ ] Refund policy documented
- [ ] Terms of Service updated

## Troubleshooting

### "No such price" error
- Verify price IDs in `.env` match Stripe Dashboard
- Make sure you're using test mode keys with test mode prices

### Webhook not receiving events
- Check Stripe Dashboard → Webhooks → Logs
- Verify endpoint URL is correct
- Check signing secret matches

### "Invalid API key"
- Ensure no extra spaces in `.env`
- Verify you're using the correct mode (test vs live)

### Payment succeeds but user tier not updated
- Check webhook handler in Edge Function
- Verify `checkout.session.completed` event is being received
- Check Supabase logs for errors

## Stripe Dashboard Quick Links

- [API Keys](https://dashboard.stripe.com/apikeys)
- [Products](https://dashboard.stripe.com/products)
- [Customers](https://dashboard.stripe.com/customers)
- [Subscriptions](https://dashboard.stripe.com/subscriptions)
- [Webhooks](https://dashboard.stripe.com/webhooks)
- [Webhook Logs](https://dashboard.stripe.com/webhooks/logs)
- [Customer Portal](https://dashboard.stripe.com/settings/billing/portal)
- [Test Clocks](https://dashboard.stripe.com/test-clocks) (for testing subscription lifecycle)
