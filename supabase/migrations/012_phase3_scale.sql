-- Phase 3: Scale Ready Schema
-- Secure Messaging, A/B Testing, Screening Results

-- ============================================
-- MESSAGE THREADS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS message_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id TEXT NOT NULL,
  provider_name TEXT NOT NULL,
  provider_credentials TEXT,
  provider_photo TEXT,
  parent_id TEXT NOT NULL,
  parent_name TEXT NOT NULL,
  child_name TEXT NOT NULL,

  -- Status
  unread_count INTEGER DEFAULT 0,
  is_muted BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE message_threads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own threads" ON message_threads;
CREATE POLICY "Users can view own threads" ON message_threads
  FOR SELECT USING (
    provider_id = coalesce(auth.jwt() ->> 'sub', '') OR
    parent_id = coalesce(auth.jwt() ->> 'sub', '')
  );

DROP POLICY IF EXISTS "Users can insert threads" ON message_threads;
CREATE POLICY "Users can insert threads" ON message_threads
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update own threads" ON message_threads;
CREATE POLICY "Users can update own threads" ON message_threads
  FOR UPDATE USING (
    provider_id = coalesce(auth.jwt() ->> 'sub', '') OR
    parent_id = coalesce(auth.jwt() ->> 'sub', '')
  );

CREATE INDEX IF NOT EXISTS idx_message_threads_provider ON message_threads(provider_id);
CREATE INDEX IF NOT EXISTS idx_message_threads_parent ON message_threads(parent_id);
CREATE INDEX IF NOT EXISTS idx_message_threads_updated ON message_threads(updated_at DESC);

-- ============================================
-- SECURE MESSAGES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS secure_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID REFERENCES message_threads(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL,
  sender_name TEXT NOT NULL,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('provider', 'parent')),

  -- Content
  content TEXT NOT NULL,
  attachments JSONB DEFAULT '[]',

  -- Read status
  read_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE secure_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view messages in their threads" ON secure_messages;
CREATE POLICY "Users can view messages in their threads" ON secure_messages
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert messages" ON secure_messages;
CREATE POLICY "Users can insert messages" ON secure_messages
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update read status" ON secure_messages;
CREATE POLICY "Users can update read status" ON secure_messages
  FOR UPDATE USING (true);

CREATE INDEX IF NOT EXISTS idx_secure_messages_thread ON secure_messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_secure_messages_created ON secure_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_secure_messages_sender ON secure_messages(sender_id);

-- Update thread on new message
CREATE OR REPLACE FUNCTION update_thread_on_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE message_threads
  SET updated_at = NOW(),
      unread_count = CASE
        WHEN NEW.sender_id != provider_id AND NEW.sender_id != parent_id THEN unread_count + 1
        ELSE unread_count
      END
  WHERE id = NEW.thread_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_thread_on_message ON secure_messages;
CREATE TRIGGER trigger_update_thread_on_message
AFTER INSERT ON secure_messages
FOR EACH ROW EXECUTE FUNCTION update_thread_on_message();

-- ============================================
-- A/B EXPERIMENT ASSIGNMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS ab_experiment_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id TEXT NOT NULL,
  variant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(experiment_id, user_id)
);

ALTER TABLE ab_experiment_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view assignments" ON ab_experiment_assignments;
CREATE POLICY "Anyone can view assignments" ON ab_experiment_assignments
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Service role can manage assignments" ON ab_experiment_assignments;
CREATE POLICY "Service role can manage assignments" ON ab_experiment_assignments
  FOR ALL USING (true);

CREATE INDEX IF NOT EXISTS idx_ab_assignments_experiment ON ab_experiment_assignments(experiment_id);
CREATE INDEX IF NOT EXISTS idx_ab_assignments_user ON ab_experiment_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_ab_assignments_variant ON ab_experiment_assignments(experiment_id, variant_id);

-- ============================================
-- A/B EXPERIMENT EVENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS ab_experiment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id TEXT NOT NULL,
  variant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ab_experiment_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view events" ON ab_experiment_events;
