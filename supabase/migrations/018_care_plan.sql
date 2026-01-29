-- ============================================================================
-- Migration: 018_care_plan.sql
-- Description: Care Plan tables for visit summaries and action items
-- ============================================================================

-- Visit Summaries Table
CREATE TABLE IF NOT EXISTS visit_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES telehealth_appointments(id) ON DELETE SET NULL,
  provider_id UUID REFERENCES providers(id) ON DELETE SET NULL,

  -- Visit details
  reason_for_visit TEXT NOT NULL,
  what_we_discussed TEXT[] NOT NULL DEFAULT '{}',
  plan_for_next_7_days TEXT[] NOT NULL DEFAULT '{}',
  what_to_track TEXT[] NOT NULL DEFAULT '{}',
  follow_up_recommendation TEXT,

  -- Child context (optional)
  child_id UUID REFERENCES child_profiles(id) ON DELETE SET NULL,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_visit_summaries_user_id ON visit_summaries(user_id);
CREATE INDEX IF NOT EXISTS idx_visit_summaries_provider_id ON visit_summaries(provider_id);
CREATE INDEX IF NOT EXISTS idx_visit_summaries_created_at ON visit_summaries(created_at DESC);

-- RLS Policies
ALTER TABLE visit_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own visit summaries"
  ON visit_summaries
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own visit summaries"
  ON visit_summaries
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own visit summaries"
  ON visit_summaries
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own visit summaries"
  ON visit_summaries
  FOR DELETE
  USING (auth.uid() = user_id);

-- Providers can view and create summaries for their patients
CREATE POLICY "Providers can view patient visit summaries"
  ON visit_summaries
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM providers
      WHERE providers.id = visit_summaries.provider_id
      AND providers.user_id = auth.uid()
    )
  );

CREATE POLICY "Providers can create patient visit summaries"
  ON visit_summaries
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM providers
      WHERE providers.id = provider_id
      AND providers.user_id = auth.uid()
    )
  );

-- ============================================================================
-- Action Items Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS care_plan_action_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  visit_summary_id UUID REFERENCES visit_summaries(id) ON DELETE SET NULL,

  -- Action item details
  title TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMPTZ,
  priority TEXT CHECK (priority IN ('low', 'medium', 'high')) DEFAULT 'medium',

  -- Completion tracking
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,

  -- Source of the action item
  source TEXT NOT NULL CHECK (source IN ('visit-summary', 'ai-suggestion', 'self-created', 'provider')),

  -- Child context (optional)
  child_id UUID REFERENCES child_profiles(id) ON DELETE SET NULL,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_action_items_user_id ON care_plan_action_items(user_id);
CREATE INDEX IF NOT EXISTS idx_action_items_completed ON care_plan_action_items(completed);
CREATE INDEX IF NOT EXISTS idx_action_items_due_date ON care_plan_action_items(due_date);
CREATE INDEX IF NOT EXISTS idx_action_items_visit_summary ON care_plan_action_items(visit_summary_id);

-- RLS Policies
ALTER TABLE care_plan_action_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own action items"
  ON care_plan_action_items
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own action items"
  ON care_plan_action_items
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own action items"
  ON care_plan_action_items
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own action items"
  ON care_plan_action_items
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- Care Plan Goals Table (for daily/living plan goals)
-- ============================================================================

CREATE TABLE IF NOT EXISTS care_plan_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  child_id UUID REFERENCES child_profiles(id) ON DELETE SET NULL,

  -- Goal details
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN (
    'daily-routine', 'communication', 'sensory', 'social',
    'self-care', 'behavior', 'academic', 'motor', 'other'
  )),

  -- Progress tracking
  target_frequency TEXT, -- e.g., "daily", "3x per week"
  current_progress INTEGER DEFAULT 0,
  target_progress INTEGER DEFAULT 100,
  unit TEXT, -- e.g., "times", "minutes", "percent"

  -- Status
  status TEXT NOT NULL CHECK (status IN ('active', 'completed', 'paused', 'archived')) DEFAULT 'active',
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON care_plan_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_child_id ON care_plan_goals(child_id);
CREATE INDEX IF NOT EXISTS idx_goals_status ON care_plan_goals(status);
CREATE INDEX IF NOT EXISTS idx_goals_category ON care_plan_goals(category);

-- RLS Policies
ALTER TABLE care_plan_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own goals"
  ON care_plan_goals
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own goals"
  ON care_plan_goals
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own goals"
  ON care_plan_goals
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own goals"
  ON care_plan_goals
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- Helper Functions
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_care_plan_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER visit_summaries_updated_at
  BEFORE UPDATE ON visit_summaries
  FOR EACH ROW
  EXECUTE FUNCTION update_care_plan_timestamp();

CREATE TRIGGER action_items_updated_at
  BEFORE UPDATE ON care_plan_action_items
  FOR EACH ROW
  EXECUTE FUNCTION update_care_plan_timestamp();

CREATE TRIGGER goals_updated_at
  BEFORE UPDATE ON care_plan_goals
  FOR EACH ROW
  EXECUTE FUNCTION update_care_plan_timestamp();

-- Function to get user's care plan summary
CREATE OR REPLACE FUNCTION get_care_plan_summary(p_user_id UUID)
RETURNS TABLE(
  total_summaries BIGINT,
  total_action_items BIGINT,
  completed_action_items BIGINT,
  active_goals BIGINT,
  last_visit_date TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM visit_summaries WHERE user_id = p_user_id)::BIGINT,
    (SELECT COUNT(*) FROM care_plan_action_items WHERE user_id = p_user_id)::BIGINT,
    (SELECT COUNT(*) FROM care_plan_action_items WHERE user_id = p_user_id AND completed = TRUE)::BIGINT,
    (SELECT COUNT(*) FROM care_plan_goals WHERE user_id = p_user_id AND status = 'active')::BIGINT,
    (SELECT MAX(created_at) FROM visit_summaries WHERE user_id = p_user_id);
END;
$$;

-- Comments
COMMENT ON TABLE visit_summaries IS 'Provider visit summaries and recommendations';
COMMENT ON TABLE care_plan_action_items IS 'User action items from visits and self-created';
COMMENT ON TABLE care_plan_goals IS 'Care plan goals for daily routines and development';
