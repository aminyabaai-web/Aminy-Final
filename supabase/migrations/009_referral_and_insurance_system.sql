-- Migration: Referral system with proper tracking and insurance verification infrastructure
-- Addresses McKinsey Month 2 items: Referral/viral mechanics and Insurance API foundation

-- ============================================
-- REFERRAL SYSTEM TABLES
-- ============================================

-- Store referral codes with metadata
CREATE TABLE IF NOT EXISTS referral_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  max_uses INTEGER, -- NULL = unlimited
  current_uses INTEGER DEFAULT 0,
  credit_amount INTEGER DEFAULT 1000, -- $10.00 in cents
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id) -- One active code per user
);
-- Enable RLS
ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;
-- Users can see their own referral code
CREATE POLICY "Users can view own referral code" ON referral_codes
  FOR SELECT USING (auth.uid() = user_id);
-- Service role can manage all codes
CREATE POLICY "Service role can manage referral codes" ON referral_codes
  FOR ALL USING (true);
-- Track all referral relationships
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  referral_code TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'clicked', 'signed_up', 'subscribed', 'credited', 'expired', 'fraudulent')),
  -- Credit tracking
  referrer_credit_amount INTEGER DEFAULT 1000, -- $10.00 in cents
  referred_credit_amount INTEGER DEFAULT 1000, -- $10.00 for new user too
  referrer_credited_at TIMESTAMPTZ,
  referred_credited_at TIMESTAMPTZ,
  -- Attribution tracking
  click_ip_address TEXT,
  click_user_agent TEXT,
  signup_ip_address TEXT,
  signup_user_agent TEXT,
  -- Fraud detection
  fraud_flags TEXT[], -- e.g., ['same_ip', 'velocity_limit', 'disposable_email']
  fraud_score INTEGER DEFAULT 0, -- 0-100, higher = more suspicious
  -- Timestamps
  clicked_at TIMESTAMPTZ,
  signed_up_at TIMESTAMPTZ,
  subscribed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- Enable RLS
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
-- Users can see referrals they made
CREATE POLICY "Users can view own referrals" ON referrals
  FOR SELECT USING (auth.uid() = referrer_id);
-- Service role can manage all
CREATE POLICY "Service role can manage referrals" ON referrals
  FOR ALL USING (true);
-- Track referral link clicks for analytics
CREATE TABLE IF NOT EXISTS referral_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_code TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  referer_url TEXT,
  landing_url TEXT,
  converted BOOLEAN DEFAULT false,
  conversion_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  clicked_at TIMESTAMPTZ DEFAULT NOW()
);
-- Enable RLS (no user access needed - admin only)
ALTER TABLE referral_clicks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role can manage referral clicks" ON referral_clicks
  FOR ALL USING (true);
-- Add referral tracking to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS referred_by_code TEXT,
  ADD COLUMN IF NOT EXISTS referred_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS referral_credits INTEGER DEFAULT 0;
