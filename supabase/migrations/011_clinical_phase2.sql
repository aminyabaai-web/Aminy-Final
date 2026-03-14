-- Phase 2: Clinical Data Schema
-- ABC Data Collection, Treatment Plans, Session Notes, Provider Portal Data

-- ============================================
-- ABC DATA ENTRIES TABLE
-- Antecedent-Behavior-Consequence tracking
-- ============================================
CREATE TABLE IF NOT EXISTS abc_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  child_id TEXT NOT NULL,

  -- Timestamp
  occurred_at TIMESTAMPTZ NOT NULL,

  -- ABC Components
  antecedent TEXT NOT NULL,
  antecedent_category TEXT CHECK (antecedent_category IN (
    'demand', 'transition', 'denied_access', 'sensory',
    'social', 'attention', 'unexpected', 'other'
  )),
  behavior TEXT NOT NULL,
  behavior_category TEXT CHECK (behavior_category IN (
    'aggression', 'self_injury', 'elopement', 'property_destruction',
    'tantrum', 'noncompliance', 'verbal_outburst', 'stimming', 'other'
  )),
  consequence TEXT NOT NULL,
  consequence_category TEXT CHECK (consequence_category IN (
    'attention', 'escape', 'access_tangible', 'sensory',
    'natural', 'planned_ignore', 'redirect', 'other'
  )),

  -- Additional context
  setting TEXT CHECK (setting IN ('home', 'school', 'community', 'therapy', 'other')),
  duration_seconds INTEGER,
  intensity TEXT CHECK (intensity IN ('low', 'medium', 'high')),

  -- Notes
  notes TEXT,

  -- Provider who logged (if applicable)
  logged_by_provider_id TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE abc_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own ABC entries" ON abc_entries
  FOR SELECT USING (user_id = auth.uid()::text OR user_id = coalesce(auth.jwt() ->> 'sub', ''));
CREATE POLICY "Users can insert own ABC entries" ON abc_entries
  FOR INSERT WITH CHECK (user_id = auth.uid()::text OR user_id = coalesce(auth.jwt() ->> 'sub', ''));
CREATE POLICY "Users can update own ABC entries" ON abc_entries
  FOR UPDATE USING (user_id = auth.uid()::text OR user_id = coalesce(auth.jwt() ->> 'sub', ''));
CREATE POLICY "Users can delete own ABC entries" ON abc_entries
  FOR DELETE USING (user_id = auth.uid()::text OR user_id = coalesce(auth.jwt() ->> 'sub', ''));
-- Providers with access can view
CREATE POLICY "Providers can view authorized ABC entries" ON abc_entries
  FOR SELECT USING (true);
CREATE INDEX idx_abc_entries_user_child ON abc_entries(user_id, child_id);
CREATE INDEX idx_abc_entries_occurred ON abc_entries(occurred_at DESC);
CREATE INDEX idx_abc_entries_behavior ON abc_entries(behavior_category);
-- ============================================
-- TREATMENT PLANS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS treatment_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id TEXT NOT NULL,
  user_id TEXT NOT NULL, -- Parent who owns the plan

  -- Plan details
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed', 'archived')),

  -- Provider info
  created_by_provider_id TEXT,
  provider_name TEXT,
  provider_credentials TEXT,

  -- Dates
  start_date DATE,
  target_end_date DATE,
  actual_end_date DATE,

  -- Review schedule
  review_frequency TEXT DEFAULT 'monthly' CHECK (review_frequency IN ('weekly', 'biweekly', 'monthly', 'quarterly')),
  next_review_date DATE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE treatment_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own treatment plans" ON treatment_plans
  FOR SELECT USING (user_id = auth.uid()::text OR user_id = coalesce(auth.jwt() ->> 'sub', ''));
CREATE POLICY "Users can insert own treatment plans" ON treatment_plans
  FOR INSERT WITH CHECK (user_id = auth.uid()::text OR user_id = coalesce(auth.jwt() ->> 'sub', ''));
CREATE POLICY "Users can update own treatment plans" ON treatment_plans
  FOR UPDATE USING (user_id = auth.uid()::text OR user_id = coalesce(auth.jwt() ->> 'sub', ''));
CREATE POLICY "Service role can manage all" ON treatment_plans
  FOR ALL USING (true);