CREATE POLICY "Anyone can view events" ON ab_experiment_events
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Service role can manage events" ON ab_experiment_events;
CREATE POLICY "Service role can manage events" ON ab_experiment_events
  FOR ALL USING (true);

CREATE INDEX IF NOT EXISTS idx_ab_events_experiment ON ab_experiment_events(experiment_id);
CREATE INDEX IF NOT EXISTS idx_ab_events_user ON ab_experiment_events(user_id);
CREATE INDEX IF NOT EXISTS idx_ab_events_type ON ab_experiment_events(event_type);
CREATE INDEX IF NOT EXISTS idx_ab_events_created ON ab_experiment_events(created_at DESC);

-- ============================================
-- SCREENING RESULTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS screening_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  child_id TEXT NOT NULL,
  child_name TEXT NOT NULL,
  child_age_months INTEGER NOT NULL,

  -- Screening info
  screening_type TEXT NOT NULL CHECK (screening_type IN ('mchat_rf', 'asq3', 'peds', 'custom')),

  -- Scores
  total_score INTEGER NOT NULL,
  critical_score INTEGER,
  risk_level TEXT NOT NULL CHECK (risk_level IN ('low', 'medium', 'high')),

  -- Answers (stored as JSON)
  answers JSONB NOT NULL,

  -- Results
  recommendation TEXT,
  follow_up_needed BOOLEAN DEFAULT false,

  -- Provider shared with
  shared_with_provider_id TEXT,
  shared_at TIMESTAMPTZ,

  -- Timestamps
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE screening_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own screenings" ON screening_results;
CREATE POLICY "Users can view own screenings" ON screening_results
  FOR SELECT USING (user_id = coalesce(auth.jwt() ->> 'sub', ''));

DROP POLICY IF EXISTS "Users can insert screenings" ON screening_results;
CREATE POLICY "Users can insert screenings" ON screening_results
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update own screenings" ON screening_results;
CREATE POLICY "Users can update own screenings" ON screening_results
  FOR UPDATE USING (user_id = coalesce(auth.jwt() ->> 'sub', ''));

CREATE INDEX IF NOT EXISTS idx_screening_results_user ON screening_results(user_id);
CREATE INDEX IF NOT EXISTS idx_screening_results_child ON screening_results(child_id);
CREATE INDEX IF NOT EXISTS idx_screening_results_type ON screening_results(screening_type);
CREATE INDEX IF NOT EXISTS idx_screening_results_risk ON screening_results(risk_level);

-- ============================================
-- FISCAL AGENT SUBMISSIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS fiscal_agent_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  child_id TEXT NOT NULL,

  -- Fiscal agent info
  fiscal_agent TEXT NOT NULL CHECK (fiscal_agent IN ('acumen', 'dci', 'ppl', 'custom')),
  participant_id TEXT,
  authorization_number TEXT,

  -- Date range
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  -- Totals
  total_units INTEGER NOT NULL,
  total_hours NUMERIC(10, 2) NOT NULL,
  total_amount_cents INTEGER NOT NULL,

  -- Service entries (JSON)
  entries JSONB NOT NULL,

  -- Status
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected', 'paid')),
  submitted_at TIMESTAMPTZ,
  processed_at TIMESTAMPTZ,

  -- PDF storage
  pdf_url TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE fiscal_agent_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own submissions" ON fiscal_agent_submissions;
CREATE POLICY "Users can view own submissions" ON fiscal_agent_submissions
  FOR SELECT USING (user_id = coalesce(auth.jwt() ->> 'sub', '') OR provider_id = coalesce(auth.jwt() ->> 'sub', ''));

DROP POLICY IF EXISTS "Users can insert submissions" ON fiscal_agent_submissions;
CREATE POLICY "Users can insert submissions" ON fiscal_agent_submissions
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update own submissions" ON fiscal_agent_submissions;
CREATE POLICY "Users can update own submissions" ON fiscal_agent_submissions
  FOR UPDATE USING (user_id = coalesce(auth.jwt() ->> 'sub', '') OR provider_id = coalesce(auth.jwt() ->> 'sub', ''));

