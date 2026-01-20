-- Outcomes Tracking Schema
-- Enables measurable parent wellness and routine adherence tracking

-- ===========================================
-- STRESS LOGS TABLE
-- Daily parent stress check-ins (morning/evening)
-- ===========================================

CREATE TABLE IF NOT EXISTS stress_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  stress_level INTEGER NOT NULL CHECK (stress_level >= 1 AND stress_level <= 10),
  context TEXT NOT NULL CHECK (context IN ('morning', 'evening')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE stress_logs ENABLE ROW LEVEL SECURITY;

-- Users can only access their own stress logs
CREATE POLICY "Users can view own stress logs" ON stress_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own stress logs" ON stress_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own stress logs" ON stress_logs
  FOR DELETE USING (auth.uid() = user_id);

-- Index for efficient queries
CREATE INDEX idx_stress_logs_user_date ON stress_logs(user_id, created_at DESC);
CREATE INDEX idx_stress_logs_user_context ON stress_logs(user_id, context);

-- ===========================================
-- ROUTINE COMPLETIONS TABLE
-- Track scheduled vs completed routines
-- ===========================================

CREATE TABLE IF NOT EXISTS routine_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  routine_id TEXT NOT NULL,
  routine_name TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  completion_status TEXT CHECK (completion_status IN ('completed', 'partial', 'skipped', 'delayed')) DEFAULT 'skipped',
  delay_minutes INTEGER, -- How many minutes after scheduled time it was completed
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE routine_completions ENABLE ROW LEVEL SECURITY;

-- Users can only access their own routine completions
CREATE POLICY "Users can view own routine completions" ON routine_completions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own routine completions" ON routine_completions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own routine completions" ON routine_completions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own routine completions" ON routine_completions
  FOR DELETE USING (auth.uid() = user_id);

-- Indexes for efficient queries
CREATE INDEX idx_routine_completions_user_date ON routine_completions(user_id, scheduled_at DESC);
CREATE INDEX idx_routine_completions_routine ON routine_completions(user_id, routine_id);

-- ===========================================
-- GOAL ACHIEVEMENTS TABLE
-- Track goal progress and completion
-- ===========================================

CREATE TABLE IF NOT EXISTS goal_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_id TEXT NOT NULL,
  goal_title TEXT NOT NULL,
  goal_type TEXT CHECK (goal_type IN ('daily', 'weekly', 'monthly', 'milestone')),
  target_value INTEGER DEFAULT 1,
  current_value INTEGER DEFAULT 0,
  achieved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE goal_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own goal achievements" ON goal_achievements
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own goal achievements" ON goal_achievements
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own goal achievements" ON goal_achievements
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own goal achievements" ON goal_achievements
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_goal_achievements_user ON goal_achievements(user_id, created_at DESC);

-- ===========================================
-- WEEKLY OUTCOMES SUMMARY VIEW
-- Aggregate outcomes data for weekly reports
-- ===========================================

CREATE OR REPLACE VIEW weekly_outcomes_summary AS
SELECT
  user_id,
  DATE_TRUNC('week', created_at) as week_start,

  -- Stress metrics
  AVG(stress_level) FILTER (WHERE context = 'morning') as avg_morning_stress,
  AVG(stress_level) FILTER (WHERE context = 'evening') as avg_evening_stress,
  AVG(stress_level) as avg_overall_stress,
  COUNT(*) FILTER (WHERE stress_level <= 3) as low_stress_count,
  COUNT(*) FILTER (WHERE stress_level >= 7) as high_stress_count,
  COUNT(*) as total_checkins

FROM stress_logs
GROUP BY user_id, DATE_TRUNC('week', created_at);

-- ===========================================
-- FUNCTIONS FOR OUTCOMES CALCULATIONS
-- ===========================================

-- Calculate routine adherence percentage for a user in a date range
CREATE OR REPLACE FUNCTION calculate_routine_adherence(
  p_user_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS NUMERIC AS $$
DECLARE
  total_scheduled INTEGER;
  completed_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_scheduled
  FROM routine_completions
  WHERE user_id = p_user_id
    AND scheduled_at >= p_start_date
    AND scheduled_at < p_end_date + INTERVAL '1 day';

  SELECT COUNT(*) INTO completed_count
  FROM routine_completions
  WHERE user_id = p_user_id
    AND scheduled_at >= p_start_date
    AND scheduled_at < p_end_date + INTERVAL '1 day'
    AND completion_status IN ('completed', 'partial');

  IF total_scheduled = 0 THEN
    RETURN NULL;
  END IF;

  RETURN ROUND((completed_count::NUMERIC / total_scheduled) * 100, 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Calculate stress trend (positive = improving, negative = worsening)
CREATE OR REPLACE FUNCTION calculate_stress_trend(
  p_user_id UUID
)
RETURNS NUMERIC AS $$
DECLARE
  recent_avg NUMERIC;
  older_avg NUMERIC;
BEGIN
  -- Recent 7 days average
  SELECT AVG(stress_level) INTO recent_avg
  FROM stress_logs
  WHERE user_id = p_user_id
    AND created_at >= NOW() - INTERVAL '7 days';

  -- Previous 7 days average
  SELECT AVG(stress_level) INTO older_avg
  FROM stress_logs
  WHERE user_id = p_user_id
    AND created_at >= NOW() - INTERVAL '14 days'
    AND created_at < NOW() - INTERVAL '7 days';

  IF recent_avg IS NULL OR older_avg IS NULL THEN
    RETURN NULL;
  END IF;

  -- Positive = stress decreased (improving)
  -- Negative = stress increased (worsening)
  RETURN ROUND(older_avg - recent_avg, 2);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- CALM COINS TABLE (for gamification)
-- ===========================================

CREATE TABLE IF NOT EXISTS calm_coins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  reason TEXT NOT NULL,
  source_type TEXT CHECK (source_type IN ('task', 'routine', 'goal', 'streak', 'bonus', 'redemption', 'stress_checkin')),
  source_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE calm_coins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own calm coins" ON calm_coins
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own calm coins" ON calm_coins
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_calm_coins_user ON calm_coins(user_id, created_at DESC);

-- Function to get user's total calm coins
CREATE OR REPLACE FUNCTION get_calm_coins_balance(p_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN COALESCE(
    (SELECT SUM(amount) FROM calm_coins WHERE user_id = p_user_id),
    0
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- REWARDS TABLE (for calm coins redemption)
-- ===========================================

CREATE TABLE IF NOT EXISTS rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  cost INTEGER NOT NULL CHECK (cost > 0),
  icon TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own rewards" ON rewards
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own rewards" ON rewards
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own rewards" ON rewards
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own rewards" ON rewards
  FOR DELETE USING (auth.uid() = user_id);

-- ===========================================
-- WINS JOURNAL TABLE (for success stories)
-- ===========================================

CREATE TABLE IF NOT EXISTS wins_journal (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT CHECK (category IN ('milestone', 'daily_win', 'breakthrough', 'routine', 'behavior', 'other')),
  mood TEXT CHECK (mood IN ('proud', 'grateful', 'relieved', 'hopeful', 'joyful')),
  shared BOOLEAN DEFAULT false,
  share_approved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE wins_journal ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own wins" ON wins_journal
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own wins" ON wins_journal
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own wins" ON wins_journal
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own wins" ON wins_journal
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_wins_journal_user ON wins_journal(user_id, created_at DESC);
