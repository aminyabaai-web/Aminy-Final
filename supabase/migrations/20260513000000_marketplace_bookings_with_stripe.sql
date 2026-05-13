-- Create marketplace_bookings table that 014_missing_tables intended to create
-- but never landed in production (table absent from DB despite migration listed
-- as applied). Adds Stripe payment tracking columns used by the pay-at-booking
-- flow:
--   stripe_payment_intent_id, stripe_checkout_session_id, paid_at
-- Webhook (checkout.session.completed) fills these in when a booking checkout
-- completes (see src/supabase/functions/server/stripe-routes.ts).

CREATE TABLE IF NOT EXISTS marketplace_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES provider_profiles(id) ON DELETE CASCADE,
  child_id UUID REFERENCES children(id) ON DELETE SET NULL,
  session_type TEXT NOT NULL,
  session_duration_minutes INTEGER NOT NULL DEFAULT 60,
  scheduled_at TIMESTAMPTZ NOT NULL,
  timezone TEXT DEFAULT 'America/New_York',
  concern TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed', 'no_show', 'rescheduled')),
  cancellation_reason TEXT,
  cancelled_at TIMESTAMPTZ,
  cancelled_by UUID REFERENCES auth.users(id),
  price DECIMAL(10,2) NOT NULL,
  provider_payout DECIMAL(10,2) NOT NULL,
  platform_fee DECIMAL(10,2) NOT NULL,
  payment_status TEXT DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'paid', 'refunded', 'failed')),
  payment_intent_id TEXT,
  stripe_payment_intent_id TEXT,
  stripe_checkout_session_id TEXT,
  paid_at TIMESTAMPTZ,
  provider_paid BOOLEAN DEFAULT false,
  payout_id TEXT,
  video_room_url TEXT,
  video_room_name TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  review TEXT,
  rated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marketplace_bookings_user
  ON marketplace_bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_bookings_provider
  ON marketplace_bookings(provider_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_bookings_status
  ON marketplace_bookings(status);
CREATE INDEX IF NOT EXISTS idx_marketplace_bookings_scheduled
  ON marketplace_bookings(scheduled_at);

ALTER TABLE marketplace_bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own bookings" ON marketplace_bookings;
CREATE POLICY "Users can view own bookings"
  ON marketplace_bookings FOR SELECT
  USING (auth.uid() = user_id);

-- provider_profiles.user_id is text (not uuid), so cast auth.uid() to text
DROP POLICY IF EXISTS "Providers can view their bookings" ON marketplace_bookings;
CREATE POLICY "Providers can view their bookings"
  ON marketplace_bookings FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM provider_profiles
    WHERE provider_profiles.id = marketplace_bookings.provider_id
      AND provider_profiles.user_id = auth.uid()::text
  ));

DROP POLICY IF EXISTS "Users can create bookings" ON marketplace_bookings;
CREATE POLICY "Users can create bookings"
  ON marketplace_bookings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own bookings" ON marketplace_bookings;
CREATE POLICY "Users can update own bookings"
  ON marketplace_bookings FOR UPDATE
  USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE ON marketplace_bookings TO authenticated;
