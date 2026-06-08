-- group_sessions + enrollments
-- Powers the BCBA Group Office Hours product: up to 4 families, $50/family cash-pay,
-- auto-cancel if minimum enrollment not met 24h before session.
-- Discoverable in the marketplace "Group Training" tab.

CREATE TABLE IF NOT EXISTS group_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  topic_category TEXT,               -- sleep | meltdowns | school | transitions | feeding | sensory | social | other
  description TEXT,
  session_date TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  price_per_family_cents INTEGER NOT NULL DEFAULT 5000,  -- $50
  max_families INTEGER NOT NULL DEFAULT 4,
  min_families INTEGER NOT NULL DEFAULT 2,               -- auto-cancel if not reached
  enrolled_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'confirmed', 'cancelled', 'completed')),
  cancellation_deadline TIMESTAMPTZ,                     -- computed: session_date - interval '24h'
  meeting_url TEXT,                                      -- Daily.co room URL
  provider_name TEXT,
  provider_credentials TEXT,
  provider_photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS group_session_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_session_id UUID REFERENCES group_sessions(id) ON DELETE CASCADE,
  family_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  parent_name TEXT,
  child_name TEXT,
  payment_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'paid', 'refunded')),
  stripe_payment_intent_id TEXT,
  amount_paid_cents INTEGER,
  platform_fee_cents INTEGER,        -- Aminy 20% = $10/family
  provider_payout_cents INTEGER,     -- BCBA 80% = $40/family
  enrolled_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for marketplace and provider portal queries
CREATE INDEX IF NOT EXISTS group_sessions_provider_idx ON group_sessions(provider_id);
CREATE INDEX IF NOT EXISTS group_sessions_date_idx ON group_sessions(session_date DESC);
CREATE INDEX IF NOT EXISTS group_sessions_status_idx ON group_sessions(status);
CREATE INDEX IF NOT EXISTS group_sessions_category_idx ON group_sessions(topic_category);
CREATE INDEX IF NOT EXISTS group_enrollments_session_idx ON group_session_enrollments(group_session_id);
CREATE INDEX IF NOT EXISTS group_enrollments_family_idx ON group_session_enrollments(family_id);

-- RLS: providers manage their own sessions; families see open/confirmed sessions
ALTER TABLE group_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_session_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "group_sessions_public_read" ON group_sessions
  FOR SELECT USING (status IN ('open', 'confirmed'));

CREATE POLICY IF NOT EXISTS "group_sessions_provider_write" ON group_sessions
  FOR ALL USING (provider_id = auth.uid());

CREATE POLICY IF NOT EXISTS "group_enrollments_family_access" ON group_session_enrollments
  FOR ALL USING (family_id = auth.uid());

CREATE POLICY IF NOT EXISTS "group_enrollments_provider_read" ON group_session_enrollments
  FOR SELECT USING (
    group_session_id IN (
      SELECT id FROM group_sessions WHERE provider_id = auth.uid()
    )
  );

-- updated_at trigger
CREATE OR REPLACE FUNCTION update_group_sessions_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS group_sessions_updated_at ON group_sessions;
CREATE TRIGGER group_sessions_updated_at
  BEFORE UPDATE ON group_sessions
  FOR EACH ROW EXECUTE FUNCTION update_group_sessions_updated_at();
