-- Migration 023: Provider Routing System
-- Automatic detection and handoff to appropriate providers

-- ============================================
-- PROVIDER ROUTING OUTCOMES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS provider_routing_outcomes (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_type TEXT NOT NULL,
  recommended_providers TEXT[] DEFAULT '{}',
  confidence DECIMAL(3,2) NOT NULL DEFAULT 0,
  urgency TEXT NOT NULL CHECK (urgency IN ('low', 'medium', 'high', 'urgent')),
  topics TEXT[] DEFAULT '{}',
  action TEXT NOT NULL CHECK (action IN ('viewed', 'clicked', 'booked', 'completed', 'dismissed')),
  satisfaction INTEGER CHECK (satisfaction >= 1 AND satisfaction <= 5),
  feedback TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  action_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_routing_outcomes_user
  ON provider_routing_outcomes(user_id);

CREATE INDEX IF NOT EXISTS idx_routing_outcomes_created
  ON provider_routing_outcomes(created_at);

CREATE INDEX IF NOT EXISTS idx_routing_outcomes_provider
  ON provider_routing_outcomes(provider_type);

CREATE INDEX IF NOT EXISTS idx_routing_outcomes_urgency
  ON provider_routing_outcomes(urgency);

CREATE INDEX IF NOT EXISTS idx_routing_outcomes_action
  ON provider_routing_outcomes(action);

-- ============================================
-- PROVIDER HANDOFFS TABLE
-- (For tracking actual provider connections)
-- ============================================

CREATE TABLE IF NOT EXISTS provider_handoffs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id TEXT,
  issue_analysis JSONB NOT NULL,
  matched_providers JSONB DEFAULT '[]',
  selected_provider JSONB,
  user_preferences JSONB DEFAULT '{}',
  child_profile JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'matched', 'contacted', 'scheduled', 'completed', 'declined', 'expired')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  scheduled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_handoffs_user
  ON provider_handoffs(user_id);

CREATE INDEX IF NOT EXISTS idx_handoffs_status
  ON provider_handoffs(status);

CREATE INDEX IF NOT EXISTS idx_handoffs_created
  ON provider_handoffs(created_at);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE provider_routing_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_handoffs ENABLE ROW LEVEL SECURITY;

-- Users can view/insert their own routing outcomes
CREATE POLICY "Users can view own routing outcomes"
  ON provider_routing_outcomes FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own routing outcomes"
  ON provider_routing_outcomes FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own routing outcomes"
  ON provider_routing_outcomes FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- Users can view/insert their own handoffs
CREATE POLICY "Users can view own handoffs"
  ON provider_handoffs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own handoffs"
  ON provider_handoffs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own handoffs"
  ON provider_handoffs FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- ============================================
-- ANALYTICS FUNCTIONS
-- ============================================

-- Get routing conversion metrics
CREATE OR REPLACE FUNCTION get_routing_metrics(
  p_start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
  p_end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
  total_shown BIGINT,
  total_clicked BIGINT,
  total_booked BIGINT,
  total_completed BIGINT,
  click_rate DECIMAL,
  booking_rate DECIMAL,
  completion_rate DECIMAL,
  avg_confidence DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) as total_shown,
    COUNT(*) FILTER (WHERE action IN ('clicked', 'booked', 'completed')) as total_clicked,
    COUNT(*) FILTER (WHERE action IN ('booked', 'completed')) as total_booked,
    COUNT(*) FILTER (WHERE action = 'completed') as total_completed,
    ROUND(
      COUNT(*) FILTER (WHERE action IN ('clicked', 'booked', 'completed'))::DECIMAL /
      NULLIF(COUNT(*), 0),
      3
    ) as click_rate,
    ROUND(
      COUNT(*) FILTER (WHERE action IN ('booked', 'completed'))::DECIMAL /
      NULLIF(COUNT(*), 0),
      3
    ) as booking_rate,
    ROUND(
      COUNT(*) FILTER (WHERE action = 'completed')::DECIMAL /
      NULLIF(COUNT(*) FILTER (WHERE action IN ('booked', 'completed')), 0),
      3
    ) as completion_rate,
    ROUND(AVG(confidence), 3) as avg_confidence
  FROM provider_routing_outcomes
  WHERE created_at BETWEEN p_start_date AND p_end_date;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Get routing metrics by provider type
