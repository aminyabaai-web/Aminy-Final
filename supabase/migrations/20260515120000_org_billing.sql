-- Migration: B2B org licensing — Stripe billing linkage on organizations
-- Adds Stripe customer + subscription tracking to existing organizations table,
-- and an org_subscription_events log for webhook history.

-- ─── Stripe linkage on organizations ────────────────────────────────────────
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS stripe_customer_id   text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS subscription_status  text DEFAULT 'inactive'
    CHECK (subscription_status IN ('inactive', 'trialing', 'active', 'past_due', 'canceled', 'incomplete')),
  ADD COLUMN IF NOT EXISTS billing_interval     text DEFAULT 'month'
    CHECK (billing_interval IN ('month', 'year')),
  ADD COLUMN IF NOT EXISTS price_per_seat_cents integer DEFAULT 9900,  -- $99/seat/mo default
  ADD COLUMN IF NOT EXISTS current_period_end   timestamptz,
  ADD COLUMN IF NOT EXISTS trial_ends_at        timestamptz;

CREATE INDEX IF NOT EXISTS idx_organizations_stripe_customer
  ON public.organizations(stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_organizations_stripe_subscription
  ON public.organizations(stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;

-- ─── Subscription event log (for webhook audit + history) ───────────────────
CREATE TABLE IF NOT EXISTS public.org_subscription_events (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    timestamptz DEFAULT now(),
  org_id        uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  event_type    text NOT NULL,          -- 'created', 'updated', 'canceled', 'invoice.paid', etc.
  stripe_event_id text UNIQUE,           -- idempotency key from Stripe
  payload       jsonb                    -- raw Stripe event for forensics
);

CREATE INDEX IF NOT EXISTS idx_org_subscription_events_org
  ON public.org_subscription_events(org_id, created_at DESC);

ALTER TABLE public.org_subscription_events ENABLE ROW LEVEL SECURITY;

-- Org owners can read their own subscription history
DROP POLICY IF EXISTS "Org owners read subscription events" ON public.org_subscription_events;
CREATE POLICY "Org owners read subscription events"
  ON public.org_subscription_events FOR SELECT
  USING (
    org_id IN (
      SELECT id FROM public.organizations WHERE owner_id = auth.uid()
    )
  );

-- Service role full access (for webhook writes)
DROP POLICY IF EXISTS "Service role full access subscription events" ON public.org_subscription_events;
CREATE POLICY "Service role full access subscription events"
  ON public.org_subscription_events FOR ALL
  USING (auth.role() = 'service_role');
