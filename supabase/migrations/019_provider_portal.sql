-- ============================================================================
-- Migration: 019_provider_portal.sql
-- Description: Complete provider portal data persistence
-- ============================================================================

-- ============================================================================
-- Providers Table (main profile)
-- ============================================================================

-- [MIGRATION FIX] Table providers created in earlier migration.
-- Adding columns that would have been lost due to IF NOT EXISTS:
-- Original CREATE TABLE commented out below.
ALTER TABLE providers ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE providers ADD COLUMN IF NOT EXISTS last_name TEXT;
ALTER TABLE providers ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE providers ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE providers ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE providers ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE providers ADD COLUMN IF NOT EXISTS provider_type TEXT;
ALTER TABLE providers ADD COLUMN IF NOT EXISTS specialties TEXT[] DEFAULT '{}';
ALTER TABLE providers ADD COLUMN IF NOT EXISTS location_city TEXT;
ALTER TABLE providers ADD COLUMN IF NOT EXISTS location_state TEXT;
ALTER TABLE providers ADD COLUMN IF NOT EXISTS location_zip_code TEXT;
ALTER TABLE providers ADD COLUMN IF NOT EXISTS offers_telehealth BOOLEAN DEFAULT TRUE;
ALTER TABLE providers ADD COLUMN IF NOT EXISTS offers_in_person BOOLEAN DEFAULT FALSE;
ALTER TABLE providers ADD COLUMN IF NOT EXISTS insurance_accepted TEXT[] DEFAULT '{}';
ALTER TABLE providers ADD COLUMN IF NOT EXISTS accepts_new_patients BOOLEAN DEFAULT TRUE;
ALTER TABLE providers ADD COLUMN IF NOT EXISTS availability JSONB DEFAULT '{}'::jsonb;
ALTER TABLE providers ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT FALSE;
ALTER TABLE providers ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
ALTER TABLE providers ADD COLUMN IF NOT EXISTS verification_level TEXT DEFAULT 'none' CHECK (verification_level IN ( 'none', 'pending', 'verified', 'gold' ));

-- Original CREATE TABLE (commented out, columns added above):
-- CREATE TABLE IF NOT EXISTS providers (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
-- 
--   -- Basic info
--   first_name TEXT NOT NULL,
--   last_name TEXT NOT NULL,
--   title TEXT NOT NULL, -- e.g., "BCBA", "LCSW", etc.
--   email TEXT NOT NULL,
--   phone TEXT,
--   avatar_url TEXT,
--   bio TEXT,
-- 
--   -- Professional details
--   provider_type TEXT NOT NULL CHECK (provider_type IN (
--     'bcba', 'slp', 'ot', 'pt', 'psychologist',
--     'developmental_pediatrician', 'lcsw', 'lmft', 'other'
--   )),
--   specialties TEXT[] DEFAULT '{}',
--   languages TEXT[] DEFAULT ARRAY['English'],
--   credentials TEXT[] DEFAULT '{}', -- Additional credential abbreviations
-- 
--   -- Location
--   location_city TEXT,
--   location_state TEXT,
--   location_zip_code TEXT,
--   offers_telehealth BOOLEAN DEFAULT TRUE,
--   offers_in_person BOOLEAN DEFAULT FALSE,
-- 
--   -- Practice details
--   insurance_accepted TEXT[] DEFAULT '{}',
--   hourly_rate INTEGER, -- in cents
--   accepts_new_patients BOOLEAN DEFAULT TRUE,
-- 
--   -- Availability (stored as JSONB for flexibility)
--   availability JSONB DEFAULT '{}'::jsonb,
-- 
--   -- Stats
--   rating DECIMAL(2,1) DEFAULT 5.0,
--   review_count INTEGER DEFAULT 0,
-- 
--   -- Verification
--   verified BOOLEAN DEFAULT FALSE,
--   verified_at TIMESTAMPTZ,
--   verification_level TEXT DEFAULT 'none' CHECK (verification_level IN (
--     'none', 'pending', 'verified', 'gold'
--   )),
-- 
--   -- Timestamps
--   created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
--   updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
-- );


-- Indexes
CREATE INDEX IF NOT EXISTS idx_providers_user_id ON providers(user_id);
CREATE INDEX IF NOT EXISTS idx_providers_type ON providers(provider_type);
CREATE INDEX IF NOT EXISTS idx_providers_state ON providers(location_state);
CREATE INDEX IF NOT EXISTS idx_providers_verified ON providers(verified);
CREATE INDEX IF NOT EXISTS idx_providers_accepts_new ON providers(accepts_new_patients);

