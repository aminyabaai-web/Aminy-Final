-- =============================================================================
-- Migration: Provider Features (March 9, 2026)
--
-- Adds tables for:
-- 1. provider_referrals — referral network between providers
-- 2. provider_availability — weekly availability slots
-- 3. care_teams — multi-provider care team assignments
-- 4. provider_credentials_tracker — credentialing status tracking
-- =============================================================================

-- ============================================
-- 1. PROVIDER REFERRALS
-- ============================================

CREATE TABLE IF NOT EXISTS provider_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_provider_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  to_provider_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  child_id uuid REFERENCES children(id) ON DELETE SET NULL,
  reason text NOT NULL,
  specialty text,
  urgency text DEFAULT 'routine' CHECK (urgency IN ('routine', 'soon', 'urgent')),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'completed', 'cancelled')),
  notes text,
  attachments jsonb DEFAULT '[]'::jsonb,
  accepted_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE provider_referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Providers can view referrals they sent or received"
  ON provider_referrals FOR SELECT TO authenticated
  USING (from_provider_id = auth.uid() OR to_provider_id = auth.uid());

CREATE POLICY "Providers can create referrals"
  ON provider_referrals FOR INSERT TO authenticated
  WITH CHECK (from_provider_id = auth.uid());

CREATE POLICY "Providers can update referrals they are part of"
  ON provider_referrals FOR UPDATE TO authenticated
  USING (from_provider_id = auth.uid() OR to_provider_id = auth.uid());

CREATE INDEX idx_referrals_from_provider ON provider_referrals(from_provider_id);
CREATE INDEX idx_referrals_to_provider ON provider_referrals(to_provider_id);
CREATE INDEX idx_referrals_child ON provider_referrals(child_id);
CREATE INDEX idx_referrals_status ON provider_referrals(status);

-- ============================================
-- 2. PROVIDER AVAILABILITY
-- ============================================

CREATE TABLE IF NOT EXISTS provider_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  day_of_week smallint NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  slot_type text DEFAULT 'available' CHECK (slot_type IN ('available', 'telehealth_only', 'in_person_only', 'blocked')),
  recurrence text DEFAULT 'weekly' CHECK (recurrence IN ('weekly', 'biweekly', 'one_time')),
  effective_from date,
  effective_until date,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_time_range CHECK (start_time < end_time)
);

ALTER TABLE provider_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Providers can manage own availability"
  ON provider_availability FOR ALL TO authenticated
  USING (provider_id = auth.uid());

CREATE POLICY "Anyone authenticated can view provider availability"
  ON provider_availability FOR SELECT TO authenticated
  USING (true);

CREATE INDEX idx_availability_provider ON provider_availability(provider_id);
CREATE INDEX idx_availability_day ON provider_availability(day_of_week);

-- ============================================
-- 3. CARE TEAMS
-- ============================================

CREATE TABLE IF NOT EXISTS care_teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  provider_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role text NOT NULL,
  specialty text,
  is_primary boolean DEFAULT false,
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
  start_date date DEFAULT CURRENT_DATE,
  end_date date,
  notes text,
  last_session_date timestamptz,
  next_appointment timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(child_id, provider_id)
);

ALTER TABLE care_teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parents can view care team for own children"
  ON care_teams FOR SELECT TO authenticated
  USING (
    child_id IN (SELECT id FROM children WHERE parent_id = auth.uid())
    OR provider_id = auth.uid()
  );

CREATE POLICY "Parents can manage care team for own children"
  ON care_teams FOR ALL TO authenticated
  USING (
    child_id IN (SELECT id FROM children WHERE parent_id = auth.uid())
  );

CREATE POLICY "Providers can view teams they belong to"
  ON care_teams FOR SELECT TO authenticated
  USING (provider_id = auth.uid());

CREATE INDEX idx_care_teams_child ON care_teams(child_id);
CREATE INDEX idx_care_teams_provider ON care_teams(provider_id);
CREATE INDEX idx_care_teams_status ON care_teams(status);

-- ============================================
-- 4. PROVIDER CREDENTIALS TRACKER
-- ============================================

CREATE TABLE IF NOT EXISTS provider_credentials_tracker (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  credential_type text NOT NULL,
  credential_name text NOT NULL,
  credential_number text,
  issuing_authority text,
  state text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'verified', 'expired', 'rejected')),
  issue_date date,
  expiration_date date,
  document_url text,
  document_file_id text,
  verification_source text,
  verified_at timestamptz,
  notes text,
  alert_30_day boolean DEFAULT false,
  alert_60_day boolean DEFAULT false,
  alert_90_day boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE provider_credentials_tracker ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Providers can manage own credentials"
  ON provider_credentials_tracker FOR ALL TO authenticated
  USING (provider_id = auth.uid());

CREATE POLICY "Admins can view all credentials"
  ON provider_credentials_tracker FOR SELECT TO service_role
  USING (true);

CREATE INDEX idx_credentials_provider ON provider_credentials_tracker(provider_id);
CREATE INDEX idx_credentials_status ON provider_credentials_tracker(status);
CREATE INDEX idx_credentials_expiration ON provider_credentials_tracker(expiration_date);

-- ============================================
-- 5. TRIGGERS FOR updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_provider_referrals_updated') THEN
    CREATE TRIGGER trg_provider_referrals_updated BEFORE UPDATE ON provider_referrals
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_provider_availability_updated') THEN
    CREATE TRIGGER trg_provider_availability_updated BEFORE UPDATE ON provider_availability
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_care_teams_updated') THEN
    CREATE TRIGGER trg_care_teams_updated BEFORE UPDATE ON care_teams
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_credentials_tracker_updated') THEN
    CREATE TRIGGER trg_credentials_tracker_updated BEFORE UPDATE ON provider_credentials_tracker
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;