-- ============================================
-- REFERRAL SYSTEM INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_referral_codes_code ON referral_codes(code);
CREATE INDEX IF NOT EXISTS idx_referral_codes_user ON referral_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred ON referrals(referred_user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals(referral_code);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(status);
CREATE INDEX IF NOT EXISTS idx_referral_clicks_code ON referral_clicks(referral_code);
CREATE INDEX IF NOT EXISTS idx_referral_clicks_time ON referral_clicks(clicked_at);
-- ============================================
-- REFERRAL SYSTEM FUNCTIONS
-- ============================================

-- Generate a unique referral code for a user
CREATE OR REPLACE FUNCTION generate_referral_code(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_code TEXT;
  v_attempts INTEGER := 0;
BEGIN
  -- Check if user already has a code
  SELECT code INTO v_code FROM referral_codes WHERE user_id = p_user_id AND is_active = true;
  IF v_code IS NOT NULL THEN
    RETURN v_code;
  END IF;

  -- Generate new unique code
  LOOP
    v_code := 'AMINY' || UPPER(SUBSTRING(MD5(p_user_id::text || NOW()::text || v_attempts::text), 1, 6));
    v_attempts := v_attempts + 1;

    BEGIN
      INSERT INTO referral_codes (user_id, code)
      VALUES (p_user_id, v_code);
      RETURN v_code;
    EXCEPTION WHEN unique_violation THEN
      IF v_attempts > 10 THEN
        RAISE EXCEPTION 'Could not generate unique referral code';
      END IF;
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Process a referral when user signs up with code
CREATE OR REPLACE FUNCTION process_referral_signup(
  p_new_user_id UUID,
  p_referral_code TEXT,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_referrer_id UUID;
  v_referral_id UUID;
  v_fraud_flags TEXT[] := '{}';
  v_fraud_score INTEGER := 0;
  v_same_ip_count INTEGER;
BEGIN
  -- Validate referral code exists and is active
  SELECT user_id INTO v_referrer_id
  FROM referral_codes
  WHERE code = UPPER(p_referral_code) AND is_active = true;

  IF v_referrer_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or inactive referral code');
  END IF;

  -- Check user isn't referring themselves
  IF v_referrer_id = p_new_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot use your own referral code');
  END IF;

  -- Fraud check: Same IP as referrer or recent referrals
  IF p_ip_address IS NOT NULL THEN
    -- Check if same IP used recently
    SELECT COUNT(*) INTO v_same_ip_count
    FROM referrals
    WHERE signup_ip_address = p_ip_address
    AND signed_up_at > NOW() - INTERVAL '24 hours';

    IF v_same_ip_count > 3 THEN
      v_fraud_flags := array_append(v_fraud_flags, 'velocity_limit');
      v_fraud_score := v_fraud_score + 30;
    END IF;

    -- Check if referrer used same IP
    SELECT COUNT(*) INTO v_same_ip_count
    FROM referral_clicks
    WHERE referral_code = UPPER(p_referral_code)
    AND ip_address = p_ip_address;

    IF v_same_ip_count > 0 THEN
      v_fraud_flags := array_append(v_fraud_flags, 'same_ip_as_referrer');
      v_fraud_score := v_fraud_score + 50;
    END IF;
  END IF;

  -- Create referral record
  INSERT INTO referrals (
    referrer_id,
    referred_user_id,
    referral_code,
    status,
    signup_ip_address,
    signup_user_agent,
    signed_up_at,
    fraud_flags,
    fraud_score
  ) VALUES (
    v_referrer_id,
    p_new_user_id,
    UPPER(p_referral_code),
    CASE WHEN v_fraud_score >= 50 THEN 'fraudulent' ELSE 'signed_up' END,
    p_ip_address,
    p_user_agent,
    NOW(),
    v_fraud_flags,
    v_fraud_score
  ) RETURNING id INTO v_referral_id;

  -- Update user profile with referral info
  UPDATE profiles SET
    referred_by_code = UPPER(p_referral_code),
    referred_by_user_id = v_referrer_id,
    updated_at = NOW()
  WHERE id = p_new_user_id;

  -- Increment referral code usage
  UPDATE referral_codes SET
    current_uses = current_uses + 1
  WHERE code = UPPER(p_referral_code);

  -- If not fraudulent, give immediate credit to the new user
  IF v_fraud_score < 50 THEN
    UPDATE profiles SET
      referral_credits = COALESCE(referral_credits, 0) + 1000, -- $10
      updated_at = NOW()
    WHERE id = p_new_user_id;

    UPDATE referrals SET
      referred_credited_at = NOW()
    WHERE id = v_referral_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'referral_id', v_referral_id,
    'referrer_id', v_referrer_id,
    'fraud_score', v_fraud_score,
    'credited', v_fraud_score < 50
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Credit referrer when referred user subscribes
CREATE OR REPLACE FUNCTION credit_referrer_on_subscription(
  p_referred_user_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_referral_id UUID;
  v_referrer_id UUID;
  v_fraud_score INTEGER;
BEGIN
  -- Find the referral record
  SELECT id, referrer_id, fraud_score INTO v_referral_id, v_referrer_id, v_fraud_score
  FROM referrals
  WHERE referred_user_id = p_referred_user_id
  AND status IN ('signed_up', 'subscribed')
  AND referrer_credited_at IS NULL
  LIMIT 1;

  IF v_referral_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No pending referral found');
  END IF;

  -- Don't credit if flagged as fraudulent
  IF v_fraud_score >= 50 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Referral flagged as suspicious');
  END IF;

  -- Credit the referrer
  UPDATE profiles SET
    referral_credits = COALESCE(referral_credits, 0) + 1000, -- $10
    updated_at = NOW()
  WHERE id = v_referrer_id;

  -- Update referral status
  UPDATE referrals SET
    status = 'credited',
    subscribed_at = NOW(),
    referrer_credited_at = NOW(),
    updated_at = NOW()
  WHERE id = v_referral_id;

  RETURN jsonb_build_object(
    'success', true,
    'referral_id', v_referral_id,
    'referrer_id', v_referrer_id,
    'amount_credited', 1000
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Get referral stats for a user
CREATE OR REPLACE FUNCTION get_referral_stats(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_code TEXT;
  v_stats JSONB;
BEGIN
  -- Get or generate referral code
  SELECT code INTO v_code FROM referral_codes WHERE user_id = p_user_id AND is_active = true;
  IF v_code IS NULL THEN
    v_code := generate_referral_code(p_user_id);
  END IF;

  -- Get stats
  SELECT jsonb_build_object(
    'code', v_code,
    'total_referrals', COALESCE(SUM(CASE WHEN status != 'fraudulent' THEN 1 ELSE 0 END), 0),
    'pending_referrals', COALESCE(SUM(CASE WHEN status IN ('clicked', 'signed_up') THEN 1 ELSE 0 END), 0),
    'credited_referrals', COALESCE(SUM(CASE WHEN status = 'credited' THEN 1 ELSE 0 END), 0),
    'total_credits_earned', COALESCE(SUM(CASE WHEN referrer_credited_at IS NOT NULL THEN referrer_credit_amount ELSE 0 END), 0)
  ) INTO v_stats
  FROM referrals
  WHERE referrer_id = p_user_id;

  RETURN v_stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- ============================================
-- INSURANCE VERIFICATION INFRASTRUCTURE
-- ============================================

-- Store insurance coverage verification requests and responses
CREATE TABLE IF NOT EXISTS insurance_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Insurance details
  payer_id TEXT, -- Payer identifier (e.g., 'BCBS', 'AETNA', 'UHC')
  payer_name TEXT,
  member_id TEXT,
  group_number TEXT,
  subscriber_name TEXT,
  subscriber_dob DATE,
  patient_name TEXT,
  patient_dob DATE,
  patient_relationship TEXT DEFAULT 'self' CHECK (patient_relationship IN ('self', 'spouse', 'child', 'other')),
  -- Verification request
  service_type TEXT, -- e.g., 'ABA', 'speech_therapy', 'occupational_therapy'
  service_codes TEXT[], -- CPT codes
  request_payload JSONB, -- Raw request sent to clearinghouse
  request_timestamp TIMESTAMPTZ,
  -- Verification response
  response_payload JSONB, -- Raw response from clearinghouse
  response_timestamp TIMESTAMPTZ,
  -- Parsed coverage info
  coverage_active BOOLEAN,
  coverage_start_date DATE,
  coverage_end_date DATE,
  in_network BOOLEAN,
  deductible_amount INTEGER, -- in cents
  deductible_met INTEGER, -- in cents
  out_of_pocket_max INTEGER, -- in cents
  out_of_pocket_met INTEGER, -- in cents
  copay_amount INTEGER, -- in cents
  coinsurance_percent INTEGER,
  sessions_per_year INTEGER,
  sessions_used INTEGER,
  pre_auth_required BOOLEAN,
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'completed', 'error', 'manual_review')),
  error_message TEXT,
  error_code TEXT,
  -- Metadata
  clearinghouse TEXT, -- e.g., 'eligible', 'availity', 'change_healthcare'
  api_version TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- Enable RLS
ALTER TABLE insurance_verifications ENABLE ROW LEVEL SECURITY;
-- Users can see their own verifications
CREATE POLICY "Users can view own insurance verifications" ON insurance_verifications
  FOR SELECT USING (auth.uid() = user_id);
-- Service role can manage all
CREATE POLICY "Service role can manage insurance verifications" ON insurance_verifications
  FOR ALL USING (true);
-- Store user's insurance cards/documents (references to uploaded files)
CREATE TABLE IF NOT EXISTS insurance_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  verification_id UUID REFERENCES insurance_verifications(id) ON DELETE SET NULL,
  document_type TEXT NOT NULL CHECK (document_type IN ('card_front', 'card_back', 'eob', 'prior_auth', 'denial_letter', 'approval_letter', 'other')),
  file_path TEXT NOT NULL, -- Supabase storage path
  file_name TEXT,
  file_size INTEGER,
  mime_type TEXT,
  -- OCR/extraction results
  extracted_data JSONB, -- Parsed data from document
  ocr_confidence REAL, -- 0-1 confidence score
  extraction_status TEXT DEFAULT 'pending' CHECK (extraction_status IN ('pending', 'processing', 'completed', 'failed')),
  -- Metadata
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);
-- Enable RLS
ALTER TABLE insurance_documents ENABLE ROW LEVEL SECURITY;
-- Users can see their own documents
CREATE POLICY "Users can view own insurance documents" ON insurance_documents
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can upload insurance documents" ON insurance_documents
  FOR INSERT WITH CHECK (auth.uid() = user_id);
-- Service role can manage all
CREATE POLICY "Service role can manage insurance documents" ON insurance_documents
  FOR ALL USING (true);
-- Store payer/insurance company information (admin-managed reference data)
CREATE TABLE IF NOT EXISTS payers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payer_id TEXT UNIQUE NOT NULL, -- Industry standard payer ID
  name TEXT NOT NULL,
  trading_partner_id TEXT, -- Clearinghouse trading partner ID
  clearinghouse TEXT, -- Which clearinghouse to use
  supports_270_271 BOOLEAN DEFAULT false, -- Eligibility verification
  supports_278 BOOLEAN DEFAULT false, -- Prior authorization
  supports_837 BOOLEAN DEFAULT false, -- Claims submission
  api_endpoint TEXT,
  api_credentials_encrypted TEXT, -- Encrypted API credentials
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- Enable RLS (read-only for users)
ALTER TABLE payers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view active payers" ON payers
  FOR SELECT USING (is_active = true);
CREATE POLICY "Service role can manage payers" ON payers
  FOR ALL USING (true);
-- ============================================
-- INSURANCE INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_insurance_verifications_user ON insurance_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_insurance_verifications_status ON insurance_verifications(status);
CREATE INDEX IF NOT EXISTS idx_insurance_verifications_payer ON insurance_verifications(payer_id);
CREATE INDEX IF NOT EXISTS idx_insurance_documents_user ON insurance_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_insurance_documents_verification ON insurance_documents(verification_id);
CREATE INDEX IF NOT EXISTS idx_payers_payer_id ON payers(payer_id);
-- ============================================
-- SEED COMMON PAYERS (reference data)
-- ============================================

INSERT INTO payers (payer_id, name, supports_270_271, supports_278, is_active) VALUES
  ('BCBS', 'Blue Cross Blue Shield', true, true, true),
  ('AETNA', 'Aetna', true, true, true),
  ('UHC', 'UnitedHealthcare', true, true, true),
  ('CIGNA', 'Cigna', true, true, true),
  ('HUMANA', 'Humana', true, true, true),
  ('KAISER', 'Kaiser Permanente', true, false, true),
  ('ANTHEM', 'Anthem', true, true, true),
  ('MEDICAID', 'Medicaid (State)', true, true, true),
  ('MEDICARE', 'Medicare', true, true, true),
  ('TRICARE', 'Tricare', true, true, true)
ON CONFLICT (payer_id) DO NOTHING;
-- ============================================
-- INSURANCE VERIFICATION FUNCTION (placeholder for API integration)
-- ============================================

-- This function would be called to initiate an eligibility verification
-- In production, this would call the clearinghouse API
CREATE OR REPLACE FUNCTION request_insurance_verification(
  p_user_id UUID,
  p_payer_id TEXT,
  p_member_id TEXT,
  p_group_number TEXT,
  p_subscriber_name TEXT,
  p_subscriber_dob DATE,
  p_patient_name TEXT,
  p_patient_dob DATE,
  p_patient_relationship TEXT,
  p_service_type TEXT,
  p_service_codes TEXT[]
)
RETURNS JSONB AS $$
DECLARE
  v_verification_id UUID;
  v_payer_exists BOOLEAN;
BEGIN
  -- Validate payer exists
  SELECT EXISTS(SELECT 1 FROM payers WHERE payer_id = p_payer_id AND is_active = true) INTO v_payer_exists;
  IF NOT v_payer_exists THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unknown or inactive payer');
  END IF;

  -- Create verification record
  INSERT INTO insurance_verifications (
    user_id,
    payer_id,
    member_id,
    group_number,
    subscriber_name,
    subscriber_dob,
    patient_name,
    patient_dob,
    patient_relationship,
    service_type,
    service_codes,
    status,
    request_timestamp
  ) VALUES (
    p_user_id,
    p_payer_id,
    p_member_id,
    p_group_number,
    p_subscriber_name,
    p_subscriber_dob,
    p_patient_name,
    p_patient_dob,
    p_patient_relationship,
    p_service_type,
    p_service_codes,
    'pending',
    NOW()
  ) RETURNING id INTO v_verification_id;

  -- In production, this would trigger an async job to call the clearinghouse API
  -- For now, return the verification ID for tracking

  RETURN jsonb_build_object(
    'success', true,
    'verification_id', v_verification_id,
    'message', 'Verification request created. Real-time verification requires clearinghouse API integration.'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
