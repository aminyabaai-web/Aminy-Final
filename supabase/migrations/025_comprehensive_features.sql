-- ============================================================================
-- Comprehensive Features Migration
-- Adds tables for: routines, calm tools, AI memory, provider dashboard,
-- billing, and retention features
-- ============================================================================

-- ============================================================================
-- MULTI-CHILD SUPPORT
-- ============================================================================

-- Children table for multi-child families
CREATE TABLE IF NOT EXISTS children (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  age INTEGER,
  date_of_birth DATE,
  photo_url TEXT,
  diagnosis TEXT[] DEFAULT '{}',
  conditions TEXT[] DEFAULT '{}',
  goals TEXT[] DEFAULT '{}',
  notes TEXT,
  is_primary BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_children_user ON children(user_id);
CREATE INDEX IF NOT EXISTS idx_children_primary ON children(user_id, is_primary);

ALTER TABLE children ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own children"
  ON children FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own children"
  ON children FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own children"
  ON children FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own children"
  ON children FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- DAILY ROUTINES SYSTEM
-- ============================================================================

-- Daily routines table
CREATE TABLE IF NOT EXISTS daily_routines (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  child_id TEXT,
  period TEXT NOT NULL CHECK (period IN ('morning', 'afternoon', 'evening', 'bedtime')),
  name TEXT NOT NULL,
  description TEXT,
  steps JSONB NOT NULL DEFAULT '[]',
  scheduled_time TIME NOT NULL,
  estimated_duration INTEGER NOT NULL DEFAULT 30,
  is_ai_generated BOOLEAN NOT NULL DEFAULT false,
  linked_goal_ids TEXT[] DEFAULT '{}',
  difficulty TEXT CHECK (difficulty IN ('easy', 'moderate', 'challenging')) DEFAULT 'moderate',
  is_active BOOLEAN NOT NULL DEFAULT true,
  days_of_week INTEGER[] NOT NULL DEFAULT '{0,1,2,3,4,5,6}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_daily_routines_user ON daily_routines(user_id);
CREATE INDEX idx_daily_routines_period ON daily_routines(period);
CREATE INDEX idx_daily_routines_active ON daily_routines(is_active);

ALTER TABLE daily_routines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own routines"
  ON daily_routines FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own routines"
  ON daily_routines FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own routines"
  ON daily_routines FOR UPDATE
  USING (auth.uid() = user_id);

-- Routine completions table (enhances existing routine_completions)
CREATE TABLE IF NOT EXISTS routine_completions (
  id TEXT PRIMARY KEY,
  routine_id TEXT NOT NULL REFERENCES daily_routines(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  child_id TEXT,
  scheduled_date DATE NOT NULL,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped', 'partial')) DEFAULT 'pending',
  steps_completed INTEGER NOT NULL DEFAULT 0,
  total_steps INTEGER NOT NULL DEFAULT 0,
  adherence_score INTEGER NOT NULL DEFAULT 0 CHECK (adherence_score >= 0 AND adherence_score <= 100),
  notes TEXT,
  mood_before TEXT CHECK (mood_before IN ('calm', 'neutral', 'agitated')),
  mood_after TEXT CHECK (mood_after IN ('calm', 'neutral', 'agitated')),
  challenges_noted TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_routine_completions_user ON routine_completions(user_id);
CREATE INDEX idx_routine_completions_date ON routine_completions(scheduled_date);
CREATE INDEX idx_routine_completions_routine ON routine_completions(routine_id);

ALTER TABLE routine_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own completions"
  ON routine_completions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own completions"
  ON routine_completions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own completions"
  ON routine_completions FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================================================
-- CALM TOOLS TRACKING
-- ============================================================================

CREATE TABLE IF NOT EXISTS calm_tool_sessions (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  child_id TEXT,
  tool_type TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER DEFAULT 0,
  mood_before INTEGER CHECK (mood_before >= 1 AND mood_before <= 5),
  mood_after INTEGER CHECK (mood_after >= 1 AND mood_after <= 5),
  was_effective BOOLEAN,
  triggered_by TEXT,
  context TEXT,
  notes TEXT,
  coins_earned INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_calm_sessions_user ON calm_tool_sessions(user_id);
CREATE INDEX idx_calm_sessions_tool ON calm_tool_sessions(tool_type);
CREATE INDEX idx_calm_sessions_date ON calm_tool_sessions(started_at);

ALTER TABLE calm_tool_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own calm sessions"
  ON calm_tool_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own calm sessions"
  ON calm_tool_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own calm sessions"
  ON calm_tool_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own calm sessions"
  ON calm_tool_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- AI MEMORY SYSTEM
-- ============================================================================

-- Memory facts table
CREATE TABLE IF NOT EXISTS memory_facts (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  child_id TEXT,
  category TEXT NOT NULL,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  confidence DECIMAL(3,2) NOT NULL DEFAULT 0.8 CHECK (confidence >= 0 AND confidence <= 1),
  source TEXT NOT NULL CHECK (source IN ('conversation', 'document', 'user_input', 'observation')),
  source_id TEXT,
  extracted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_verified TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, child_id, key)
);

CREATE INDEX idx_memory_facts_user ON memory_facts(user_id);
CREATE INDEX idx_memory_facts_category ON memory_facts(category);
CREATE INDEX idx_memory_facts_active ON memory_facts(is_active);

ALTER TABLE memory_facts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own facts"
  ON memory_facts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own facts"
  ON memory_facts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own facts"
  ON memory_facts FOR UPDATE
  USING (auth.uid() = user_id);

-- Conversation memories table
CREATE TABLE IF NOT EXISTS conversation_memories (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  child_id TEXT,
  conversation_id TEXT NOT NULL,
  summary TEXT,
  key_topics TEXT[] DEFAULT '{}',
  emotional_tone TEXT CHECK (emotional_tone IN ('positive', 'neutral', 'concerned', 'crisis')),
  action_items TEXT[] DEFAULT '{}',
  facts_extracted TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_conv_memories_user ON conversation_memories(user_id);
CREATE INDEX idx_conv_memories_conv ON conversation_memories(conversation_id);

ALTER TABLE conversation_memories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own conversation memories"
  ON conversation_memories FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own conversation memories"
  ON conversation_memories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Document insights table
CREATE TABLE IF NOT EXISTS document_insights (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  child_id TEXT,
  document_id TEXT NOT NULL,
  document_type TEXT NOT NULL,
  summary TEXT,
  key_findings TEXT[] DEFAULT '{}',
  goals TEXT[] DEFAULT '{}',
  recommendations TEXT[] DEFAULT '{}',
  facts_extracted TEXT[] DEFAULT '{}',
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_doc_insights_user ON document_insights(user_id);
CREATE INDEX idx_doc_insights_doc ON document_insights(document_id);

ALTER TABLE document_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own document insights"
  ON document_insights FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own document insights"
  ON document_insights FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- PROVIDER SESSION NOTES
-- ============================================================================

CREATE TABLE IF NOT EXISTS session_notes (
  id TEXT PRIMARY KEY,
  appointment_id TEXT REFERENCES appointments(id) ON DELETE SET NULL,
  provider_id TEXT NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  child_name TEXT,
  session_date DATE NOT NULL,
  session_duration INTEGER NOT NULL DEFAULT 60,
  status TEXT NOT NULL CHECK (status IN ('draft', 'pending_review', 'approved', 'rejected', 'submitted')) DEFAULT 'draft',
  presenting_concerns TEXT,
  interventions_used TEXT[] DEFAULT '{}',
  client_response TEXT,
  progress_toward_goals TEXT,
  recommendations_for_home TEXT[] DEFAULT '{}',
  next_session_focus TEXT,
  cpt_codes TEXT[] DEFAULT '{}',
  units_provided INTEGER DEFAULT 1,
  submitted_at TIMESTAMPTZ,
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_session_notes_provider ON session_notes(provider_id);
CREATE INDEX idx_session_notes_client ON session_notes(client_id);
CREATE INDEX idx_session_notes_status ON session_notes(status);
CREATE INDEX idx_session_notes_date ON session_notes(session_date);

ALTER TABLE session_notes ENABLE ROW LEVEL SECURITY;

-- Providers can view/edit their own notes
CREATE POLICY "Providers can view own notes"
  ON session_notes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM providers p
      WHERE p.id = session_notes.provider_id
      AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Providers can insert notes"
  ON session_notes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM providers p
      WHERE p.id = session_notes.provider_id
      AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Providers can update own notes"
  ON session_notes FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM providers p
      WHERE p.id = session_notes.provider_id
      AND p.user_id = auth.uid()
    )
  );

-- Clients can view notes about them
CREATE POLICY "Clients can view their notes"
  ON session_notes FOR SELECT
  USING (auth.uid() = client_id AND status = 'approved');

-- ============================================================================
-- SUBSCRIPTIONS & BILLING
-- ============================================================================

CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT UNIQUE,
  stripe_customer_id TEXT,
  tier TEXT NOT NULL CHECK (tier IN ('free', 'core', 'pro', 'pro_plus')) DEFAULT 'free',
  status TEXT NOT NULL CHECK (status IN ('active', 'past_due', 'canceled', 'trialing', 'paused')) DEFAULT 'active',
  interval TEXT CHECK (interval IN ('month', 'year')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  canceled_at TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe ON subscriptions(stripe_subscription_id);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscription"
  ON subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Service role for webhook updates
CREATE POLICY "Service role can update subscriptions"
  ON subscriptions FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- USER STREAKS & MILESTONES
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_streaks (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_activity_date DATE,
  total_activities INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, type)
);

CREATE INDEX idx_user_streaks_user ON user_streaks(user_id);
CREATE INDEX idx_user_streaks_type ON user_streaks(type);

ALTER TABLE user_streaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own streaks"
  ON user_streaks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own streaks"
  ON user_streaks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own streaks"
  ON user_streaks FOR UPDATE
  USING (auth.uid() = user_id);

-- User milestones
CREATE TABLE IF NOT EXISTS user_milestones (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  milestone_type TEXT NOT NULL,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  celebration_shown BOOLEAN DEFAULT false,
  UNIQUE(user_id, milestone_type)
);

CREATE INDEX idx_user_milestones_user ON user_milestones(user_id);

ALTER TABLE user_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own milestones"
  ON user_milestones FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own milestones"
  ON user_milestones FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own milestones"
  ON user_milestones FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================================================
-- CALM COINS (if not exists)
-- ============================================================================

CREATE TABLE IF NOT EXISTS calm_coins (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  source TEXT NOT NULL,
  reference_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_calm_coins_user ON calm_coins(user_id);

ALTER TABLE calm_coins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own coins"
  ON calm_coins FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own coins"
  ON calm_coins FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- TRIAL TRACKING
-- ============================================================================

CREATE TABLE IF NOT EXISTS trial_tracking (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trial_started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  trial_ends_at TIMESTAMPTZ NOT NULL,
  conversations_used INTEGER NOT NULL DEFAULT 0,
  max_trial_conversations INTEGER NOT NULL DEFAULT 5,
  has_seen_nudge BOOLEAN DEFAULT false,
  is_converted BOOLEAN DEFAULT false,
  converted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_trial_tracking_user ON trial_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_trial_tracking_ends ON trial_tracking(trial_ends_at);

ALTER TABLE trial_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own trial"
  ON trial_tracking FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own trial"
  ON trial_tracking FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own trial"
  ON trial_tracking FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage trials"
  ON trial_tracking FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- USAGE TRACKING
-- ============================================================================

CREATE TABLE IF NOT EXISTS usage_tracking (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  message_count INTEGER NOT NULL DEFAULT 0,
  session_count INTEGER NOT NULL DEFAULT 0,
  features_used TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_usage_tracking_user ON usage_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_date ON usage_tracking(date);

ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own usage"
  ON usage_tracking FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to increment trial conversations
CREATE OR REPLACE FUNCTION increment_trial_conversations(user_id_param UUID)
RETURNS void AS $$
BEGIN
  UPDATE trial_tracking
  SET conversations_used = conversations_used + 1
  WHERE user_id = user_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment message count
CREATE OR REPLACE FUNCTION increment_message_count(user_id_param UUID, date_param DATE)
RETURNS void AS $$
BEGIN
  INSERT INTO usage_tracking (user_id, date, message_count)
  VALUES (user_id_param, date_param, 1)
  ON CONFLICT (user_id, date)
  DO UPDATE SET message_count = usage_tracking.message_count + 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;