-- RLS
ALTER TABLE providers ENABLE ROW LEVEL SECURITY;

-- Providers can view/edit own profile
CREATE POLICY "Providers can manage own profile"
  ON providers FOR ALL
  USING (auth.uid() = user_id);

-- Anyone can view verified providers (for marketplace)
CREATE POLICY "Anyone can view verified providers"
  ON providers FOR SELECT
  USING (verified = TRUE);

-- ============================================================================
-- Provider-Patient Relationships
-- ============================================================================

-- [MIGRATION FIX] Table provider_patients created in earlier migration.
-- Adding columns that would have been lost due to IF NOT EXISTS:
-- Original CREATE TABLE commented out below.
ALTER TABLE provider_patients ADD COLUMN IF NOT EXISTS access_revoked_at TIMESTAMPTZ;
ALTER TABLE provider_patients ADD COLUMN IF NOT EXISTS is_primary_provider BOOLEAN DEFAULT FALSE;
ALTER TABLE provider_patients ADD COLUMN IF NOT EXISTS total_sessions INTEGER DEFAULT 0;
ALTER TABLE provider_patients ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Original CREATE TABLE (commented out, columns added above):
-- CREATE TABLE IF NOT EXISTS provider_patients (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
--   child_id UUID NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
--   parent_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
-- 
--   -- Access level
--   profile_access TEXT NOT NULL DEFAULT 'pending' CHECK (profile_access IN (
--     'pending', 'granted', 'limited', 'revoked'
--   )),
--   access_granted_at TIMESTAMPTZ,
--   access_revoked_at TIMESTAMPTZ,
-- 
--   -- Relationship details
--   notes TEXT,
--   is_primary_provider BOOLEAN DEFAULT FALSE,
--   total_sessions INTEGER DEFAULT 0,
--   next_session_at TIMESTAMPTZ,
-- 
--   -- Timestamps
--   created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
--   updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
-- 
--   -- Prevent duplicates
--   UNIQUE(provider_id, child_id)
-- );


-- Indexes
CREATE INDEX IF NOT EXISTS idx_provider_patients_provider ON provider_patients(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_patients_child ON provider_patients(child_id);
CREATE INDEX IF NOT EXISTS idx_provider_patients_parent ON provider_patients(parent_user_id);
CREATE INDEX IF NOT EXISTS idx_provider_patients_access ON provider_patients(profile_access);

-- RLS
ALTER TABLE provider_patients ENABLE ROW LEVEL SECURITY;

-- Providers can view their patients
CREATE POLICY "Providers can view own patients"
  ON provider_patients FOR SELECT
  USING (provider_id IN (
    SELECT id FROM providers WHERE user_id = auth.uid()
  ));

-- Parents can manage their child's providers
CREATE POLICY "Parents can manage child providers"
  ON provider_patients FOR ALL
  USING (parent_user_id = auth.uid());

-- ============================================================================
-- Provider Sessions
-- ============================================================================

-- [MIGRATION FIX] Table provider_sessions created in earlier migration.
-- Adding columns that would have been lost due to IF NOT EXISTS:
-- Original CREATE TABLE commented out below.
ALTER TABLE provider_sessions ADD COLUMN IF NOT EXISTS cancelled_reason TEXT;
ALTER TABLE provider_sessions ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
ALTER TABLE provider_sessions ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES auth.users(id);
ALTER TABLE provider_sessions ADD COLUMN IF NOT EXISTS room_expires_at TIMESTAMPTZ;
ALTER TABLE provider_sessions ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;
ALTER TABLE provider_sessions ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;
ALTER TABLE provider_sessions ADD COLUMN IF NOT EXISTS parent_notes TEXT;

-- Original CREATE TABLE (commented out, columns added above):
-- CREATE TABLE IF NOT EXISTS provider_sessions (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
--   patient_id UUID NOT NULL REFERENCES provider_patients(id) ON DELETE CASCADE,
-- 
--   -- Scheduling
--   scheduled_at TIMESTAMPTZ NOT NULL,
--   duration_minutes INTEGER NOT NULL DEFAULT 50,
--   session_type TEXT NOT NULL CHECK (session_type IN ('telehealth', 'in-person')),
-- 
--   -- Status
--   status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN (
--     'scheduled', 'confirmed', 'in-progress', 'completed', 'cancelled', 'no-show'
--   )),
--   cancelled_reason TEXT,
--   cancelled_at TIMESTAMPTZ,
--   cancelled_by UUID REFERENCES auth.users(id),
-- 
--   -- Video call
--   room_url TEXT,
--   room_expires_at TIMESTAMPTZ,
-- 
--   -- Payment
--   fee_cents INTEGER,
--   paid BOOLEAN DEFAULT FALSE,
--   paid_at TIMESTAMPTZ,
--   stripe_payment_intent_id TEXT,
-- 
--   -- Notes
--   provider_notes TEXT,
--   parent_notes TEXT,
-- 
--   -- Timestamps
--   created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
--   updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
-- );


