-- Migration: Trial tracking and promo code usage tracking
-- Addresses McKinsey Week 3 issues: trial consistency and promo code abuse prevention

-- ============================================
-- ADD TRIAL FIELDS TO PROFILES
-- ============================================
-- Store trial dates locally so we're not 100% dependent on Stripe

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS trial_start_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS trial_end_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'none' CHECK (
    subscription_status IN ('none', 'trialing', 'active', 'canceled', 'past_due')
  );

-- Create index for querying trial end dates (for reminder emails)
CREATE INDEX IF NOT EXISTS idx_profiles_trial_end ON profiles(trial_end_date)
  WHERE trial_end_date IS NOT NULL;

-- ============================================
-- PROMO CODE REDEMPTIONS TABLE (usage tracking)
-- ============================================
-- Track every promo code redemption for abuse prevention

CREATE TABLE IF NOT EXISTS promo_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  promo_code TEXT NOT NULL,
  context TEXT NOT NULL CHECK (context IN ('subscription', 'telehealth', 'marketplace')),
  discount_amount INTEGER NOT NULL, -- in cents
  discount_percent INTEGER, -- if percentage discount
  original_amount INTEGER NOT NULL, -- original price before discount, in cents
  final_amount INTEGER NOT NULL, -- final price after discount, in cents
  payment_id UUID, -- reference to payment if applicable
  appointment_id UUID, -- reference to appointment if applicable
  redeemed_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address TEXT, -- for fraud detection
  user_agent TEXT -- for fraud detection
);

-- Enable RLS
ALTER TABLE promo_redemptions ENABLE ROW LEVEL SECURITY;

-- Users can only see their own redemptions
CREATE POLICY "Users can view own redemptions" ON promo_redemptions
  FOR SELECT USING (auth.uid() = user_id);

-- Service role can insert (for backend redemption tracking)
CREATE POLICY "Service role can insert redemptions" ON promo_redemptions
  FOR INSERT WITH CHECK (true);

-- ============================================
-- UPDATE PROMO_CODES TABLE
-- ============================================
-- Add per-user limit and better tracking fields

-- Make sure promo_codes table exists (created in migration 007)
-- If it exists, add new columns for better tracking

DO $$
BEGIN
  -- Add per_user_limit column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'promo_codes' AND column_name = 'per_user_limit'
  ) THEN
    ALTER TABLE promo_codes ADD COLUMN per_user_limit INTEGER DEFAULT 1;
  END IF;

  -- Add minimum_purchase column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'promo_codes' AND column_name = 'minimum_purchase'
  ) THEN
    ALTER TABLE promo_codes ADD COLUMN minimum_purchase INTEGER DEFAULT 0;
  END IF;

  -- Add context_restriction column (where can code be used)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'promo_codes' AND column_name = 'context_restriction'
  ) THEN
    ALTER TABLE promo_codes ADD COLUMN context_restriction TEXT[] DEFAULT ARRAY['subscription', 'telehealth', 'marketplace'];
  END IF;

  -- Add first_purchase_only column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'promo_codes' AND column_name = 'first_purchase_only'
  ) THEN
    ALTER TABLE promo_codes ADD COLUMN first_purchase_only BOOLEAN DEFAULT false;
  END IF;
END $$;

-- ============================================
-- INDEXES FOR PROMO TRACKING
-- ============================================
CREATE INDEX IF NOT EXISTS idx_promo_redemptions_user_id ON promo_redemptions(user_id);
CREATE INDEX IF NOT EXISTS idx_promo_redemptions_code ON promo_redemptions(promo_code);
CREATE INDEX IF NOT EXISTS idx_promo_redemptions_user_code ON promo_redemptions(user_id, promo_code);
CREATE INDEX IF NOT EXISTS idx_promo_redemptions_redeemed_at ON promo_redemptions(redeemed_at);