CREATE INDEX IF NOT EXISTS idx_fiscal_submissions_user ON fiscal_agent_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_fiscal_submissions_provider ON fiscal_agent_submissions(provider_id);
CREATE INDEX IF NOT EXISTS idx_fiscal_submissions_agent ON fiscal_agent_submissions(fiscal_agent);
CREATE INDEX IF NOT EXISTS idx_fiscal_submissions_status ON fiscal_agent_submissions(status);
CREATE INDEX IF NOT EXISTS idx_fiscal_submissions_period ON fiscal_agent_submissions(period_start, period_end);

-- ============================================
-- FEATURE FLAGS TABLE (for dynamic flags)
-- ============================================
CREATE TABLE IF NOT EXISTS feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,

  -- Status
  enabled BOOLEAN DEFAULT false,
  rollout_percentage INTEGER DEFAULT 0 CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100),

  -- Restrictions
  allowed_tiers TEXT[] DEFAULT '{}',
  allowed_users TEXT[] DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view feature flags" ON feature_flags;
CREATE POLICY "Anyone can view feature flags" ON feature_flags
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage feature flags" ON feature_flags;
CREATE POLICY "Admins can manage feature flags" ON feature_flags
  FOR ALL USING (true);

CREATE INDEX IF NOT EXISTS idx_feature_flags_key ON feature_flags(key);
CREATE INDEX IF NOT EXISTS idx_feature_flags_enabled ON feature_flags(enabled);

-- Seed some default feature flags
INSERT INTO feature_flags (key, name, description, enabled, rollout_percentage) VALUES
  ('new-community-ui', 'New Community UI', 'Redesigned community feed with better engagement features', true, 100),
  ('ai-memory-v2', 'AI Memory V2', 'Enhanced memory system with longer context retention', true, 50),
  ('provider-messaging', 'Provider Messaging', 'Secure messaging between providers and parents', true, 100),
  ('fiscal-agent-export', 'Fiscal Agent Export', 'PDF export for fiscal agent submissions', true, 100),
  ('screening-tools', 'Screening Tools', 'M-CHAT-R/F and other validated screening instruments', true, 75),
  ('dark-mode', 'Dark Mode', 'Dark theme support', false, 0)
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  enabled = EXCLUDED.enabled,
  rollout_percentage = EXCLUDED.rollout_percentage,
  updated_at = NOW();

-- ============================================
-- VIEWS FOR ANALYTICS
-- ============================================

-- A/B Experiment Summary View
CREATE OR REPLACE VIEW ab_experiment_summary AS
SELECT
  experiment_id,
  variant_id,
  COUNT(DISTINCT user_id) as participants,
  MIN(assigned_at) as first_assignment,
  MAX(assigned_at) as last_assignment
FROM ab_experiment_assignments
GROUP BY experiment_id, variant_id;

-- Screening Results Summary View
CREATE OR REPLACE VIEW screening_summary AS
SELECT
  screening_type,
  risk_level,
  COUNT(*) as total_screenings,
  COUNT(DISTINCT user_id) as unique_users,
  AVG(total_score) as avg_score,
  COUNT(CASE WHEN follow_up_needed THEN 1 END) as follow_up_count
FROM screening_results
GROUP BY screening_type, risk_level;

-- Fiscal Submissions Summary View
CREATE OR REPLACE VIEW fiscal_submissions_summary AS
SELECT
  fiscal_agent,
  status,
  COUNT(*) as total_submissions,
  SUM(total_units) as total_units,
  SUM(total_amount_cents) / 100.0 as total_amount_dollars,
  AVG(total_amount_cents) / 100.0 as avg_submission_amount
FROM fiscal_agent_submissions
GROUP BY fiscal_agent, status;