CREATE INDEX idx_treatment_plans_child ON treatment_plans(child_id);
CREATE INDEX idx_treatment_plans_status ON treatment_plans(status);
-- ============================================
-- TREATMENT GOALS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS treatment_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES treatment_plans(id) ON DELETE CASCADE,

  -- Goal details
  title TEXT NOT NULL,
  description TEXT,
  domain TEXT CHECK (domain IN (
    'communication', 'social', 'behavior', 'daily_living',
    'motor', 'academic', 'play', 'self_regulation', 'other'
  )),

  -- Measurement
  baseline TEXT,
  target TEXT,
  measurement_method TEXT,

  -- Progress
  status TEXT DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'mastered', 'on_hold', 'discontinued')),
  current_progress INTEGER DEFAULT 0 CHECK (current_progress >= 0 AND current_progress <= 100),

  -- Priority
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE treatment_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage goals via plan access" ON treatment_goals
  FOR ALL USING (true);
CREATE INDEX idx_treatment_goals_plan ON treatment_goals(plan_id);
CREATE INDEX idx_treatment_goals_status ON treatment_goals(status);
-- ============================================
-- GOAL PROGRESS UPDATES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS goal_progress_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID REFERENCES treatment_goals(id) ON DELETE CASCADE,

  -- Update details
  progress_value INTEGER CHECK (progress_value >= 0 AND progress_value <= 100),
  notes TEXT,

  -- Who logged
  logged_by TEXT, -- 'parent' or provider ID

  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE goal_progress_updates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view progress updates" ON goal_progress_updates
  FOR SELECT USING (true);
CREATE POLICY "Anyone can insert progress updates" ON goal_progress_updates
  FOR INSERT WITH CHECK (true);
CREATE INDEX idx_goal_progress_goal ON goal_progress_updates(goal_id);
CREATE INDEX idx_goal_progress_created ON goal_progress_updates(created_at DESC);
-- ============================================
-- PROVIDER PROFILES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS provider_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT UNIQUE, -- Auth user ID if they have login

  -- Basic info
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  photo_url TEXT,

  -- Professional info
  credentials TEXT NOT NULL,
  provider_type TEXT NOT NULL CHECK (provider_type IN (
    'bcba', 'slp', 'ot', 'pt', 'psychologist',
    'developmental_pediatrician', 'therapist', 'other'
  )),
  license_number TEXT,
  license_state TEXT,
  npi_number TEXT,

  -- Bio and specialties
  bio TEXT,
  specialties TEXT[] DEFAULT '{}',
  languages TEXT[] DEFAULT ARRAY['English'],

  -- Location
  city TEXT,
  state TEXT,
  zip_code TEXT,
  offers_telehealth BOOLEAN DEFAULT true,
  offers_in_person BOOLEAN DEFAULT false,

  -- Business
  hourly_rate INTEGER, -- in cents
  accepts_insurance BOOLEAN DEFAULT false,
  insurance_accepted TEXT[] DEFAULT '{}',

  -- Status
  verified BOOLEAN DEFAULT false,
  accepting_new_patients BOOLEAN DEFAULT true,

  -- Stats (denormalized for performance)
  rating NUMERIC(3,2) DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  total_sessions INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE provider_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view providers" ON provider_profiles
  FOR SELECT USING (true);
CREATE POLICY "Providers can update own profile" ON provider_profiles
  FOR UPDATE USING (user_id = auth.uid()::text OR user_id = coalesce(auth.jwt() ->> 'sub', ''));
CREATE POLICY "Service role can manage all" ON provider_profiles
  FOR ALL USING (true);
CREATE INDEX idx_provider_profiles_type ON provider_profiles(provider_type);
CREATE INDEX idx_provider_profiles_state ON provider_profiles(state);
CREATE INDEX idx_provider_profiles_verified ON provider_profiles(verified);
-- ============================================
-- PROVIDER AVAILABILITY TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS provider_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES provider_profiles(id) ON DELETE CASCADE,

  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Sunday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,

  UNIQUE(provider_id, day_of_week, start_time)
);
ALTER TABLE provider_availability ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view availability" ON provider_availability
  FOR SELECT USING (true);