-- ============================================
-- FUNCTION: Check if user can use promo code
-- ============================================
CREATE OR REPLACE FUNCTION can_use_promo_code(
  p_user_id UUID,
  p_code TEXT,
  p_context TEXT
) RETURNS TABLE (
  allowed BOOLEAN,
  reason TEXT,
  discount_type TEXT,
  discount_value INTEGER
) AS $$
DECLARE
  v_promo promo_codes%ROWTYPE;
  v_user_redemption_count INTEGER;
  v_total_redemption_count INTEGER;
  v_user_has_any_purchase BOOLEAN;
BEGIN
  -- Get promo code details
  SELECT * INTO v_promo FROM promo_codes WHERE code = UPPER(p_code) AND is_active = true;

  IF v_promo IS NULL THEN
    RETURN QUERY SELECT false, 'Invalid or inactive promo code'::TEXT, NULL::TEXT, NULL::INTEGER;
    RETURN;
  END IF;

  -- Check expiration
  IF v_promo.expires_at IS NOT NULL AND v_promo.expires_at < NOW() THEN
    RETURN QUERY SELECT false, 'Promo code has expired'::TEXT, NULL::TEXT, NULL::INTEGER;
    RETURN;
  END IF;

  -- Check context restriction
  IF v_promo.context_restriction IS NOT NULL AND NOT (p_context = ANY(v_promo.context_restriction)) THEN
    RETURN QUERY SELECT false, 'Promo code is not valid for this purchase type'::TEXT, NULL::TEXT, NULL::INTEGER;
    RETURN;
  END IF;

  -- Check global max uses
  IF v_promo.max_uses IS NOT NULL THEN
    SELECT COUNT(*) INTO v_total_redemption_count FROM promo_redemptions WHERE promo_code = UPPER(p_code);
    IF v_total_redemption_count >= v_promo.max_uses THEN
      RETURN QUERY SELECT false, 'Promo code has reached maximum uses'::TEXT, NULL::TEXT, NULL::INTEGER;
      RETURN;
    END IF;
  END IF;

  -- Check per-user limit
  IF v_promo.per_user_limit IS NOT NULL THEN
    SELECT COUNT(*) INTO v_user_redemption_count
    FROM promo_redemptions
    WHERE user_id = p_user_id AND promo_code = UPPER(p_code);

    IF v_user_redemption_count >= v_promo.per_user_limit THEN
      RETURN QUERY SELECT false, 'You have already used this promo code'::TEXT, NULL::TEXT, NULL::INTEGER;
      RETURN;
    END IF;
  END IF;

  -- Check first purchase only
  IF v_promo.first_purchase_only THEN
    SELECT EXISTS(
      SELECT 1 FROM promo_redemptions WHERE user_id = p_user_id
      UNION
      SELECT 1 FROM payments WHERE user_id = p_user_id AND status = 'completed'
    ) INTO v_user_has_any_purchase;

    IF v_user_has_any_purchase THEN
      RETURN QUERY SELECT false, 'Promo code is only valid for first-time purchases'::TEXT, NULL::TEXT, NULL::INTEGER;
      RETURN;
    END IF;
  END IF;

  -- All checks passed
  RETURN QUERY SELECT true, 'Valid'::TEXT, v_promo.discount_type, v_promo.discount_value;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- UPDATE PROMO CODES WITH NEW RESTRICTIONS
-- ============================================
-- Update existing seeded codes with sensible defaults

UPDATE promo_codes SET
  per_user_limit = 1,
  first_purchase_only = true
WHERE code = 'WELCOME20';

UPDATE promo_codes SET
  per_user_limit = 1,
  first_purchase_only = true
WHERE code = 'FIRST10';

UPDATE promo_codes SET
  per_user_limit = 1,
  max_uses = 1000 -- Limited time promotion
WHERE code = 'AMINY50';

UPDATE promo_codes SET
  per_user_limit = 3, -- Partners can use multiple times
  context_restriction = ARRAY['subscription', 'telehealth']
WHERE code = 'AACT25';

-- ============================================
-- FUNCTION: Increment promo code usage
-- ============================================
CREATE OR REPLACE FUNCTION increment_promo_uses(p_code TEXT)
RETURNS void AS $$
BEGIN
  UPDATE promo_codes
  SET current_uses = COALESCE(current_uses, 0) + 1
  WHERE code = UPPER(p_code);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
