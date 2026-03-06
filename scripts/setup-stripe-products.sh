#!/bin/bash
# =============================================================================
# Stripe Product & Price Setup for Aminy
# =============================================================================
# This script creates all subscription products and prices in Stripe.
# Run once, then copy the output price IDs to your env configuration.
#
# Usage: STRIPE_SECRET_KEY=sk_live_xxx bash scripts/setup-stripe-products.sh
# =============================================================================

set -euo pipefail

STRIPE_KEY="${STRIPE_SECRET_KEY:?Please set STRIPE_SECRET_KEY}"
API="https://api.stripe.com/v1"

stripe_post() {
  local endpoint="$1"
  shift
  curl -s -X POST "$API$endpoint" \
    -u "$STRIPE_KEY:" \
    "$@"
}

get_id() {
  echo "$1" | python3 -c "import json,sys; print(json.load(sys.stdin)['id'])"
}

echo "=== Creating Aminy Stripe Products & Prices ==="
echo ""

# --- Core Subscription ($14.99/mo, $129/yr) ---
echo "Creating Core product..."
CORE_PRODUCT=$(stripe_post /products \
  -d "name=Aminy Core" \
  -d "description=50 messages/day, 90-day memory, clinical documents, screening tools" \
  -d "metadata[tier]=core")
CORE_PID=$(get_id "$CORE_PRODUCT")
echo "  Product: $CORE_PID"

CORE_MO=$(stripe_post /prices \
  -d "product=$CORE_PID" \
  -d "unit_amount=1499" \
  -d "currency=usd" \
  -d "recurring[interval]=month" \
  -d "metadata[tier]=core" \
  -d "metadata[interval]=monthly")
CORE_MO_ID=$(get_id "$CORE_MO")
echo "  Monthly: $CORE_MO_ID ($14.99/mo)"

CORE_YR=$(stripe_post /prices \
  -d "product=$CORE_PID" \
  -d "unit_amount=12900" \
  -d "currency=usd" \
  -d "recurring[interval]=year" \
  -d "metadata[tier]=core" \
  -d "metadata[interval]=annual")
CORE_YR_ID=$(get_id "$CORE_YR")
echo "  Annual:  $CORE_YR_ID ($129/yr)"

# --- Pro Subscription ($29.99/mo, $279/yr) ---
echo ""
echo "Creating Pro product..."
PRO_PRODUCT=$(stripe_post /products \
  -d "name=Aminy Pro" \
  -d "description=150 messages/day, unlimited memory, telehealth access, provider matching" \
  -d "metadata[tier]=pro")
PRO_PID=$(get_id "$PRO_PRODUCT")
echo "  Product: $PRO_PID"

PRO_MO=$(stripe_post /prices \
  -d "product=$PRO_PID" \
  -d "unit_amount=2999" \
  -d "currency=usd" \
  -d "recurring[interval]=month" \
  -d "metadata[tier]=pro" \
  -d "metadata[interval]=monthly")
PRO_MO_ID=$(get_id "$PRO_MO")
echo "  Monthly: $PRO_MO_ID ($29.99/mo)"

PRO_YR=$(stripe_post /prices \
  -d "product=$PRO_PID" \
  -d "unit_amount=27900" \
  -d "currency=usd" \
  -d "recurring[interval]=year" \
  -d "metadata[tier]=pro" \
  -d "metadata[interval]=annual")
PRO_YR_ID=$(get_id "$PRO_YR")
echo "  Annual:  $PRO_YR_ID ($279/yr)"

# --- Pro+ Subscription ($49.99/mo, $479/yr) ---
echo ""
echo "Creating Pro+ product..."
PROPLUS_PRODUCT=$(stripe_post /products \
  -d "name=Aminy Pro+" \
  -d "description=Unlimited everything, priority support, family sharing, BCBA consultation" \
  -d "metadata[tier]=proplus")
PROPLUS_PID=$(get_id "$PROPLUS_PRODUCT")
echo "  Product: $PROPLUS_PID"

PROPLUS_MO=$(stripe_post /prices \
  -d "product=$PROPLUS_PID" \
  -d "unit_amount=4999" \
  -d "currency=usd" \
  -d "recurring[interval]=month" \
  -d "metadata[tier]=proplus" \
  -d "metadata[interval]=monthly")
PROPLUS_MO_ID=$(get_id "$PROPLUS_MO")
echo "  Monthly: $PROPLUS_MO_ID ($49.99/mo)"