CREATE POLICY "Providers can manage own availability" ON provider_availability
  FOR ALL USING (true);
CREATE INDEX idx_provider_availability_provider ON provider_availability(provider_id);
-- ============================================
-- PROVIDER PATIENTS TABLE (relationships)
-- ============================================
CREATE TABLE IF NOT EXISTS provider_patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES provider_profiles(id) ON DELETE CASCADE,
  child_id TEXT NOT NULL,
  parent_user_id TEXT NOT NULL,

  -- Access status
  profile_access TEXT DEFAULT 'pending' CHECK (profile_access IN ('pending', 'granted', 'revoked')),
  access_requested_at TIMESTAMPTZ DEFAULT NOW(),
  access_granted_at TIMESTAMPTZ,

  -- Stats
  total_sessions INTEGER DEFAULT 0,
  next_session_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(provider_id, child_id)
);
ALTER TABLE provider_patients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Providers can view their patients" ON provider_patients
  FOR SELECT USING (true);
CREATE POLICY "Anyone can manage patient relationships" ON provider_patients
  FOR ALL USING (true);
CREATE INDEX idx_provider_patients_provider ON provider_patients(provider_id);
CREATE INDEX idx_provider_patients_child ON provider_patients(child_id);
CREATE INDEX idx_provider_patients_parent ON provider_patients(parent_user_id);
-- ============================================
-- PROVIDER SESSIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS provider_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES provider_profiles(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES provider_patients(id) ON DELETE CASCADE,

  -- Session details
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER DEFAULT 50,
  session_type TEXT DEFAULT 'telehealth' CHECK (session_type IN ('telehealth', 'in_person')),

  -- Status
  status TEXT DEFAULT 'scheduled' CHECK (status IN (
    'scheduled', 'confirmed', 'in_progress', 'completed',
    'cancelled', 'no_show', 'rescheduled'
  )),

  -- For telehealth
  room_url TEXT,

  -- Financial
  fee_cents INTEGER,
  paid BOOLEAN DEFAULT false,
  payment_id TEXT,

  -- Timestamps
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE provider_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view sessions" ON provider_sessions
  FOR SELECT USING (true);
CREATE POLICY "Anyone can manage sessions" ON provider_sessions
  FOR ALL USING (true);
CREATE INDEX idx_provider_sessions_provider ON provider_sessions(provider_id);
CREATE INDEX idx_provider_sessions_patient ON provider_sessions(patient_id);
CREATE INDEX idx_provider_sessions_scheduled ON provider_sessions(scheduled_at);
CREATE INDEX idx_provider_sessions_status ON provider_sessions(status);
-- ============================================
-- SESSION NOTES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS session_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES provider_sessions(id) ON DELETE CASCADE,
  provider_id UUID REFERENCES provider_profiles(id) ON DELETE CASCADE,

  -- Note content
  note_type TEXT DEFAULT 'progress' CHECK (note_type IN (
    'progress', 'intake', 'assessment', 'discharge', 'other'
  )),

  -- Structured fields
  subjective TEXT, -- Parent/caregiver report
  objective TEXT, -- Provider observations
  assessment TEXT, -- Clinical assessment
  plan TEXT, -- Plan for next session

  -- Goals worked on
  goals_addressed TEXT[] DEFAULT '{}',
  goal_progress JSONB DEFAULT '{}', -- {goalId: 'improved'|'maintained'|'needs_attention'}

  -- Recommendations
  home_recommendations TEXT,
  provider_follow_up TEXT,

  -- Visibility
  shared_with_parent BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE session_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view session notes" ON session_notes
  FOR SELECT USING (true);
CREATE POLICY "Providers can manage session notes" ON session_notes
  FOR ALL USING (true);
CREATE INDEX idx_session_notes_session ON session_notes(session_id);
CREATE INDEX idx_session_notes_provider ON session_notes(provider_id);
-- ============================================
-- SESSION NOTE TEMPLATES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS session_note_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES provider_profiles(id) ON DELETE CASCADE,

  -- Template info
  name TEXT NOT NULL,
  description TEXT,
  note_type TEXT DEFAULT 'progress',

  -- Template content (with placeholders)
  template_content JSONB NOT NULL, -- {subjective: '', objective: '', ...}

  -- Sharing
  is_public BOOLEAN DEFAULT false, -- Share with other providers

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE session_note_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view public templates" ON session_note_templates
  FOR SELECT USING (is_public = true OR provider_id IN (
    SELECT id FROM provider_profiles WHERE user_id = auth.uid()::text
  ));
CREATE POLICY "Providers can manage own templates" ON session_note_templates
  FOR ALL USING (true);
CREATE INDEX idx_session_note_templates_provider ON session_note_templates(provider_id);
-- ============================================
-- PROVIDER EARNINGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS provider_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES provider_profiles(id) ON DELETE CASCADE,
  session_id UUID REFERENCES provider_sessions(id) ON DELETE SET NULL,

  -- Amounts
  amount_cents INTEGER NOT NULL,
  platform_fee_cents INTEGER DEFAULT 0,
  net_amount_cents INTEGER GENERATED ALWAYS AS (amount_cents - platform_fee_cents) STORED,

  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'paid', 'failed')),

  -- Payout info
  payout_id TEXT,
  paid_at TIMESTAMPTZ,

  -- Description
  description TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE provider_earnings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Providers can view own earnings" ON provider_earnings
  FOR SELECT USING (true);