-- Indexes
CREATE INDEX IF NOT EXISTS idx_provider_sessions_provider ON provider_sessions(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_sessions_patient ON provider_sessions(patient_id);
CREATE INDEX IF NOT EXISTS idx_provider_sessions_scheduled ON provider_sessions(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_provider_sessions_status ON provider_sessions(status);

-- RLS
ALTER TABLE provider_sessions ENABLE ROW LEVEL SECURITY;

-- Providers can manage sessions with their patients
CREATE POLICY "Providers can manage own sessions"
  ON provider_sessions FOR ALL
  USING (provider_id IN (
    SELECT id FROM providers WHERE user_id = auth.uid()
  ));

-- Parents can view sessions for their children
CREATE POLICY "Parents can view child sessions"
  ON provider_sessions FOR SELECT
  USING (patient_id IN (
    SELECT id FROM provider_patients WHERE parent_user_id = auth.uid()
  ));

-- ============================================================================
-- Session Notes (detailed clinical notes)
-- ============================================================================

CREATE TABLE IF NOT EXISTS session_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL UNIQUE REFERENCES provider_sessions(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,

  -- Clinical notes
  observations TEXT,
  goals_worked_on TEXT[] DEFAULT '{}',
  progress JSONB DEFAULT '{}'::jsonb, -- { goal_name: 'improved' | 'maintained' | 'needs_attention' }
  recommendations TEXT[] DEFAULT '{}',
  parent_follow_up TEXT,

  -- Shared with parent
  shared_with_parent BOOLEAN DEFAULT FALSE,
  shared_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_session_notes_session ON session_notes(session_id);
CREATE INDEX IF NOT EXISTS idx_session_notes_provider ON session_notes(provider_id);

-- RLS
ALTER TABLE session_notes ENABLE ROW LEVEL SECURITY;

-- Providers can manage their own notes
CREATE POLICY "Providers can manage own notes"
  ON session_notes FOR ALL
  USING (provider_id IN (
    SELECT id FROM providers WHERE user_id = auth.uid()
  ));

-- Parents can view shared notes
CREATE POLICY "Parents can view shared notes"
  ON session_notes FOR SELECT
  USING (
    shared_with_parent = TRUE
    AND session_id IN (
      SELECT ps.id FROM provider_sessions ps
      JOIN provider_patients pp ON ps.patient_id = pp.id
      WHERE pp.parent_user_id = auth.uid()
    )
  );

-- ============================================================================
-- Profile Access Requests
-- ============================================================================

CREATE TABLE IF NOT EXISTS profile_access_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  parent_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Request details
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'approved', 'denied', 'expired'
  )),

  -- Response
  responded_at TIMESTAMPTZ,
  response_message TEXT,

  -- Expiry
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Prevent duplicate active requests
  UNIQUE(provider_id, child_id, status)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_access_requests_provider ON profile_access_requests(provider_id);
CREATE INDEX IF NOT EXISTS idx_access_requests_parent ON profile_access_requests(parent_user_id);
CREATE INDEX IF NOT EXISTS idx_access_requests_status ON profile_access_requests(status);

-- RLS
ALTER TABLE profile_access_requests ENABLE ROW LEVEL SECURITY;

-- Providers can view/create requests
CREATE POLICY "Providers can manage requests"
  ON profile_access_requests FOR ALL
  USING (provider_id IN (
    SELECT id FROM providers WHERE user_id = auth.uid()
  ));

-- Parents can view and respond to requests
CREATE POLICY "Parents can view and respond to requests"
  ON profile_access_requests FOR ALL
  USING (parent_user_id = auth.uid());

-- ============================================================================
-- Provider Reviews
-- ============================================================================

CREATE TABLE IF NOT EXISTS provider_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  reviewer_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Review content
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  is_anonymous BOOLEAN DEFAULT FALSE,

  -- Moderation
  is_visible BOOLEAN DEFAULT TRUE,
  moderated_at TIMESTAMPTZ,
  moderation_reason TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One review per user per provider
  UNIQUE(provider_id, reviewer_user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_reviews_provider ON provider_reviews(provider_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON provider_reviews(rating);

-- RLS
ALTER TABLE provider_reviews ENABLE ROW LEVEL SECURITY;

-- Anyone can view visible reviews
CREATE POLICY "Anyone can view visible reviews"
  ON provider_reviews FOR SELECT
  USING (is_visible = TRUE);

-- Users can manage own reviews
CREATE POLICY "Users can manage own reviews"
  ON provider_reviews FOR ALL
  USING (reviewer_user_id = auth.uid());

-- ============================================================================
-- Triggers
-- ============================================================================

-- Update provider rating after review
CREATE OR REPLACE FUNCTION update_provider_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE providers
  SET
    rating = (
      SELECT COALESCE(AVG(rating), 5.0)
      FROM provider_reviews
      WHERE provider_id = COALESCE(NEW.provider_id, OLD.provider_id)
      AND is_visible = TRUE
    ),
    review_count = (
      SELECT COUNT(*)
      FROM provider_reviews
      WHERE provider_id = COALESCE(NEW.provider_id, OLD.provider_id)
      AND is_visible = TRUE
    ),
    updated_at = NOW()
  WHERE id = COALESCE(NEW.provider_id, OLD.provider_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER update_provider_rating_after_review
  AFTER INSERT OR UPDATE OR DELETE ON provider_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_provider_rating();

-- Update session count for patient
CREATE OR REPLACE FUNCTION update_patient_session_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    UPDATE provider_patients
    SET total_sessions = total_sessions + 1,
        updated_at = NOW()
    WHERE id = NEW.patient_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER update_session_count_after_completion
  AFTER INSERT OR UPDATE ON provider_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_patient_session_count();

-- Auto-update timestamps
CREATE OR REPLACE FUNCTION update_provider_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER providers_updated_at
  BEFORE UPDATE ON providers
  FOR EACH ROW
  EXECUTE FUNCTION update_provider_timestamp();

CREATE TRIGGER provider_patients_updated_at
  BEFORE UPDATE ON provider_patients
  FOR EACH ROW
  EXECUTE FUNCTION update_provider_timestamp();

CREATE TRIGGER provider_sessions_updated_at
  BEFORE UPDATE ON provider_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_provider_timestamp();

CREATE TRIGGER session_notes_updated_at
  BEFORE UPDATE ON session_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_provider_timestamp();

-- ============================================================================
-- Helper Functions
-- ============================================================================

-- Get provider stats
CREATE OR REPLACE FUNCTION get_provider_stats(p_provider_id UUID)
RETURNS TABLE(
  total_patients BIGINT,
  active_patients BIGINT,
  sessions_this_month BIGINT,
  sessions_total BIGINT,
  earnings_this_month BIGINT,
  earnings_total BIGINT,
  rating DECIMAL,
  review_count BIGINT,
  next_available_slot TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM provider_patients WHERE provider_id = p_provider_id)::BIGINT,
    (SELECT COUNT(*) FROM provider_patients WHERE provider_id = p_provider_id AND profile_access = 'granted')::BIGINT,
    (SELECT COUNT(*) FROM provider_sessions
      WHERE provider_id = p_provider_id
      AND status = 'completed'
      AND scheduled_at >= DATE_TRUNC('month', CURRENT_DATE))::BIGINT,
    (SELECT COUNT(*) FROM provider_sessions WHERE provider_id = p_provider_id AND status = 'completed')::BIGINT,
    COALESCE((SELECT SUM(fee_cents) FROM provider_sessions
      WHERE provider_id = p_provider_id
      AND status = 'completed'
      AND paid = TRUE
      AND scheduled_at >= DATE_TRUNC('month', CURRENT_DATE)), 0)::BIGINT,
    COALESCE((SELECT SUM(fee_cents) FROM provider_sessions
      WHERE provider_id = p_provider_id
      AND status = 'completed'
      AND paid = TRUE), 0)::BIGINT,
    (SELECT p.rating FROM providers p WHERE p.id = p_provider_id),
    (SELECT p.review_count::BIGINT FROM providers p WHERE p.id = p_provider_id),
    (SELECT MIN(scheduled_at) FROM provider_sessions
      WHERE provider_id = p_provider_id
      AND status = 'scheduled'
      AND scheduled_at > NOW());
END;
$$;

-- Comments
COMMENT ON TABLE providers IS 'Provider profiles for marketplace and portal';
COMMENT ON TABLE provider_patients IS 'Provider-patient relationships and access permissions';
COMMENT ON TABLE provider_sessions IS 'Scheduled and completed sessions';
COMMENT ON TABLE session_notes IS 'Clinical notes from sessions';
COMMENT ON TABLE profile_access_requests IS 'Requests from providers to access child profiles';
COMMENT ON TABLE provider_reviews IS 'Parent reviews of providers';
