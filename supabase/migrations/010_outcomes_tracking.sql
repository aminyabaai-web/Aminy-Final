-- ============================================================================
-- OUTCOMES TRACKING TABLES
-- Real data collection for clinical outcomes, engagement, and ROI
-- ============================================================================

-- Outcome events table - stores all tracked events
CREATE TABLE IF NOT EXISTS outcome_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  child_id UUID REFERENCES children(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  metric_name TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  context JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Indexes for common queries
  CONSTRAINT valid_event_type CHECK (event_type IN (
    'behavior_incident', 'behavior_success', 'goal_progress', 'goal_completed',
    'caregiver_stress', 'engagement_session', 'ai_interaction',
    'routine_adherence', 'skill_acquisition', 'sleep_quality',
    'meltdown_duration', 'transition_success'
  ))
);

-- Index for user queries
CREATE INDEX IF NOT EXISTS idx_outcome_events_user ON outcome_events(user_id);
CREATE INDEX IF NOT EXISTS idx_outcome_events_type ON outcome_events(event_type);
CREATE INDEX IF NOT EXISTS idx_outcome_events_created ON outcome_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_outcome_events_user_type ON outcome_events(user_id, event_type);

-- User baselines table - stores initial measurements at onboarding
CREATE TABLE IF NOT EXISTS user_baselines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  child_id UUID REFERENCES children(id) ON DELETE SET NULL,
  metric_name TEXT NOT NULL,
  baseline_value NUMERIC NOT NULL,
  baseline_date TIMESTAMPTZ DEFAULT NOW(),
  target_value NUMERIC,
  target_date TIMESTAMPTZ,
  notes TEXT,

  -- Unique constraint to prevent duplicate baselines
  UNIQUE(user_id, metric_name)
);

CREATE INDEX IF NOT EXISTS idx_baselines_user ON user_baselines(user_id);

-- Aggregated daily metrics (for faster dashboard queries)
CREATE TABLE IF NOT EXISTS daily_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_active_users INTEGER DEFAULT 0,
  new_users INTEGER DEFAULT 0,
  total_behavior_logs INTEGER DEFAULT 0,
  total_ai_interactions INTEGER DEFAULT 0,
  total_sessions INTEGER DEFAULT 0,
  avg_session_duration_seconds NUMERIC DEFAULT 0,
  goals_completed INTEGER DEFAULT 0,
  avg_stress_level NUMERIC DEFAULT 0,

  UNIQUE(date)
);

CREATE INDEX IF NOT EXISTS idx_daily_metrics_date ON daily_metrics(date DESC);

-- Enable Row Level Security
ALTER TABLE outcome_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_baselines ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for outcome_events
CREATE POLICY "Users can view own outcome events"
  ON outcome_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own outcome events"
  ON outcome_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admin can view all
CREATE POLICY "Admins can view all outcome events"
  ON outcome_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  );

-- RLS Policies for user_baselines
CREATE POLICY "Users can view own baselines"
  ON user_baselines FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own baselines"
  ON user_baselines FOR ALL
  USING (auth.uid() = user_id);

-- RLS Policies for daily_metrics (admin only)
CREATE POLICY "Admins can view daily metrics"
  ON daily_metrics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  );

-- Function to aggregate daily metrics (run via cron job)
CREATE OR REPLACE FUNCTION aggregate_daily_metrics()
RETURNS void AS $$
DECLARE
  today DATE := CURRENT_DATE;
  yesterday DATE := CURRENT_DATE - INTERVAL '1 day';
BEGIN
  INSERT INTO daily_metrics (
    date,
    total_active_users,
    new_users,
    total_behavior_logs,
    total_ai_interactions,
    total_sessions,
    avg_session_duration_seconds,
    goals_completed,
    avg_stress_level
  )
  SELECT
    yesterday,
    COUNT(DISTINCT oe.user_id),
    (SELECT COUNT(*) FROM auth.users WHERE created_at::date = yesterday),
    COUNT(*) FILTER (WHERE oe.event_type = 'behavior_incident'),
    COUNT(*) FILTER (WHERE oe.event_type = 'ai_interaction'),
    COUNT(*) FILTER (WHERE oe.event_type = 'engagement_session'),
    COALESCE(AVG(oe.metric_value) FILTER (WHERE oe.event_type = 'engagement_session'), 0),
    COUNT(*) FILTER (WHERE oe.event_type = 'goal_completed'),
    COALESCE(AVG(oe.metric_value) FILTER (WHERE oe.event_type = 'caregiver_stress'), 0)
  FROM outcome_events oe
  WHERE oe.created_at::date = yesterday
  ON CONFLICT (date) DO UPDATE SET
    total_active_users = EXCLUDED.total_active_users,
    new_users = EXCLUDED.new_users,
    total_behavior_logs = EXCLUDED.total_behavior_logs,
    total_ai_interactions = EXCLUDED.total_ai_interactions,
    total_sessions = EXCLUDED.total_sessions,
    avg_session_duration_seconds = EXCLUDED.avg_session_duration_seconds,
    goals_completed = EXCLUDED.goals_completed,
    avg_stress_level = EXCLUDED.avg_stress_level;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a cron job to run daily (requires pg_cron extension)
-- SELECT cron.schedule('aggregate-daily-metrics', '0 1 * * *', 'SELECT aggregate_daily_metrics()');

COMMENT ON TABLE outcome_events IS 'Stores all user outcome tracking events for clinical/business metrics';
COMMENT ON TABLE user_baselines IS 'Stores baseline measurements taken at user onboarding';
COMMENT ON TABLE daily_metrics IS 'Pre-aggregated daily metrics for fast dashboard queries';