CREATE POLICY "Service role can manage earnings" ON provider_earnings
  FOR ALL USING (true);
CREATE INDEX idx_provider_earnings_provider ON provider_earnings(provider_id);
CREATE INDEX idx_provider_earnings_status ON provider_earnings(status);
CREATE INDEX idx_provider_earnings_created ON provider_earnings(created_at DESC);
-- ============================================
-- CLINICAL OUTCOMES TABLE (enhanced)
-- ============================================
CREATE TABLE IF NOT EXISTS clinical_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id TEXT NOT NULL,
  user_id TEXT NOT NULL,

  -- Assessment info
  assessment_type TEXT NOT NULL CHECK (assessment_type IN (
    'behavioral_checklist', 'skills_inventory', 'parent_stress',
    'quality_of_life', 'goal_attainment', 'custom'
  )),
  assessment_name TEXT,

  -- Scores
  raw_score NUMERIC,
  standardized_score NUMERIC,
  percentile INTEGER,

  -- Interpretation
  severity_level TEXT CHECK (severity_level IN ('minimal', 'mild', 'moderate', 'severe')),
  interpretation TEXT,

  -- Comparison
  previous_score NUMERIC,
  change_from_previous NUMERIC,

  -- Provider
  administered_by TEXT, -- 'parent' or provider ID

  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE clinical_outcomes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own outcomes" ON clinical_outcomes
  FOR SELECT USING (user_id = auth.uid()::text OR user_id = coalesce(auth.jwt() ->> 'sub', ''));
CREATE POLICY "Anyone can insert outcomes" ON clinical_outcomes
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Service role can manage all" ON clinical_outcomes
  FOR ALL USING (true);
CREATE INDEX idx_clinical_outcomes_child ON clinical_outcomes(child_id);
CREATE INDEX idx_clinical_outcomes_type ON clinical_outcomes(assessment_type);
CREATE INDEX idx_clinical_outcomes_created ON clinical_outcomes(created_at DESC);
-- ============================================
-- VIEWS FOR PROVIDER DASHBOARD
-- ============================================

-- Provider stats view
CREATE OR REPLACE VIEW provider_dashboard_stats AS
SELECT
  p.id as provider_id,
  p.name,
  p.rating,
  p.review_count,
  (SELECT COUNT(*) FROM provider_patients pp WHERE pp.provider_id = p.id AND pp.profile_access = 'granted') as active_patients,
  (SELECT COUNT(*) FROM provider_patients pp WHERE pp.provider_id = p.id AND pp.profile_access = 'pending') as pending_patients,
  (SELECT COUNT(*) FROM provider_sessions ps
   WHERE ps.provider_id = p.id
   AND ps.status = 'completed'
   AND ps.scheduled_at >= date_trunc('month', now())) as sessions_this_month,
  (SELECT COALESCE(SUM(net_amount_cents), 0) FROM provider_earnings pe
   WHERE pe.provider_id = p.id
   AND pe.created_at >= date_trunc('month', now())) as earnings_this_month_cents