CREATE OR REPLACE FUNCTION get_routing_by_provider(
  p_start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
  p_end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
  provider_type TEXT,
  total_shown BIGINT,
  total_booked BIGINT,
  booking_rate DECIMAL,
  avg_satisfaction DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pro.provider_type,
    COUNT(*) as total_shown,
    COUNT(*) FILTER (WHERE action IN ('booked', 'completed')) as total_booked,
    ROUND(
      COUNT(*) FILTER (WHERE action IN ('booked', 'completed'))::DECIMAL /
      NULLIF(COUNT(*), 0),
      3
    ) as booking_rate,
    ROUND(AVG(satisfaction) FILTER (WHERE satisfaction IS NOT NULL), 2) as avg_satisfaction
  FROM provider_routing_outcomes pro
  WHERE created_at BETWEEN p_start_date AND p_end_date
  GROUP BY pro.provider_type
  ORDER BY total_shown DESC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Get routing metrics by urgency level
CREATE OR REPLACE FUNCTION get_routing_by_urgency(
  p_start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
  p_end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
  urgency TEXT,
  total_shown BIGINT,
  total_acted BIGINT,
  action_rate DECIMAL,
  avg_time_to_action INTERVAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pro.urgency,
    COUNT(*) as total_shown,
    COUNT(*) FILTER (WHERE action IN ('clicked', 'booked', 'completed')) as total_acted,
    ROUND(
      COUNT(*) FILTER (WHERE action IN ('clicked', 'booked', 'completed'))::DECIMAL /
      NULLIF(COUNT(*), 0),
      3
    ) as action_rate,
    AVG(action_at - created_at) FILTER (WHERE action_at IS NOT NULL) as avg_time_to_action
  FROM provider_routing_outcomes pro
  WHERE created_at BETWEEN p_start_date AND p_end_date
  GROUP BY pro.urgency
  ORDER BY
    CASE pro.urgency
      WHEN 'urgent' THEN 1
      WHEN 'high' THEN 2
      WHEN 'medium' THEN 3
      WHEN 'low' THEN 4
    END;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Get top routing topics
CREATE OR REPLACE FUNCTION get_top_routing_topics(
  p_limit INTEGER DEFAULT 10,
  p_start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days'
)
RETURNS TABLE (
  topic TEXT,
  occurrence_count BIGINT,
  booking_rate DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.topic,
    COUNT(*) as occurrence_count,
    ROUND(
      COUNT(*) FILTER (WHERE pro.action IN ('booked', 'completed'))::DECIMAL /
      NULLIF(COUNT(*), 0),
      3
    ) as booking_rate
  FROM provider_routing_outcomes pro,
       LATERAL unnest(pro.topics) as t(topic)
  WHERE pro.created_at >= p_start_date
  GROUP BY t.topic
  ORDER BY occurrence_count DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================
-- UPDATE TIMESTAMP TRIGGER
-- ============================================

CREATE OR REPLACE FUNCTION update_handoff_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS handoff_updated_at ON provider_handoffs;
CREATE TRIGGER handoff_updated_at
  BEFORE UPDATE ON provider_handoffs
  FOR EACH ROW
  EXECUTE FUNCTION update_handoff_timestamp();

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE provider_routing_outcomes IS 'Tracks when provider recommendations are shown and user actions';
COMMENT ON TABLE provider_handoffs IS 'Tracks actual handoffs to providers';
COMMENT ON FUNCTION get_routing_metrics IS 'Get overall routing conversion metrics';
COMMENT ON FUNCTION get_routing_by_provider IS 'Get routing metrics grouped by provider type';
COMMENT ON FUNCTION get_routing_by_urgency IS 'Get routing metrics grouped by urgency level';
COMMENT ON FUNCTION get_top_routing_topics IS 'Get most common topics triggering routing';