PROPLUS_YR=$(stripe_post /prices \
  -d "product=$PROPLUS_PID" \
  -d "unit_amount=47900" \
  -d "currency=usd" \
  -d "recurring[interval]=year" \
  -d "metadata[tier]=proplus" \
  -d "metadata[interval]=annual")
PROPLUS_YR_ID=$(get_id "$PROPLUS_YR")
echo "  Annual:  $PROPLUS_YR_ID ($479/yr)"

# --- Starter Subscription ($6.99/mo, $59/yr) ---
echo ""
echo "Creating Starter product..."
STARTER_PRODUCT=$(stripe_post /products \
  -d "name=Aminy Starter" \
  -d "description=25 messages/day, 30-day memory, basic screening" \
  -d "metadata[tier]=starter")
STARTER_PID=$(get_id "$STARTER_PRODUCT")
echo "  Product: $STARTER_PID"

STARTER_MO=$(stripe_post /prices \
  -d "product=$STARTER_PID" \
  -d "unit_amount=699" \
  -d "currency=usd" \
  -d "recurring[interval]=month" \
  -d "metadata[tier]=starter" \
  -d "metadata[interval]=monthly")
STARTER_MO_ID=$(get_id "$STARTER_MO")
echo "  Monthly: $STARTER_MO_ID ($6.99/mo)"

STARTER_YR=$(stripe_post /prices \
  -d "product=$STARTER_PID" \
  -d "unit_amount=5900" \
  -d "currency=usd" \
  -d "recurring[interval]=year" \
  -d "metadata[tier]=starter" \
  -d "metadata[interval]=annual")
STARTER_YR_ID=$(get_id "$STARTER_YR")
echo "  Annual:  $STARTER_YR_ID ($59/yr)"

# --- Webhook Setup ---
echo ""
echo "Creating webhook endpoint..."
WEBHOOK=$(stripe_post /webhook_endpoints \
  -d "url=https://qpzsvafwcwyrkdolrjbu.supabase.co/functions/v1/make-server-8a022548/payments/webhook" \
  -d "enabled_events[]=checkout.session.completed" \
  -d "enabled_events[]=customer.subscription.created" \
  -d "enabled_events[]=customer.subscription.updated" \
  -d "enabled_events[]=customer.subscription.deleted" \
  -d "enabled_events[]=invoice.paid" \
  -d "enabled_events[]=invoice.payment_failed" \
  -d "enabled_events[]=charge.refunded")
WEBHOOK_SECRET=$(echo "$WEBHOOK" | python3 -c "import json,sys; print(json.load(sys.stdin).get('secret',''))")
echo "  Webhook secret: $WEBHOOK_SECRET"

# --- Output ---
echo ""
echo "==========================================="
echo "  COPY THESE TO .env.local (frontend):"
echo "==========================================="
echo ""
echo "VITE_PRICE_STARTER_MONTHLY=$STARTER_MO_ID"
echo "VITE_PRICE_STARTER_ANNUAL=$STARTER_YR_ID"
echo "VITE_PRICE_CORE_MONTHLY=$CORE_MO_ID"
echo "VITE_PRICE_CORE_ANNUAL=$CORE_YR_ID"
echo "VITE_PRICE_PRO_MONTHLY=$PRO_MO_ID"
echo "VITE_PRICE_PRO_ANNUAL=$PRO_YR_ID"
echo "VITE_PRICE_PROPLUS_MONTHLY=$PROPLUS_MO_ID"
echo "VITE_PRICE_PROPLUS_ANNUAL=$PROPLUS_YR_ID"
echo ""
echo "==========================================="
echo "  ADD THESE TO SUPABASE SECRETS:"
echo "==========================================="
echo ""
echo "STRIPE_PRICE_STARTER_MONTHLY=$STARTER_MO_ID"
echo "STRIPE_PRICE_STARTER_ANNUAL=$STARTER_YR_ID"
echo "STRIPE_PRICE_CORE_MONTHLY=$CORE_MO_ID"
echo "STRIPE_PRICE_CORE_ANNUAL=$CORE_YR_ID"
echo "STRIPE_PRICE_PRO_MONTHLY=$PRO_MO_ID"
echo "STRIPE_PRICE_PRO_ANNUAL=$PRO_YR_ID"
echo "STRIPE_WEBHOOK_SECRET=$WEBHOOK_SECRET"
echo ""
echo "==========================================="
echo "  GET YOUR PUBLISHABLE KEY FROM:"
echo "==========================================="
echo "  https://dashboard.stripe.com/apikeys"
echo "  Add to .env.local: VITE_STRIPE_PUBLISHABLE_KEY=pk_live_xxx"
echo ""
echo "Done! All products and prices created."