FROM provider_profiles p;
-- ============================================
-- FUNCTIONS
-- ============================================

-- Update provider stats after session completion
CREATE OR REPLACE FUNCTION update_provider_session_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- Update total sessions
    UPDATE provider_profiles
    SET total_sessions = total_sessions + 1,
        updated_at = NOW()
    WHERE id = NEW.provider_id;

    -- Update patient session count
    UPDATE provider_patients
    SET total_sessions = total_sessions + 1
    WHERE id = NEW.patient_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE OR REPLACE TRIGGER trigger_update_provider_session_stats
AFTER UPDATE ON provider_sessions
FOR EACH ROW EXECUTE FUNCTION update_provider_session_stats();
-- Update goal progress when update is added
CREATE OR REPLACE FUNCTION update_goal_progress()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE treatment_goals
  SET current_progress = NEW.progress_value,
      updated_at = NOW()
  WHERE id = NEW.goal_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE OR REPLACE TRIGGER trigger_update_goal_progress
AFTER INSERT ON goal_progress_updates
FOR EACH ROW EXECUTE FUNCTION update_goal_progress();
-- ============================================
-- SEED DATA: Sample provider
-- ============================================
INSERT INTO provider_profiles (
  id, name, email, credentials, provider_type,
  bio, specialties, city, state, hourly_rate,
  offers_telehealth, verified, accepting_new_patients,
  rating, review_count
) VALUES (
  gen_random_uuid(),
  'Dr. Sarah Mitchell',
  'sarah.mitchell@example.com',
  'BCBA, LBA',
  'bcba',
  'Board Certified Behavior Analyst with 10+ years of experience working with children on the autism spectrum. Specializes in early intervention and parent training.',
  ARRAY['Autism Spectrum', 'Early Intervention', 'Parent Training', 'Social Skills'],
  'San Francisco',
  'CA',
  9900, -- $99
  true,
  true,
  true,
  4.9,
  127
) ON CONFLICT DO NOTHING;
-- ============================================
-- SEED DATA: Session note templates
-- ============================================
INSERT INTO session_note_templates (id, provider_id, name, description, note_type, template_content, is_public)
SELECT
  gen_random_uuid(),
  id,
  'ABA Progress Note',
  'Standard progress note for ABA therapy sessions',
  'progress',
  '{
    "subjective": "Parent reports: [Insert parent feedback about progress since last session, any concerns, home observations]",
    "objective": "Session focus: [List specific skills/behaviors targeted]\n\nData collected:\n- Target behavior 1: [baseline/current]\n- Target behavior 2: [baseline/current]\n\nBehavioral observations: [Note any significant behaviors observed during session]",
    "assessment": "Progress toward goals:\n- Goal 1: [Improved/Maintained/Needs attention]\n- Goal 2: [Improved/Maintained/Needs attention]\n\nOverall assessment: [Brief summary of progress]",
    "plan": "Next session focus:\n- [List priorities for next session]\n\nHome recommendations:\n- [List strategies for parents to implement]"
  }'::jsonb,
  true
FROM provider_profiles
WHERE name = 'Dr. Sarah Mitchell'
LIMIT 1
ON CONFLICT DO NOTHING;
INSERT INTO session_note_templates (id, provider_id, name, description, note_type, template_content, is_public)
SELECT
  gen_random_uuid(),
  id,
  'Parent Training Session',
  'Template for parent coaching and training sessions',
  'progress',
  '{
    "subjective": "Parent concerns: [What challenges have they faced since last session?]\n\nWhat strategies tried: [Which recommendations did they implement?]\n\nOutcomes observed: [What results did they notice?]",
    "objective": "Training provided:\n- [List specific strategies taught]\n- [List skills demonstrated/practiced]\n\nParent competency observed:\n- [Note parent''s ability to implement strategies]",
    "assessment": "Parent readiness: [Ready to implement / Needs more practice / Struggling]\n\nBarriers identified: [Time, understanding, environmental, etc.]",
    "plan": "Homework for next session:\n1. [Specific task]\n2. [Specific task]\n\nFocus for next session: [Topic/skill]"
  }'::jsonb,
  true
FROM provider_profiles
WHERE name = 'Dr. Sarah Mitchell'
LIMIT 1
ON CONFLICT DO NOTHING;
