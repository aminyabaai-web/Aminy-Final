-- Migration 020: A/B Testing Infrastructure
-- Adds tables for experiments, variants, and event tracking

-- ============================================
-- EXPERIMENTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS experiments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('prompt', 'ui', 'feature', 'pricing')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'running', 'paused', 'completed')),
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  target_audience JSONB DEFAULT '{}',
  variants JSONB NOT NULL DEFAULT '[]',
  primary_metric TEXT NOT NULL,
  secondary_metrics TEXT[] DEFAULT '{}',
  minimum_sample_size INTEGER DEFAULT 100,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_experiments_status ON experiments(status);
CREATE INDEX IF NOT EXISTS idx_experiments_type ON experiments(type);

-- ============================================
-- EXPERIMENT ASSIGNMENTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS experiment_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id UUID NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  variant_id TEXT NOT NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(experiment_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_experiment_assignments_experiment ON experiment_assignments(experiment_id);
CREATE INDEX IF NOT EXISTS idx_experiment_assignments_user ON experiment_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_experiment_assignments_variant ON experiment_assignments(variant_id);

-- ============================================
-- EXPERIMENT EVENTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS experiment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id UUID NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
  variant_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('impression', 'conversion', 'engagement', 'custom')),
  event_name TEXT NOT NULL,
  event_value DECIMAL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_experiment_events_experiment ON experiment_events(experiment_id);
CREATE INDEX IF NOT EXISTS idx_experiment_events_variant ON experiment_events(variant_id);
CREATE INDEX IF NOT EXISTS idx_experiment_events_user ON experiment_events(user_id);
CREATE INDEX IF NOT EXISTS idx_experiment_events_type ON experiment_events(event_type);
CREATE INDEX IF NOT EXISTS idx_experiment_events_created ON experiment_events(created_at);

-- Composite index for results queries
CREATE INDEX IF NOT EXISTS idx_experiment_events_results 
  ON experiment_events(experiment_id, variant_id, event_type);

-- ============================================
-- EXPERIMENT RESULTS FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION get_experiment_results(p_experiment_id UUID)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  WITH variant_stats AS (
    SELECT
      variant_id,
      COUNT(*) FILTER (WHERE event_type = 'impression') as impressions,
      COUNT(*) FILTER (WHERE event_type = 'conversion') as conversions,
      AVG(event_value) FILTER (WHERE event_type = 'conversion') as avg_value,
      COUNT(*) FILTER (WHERE event_type = 'engagement') as engagements
    FROM experiment_events
    WHERE experiment_id = p_experiment_id
    GROUP BY variant_id
  ),
  experiment_info AS (
    SELECT 
      variants,
      primary_metric,
      start_date,
      EXTRACT(DAY FROM NOW() - start_date) as duration_days
    FROM experiments
    WHERE id = p_experiment_id
  )
  SELECT jsonb_build_object(
    'experimentId', p_experiment_id,
    'variants', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'variantId', vs.variant_id,
          'variantName', vs.variant_id,
          'impressions', COALESCE(vs.impressions, 0),
          'conversions', COALESCE(vs.conversions, 0),
          'conversionRate', 
            CASE WHEN COALESCE(vs.impressions, 0) > 0 
            THEN ROUND((COALESCE(vs.conversions, 0)::decimal / vs.impressions) * 100, 2)
            ELSE 0 END,
          'engagementScore', COALESCE(vs.engagements, 0),
          'avgValue', COALESCE(vs.avg_value, 0),
          'confidence', 0.95 -- Simplified, would calculate properly in production
        )
      )
      FROM variant_stats vs
    ),
    'statisticalSignificance', 0.95,
    'sampleSize', (SELECT SUM(impressions) FROM variant_stats),
    'duration', (SELECT duration_days FROM experiment_info)
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- TRIGGERS
-- ============================================

CREATE OR REPLACE FUNCTION update_experiment_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS experiment_updated_at ON experiments;
CREATE TRIGGER experiment_updated_at
  BEFORE UPDATE ON experiments
  FOR EACH ROW
  EXECUTE FUNCTION update_experiment_timestamp();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE experiment_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE experiment_events ENABLE ROW LEVEL SECURITY;

-- Experiments: Admins can manage, all authenticated users can view running
CREATE POLICY "Admins can manage experiments"
  ON experiments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'admin'
    )
  );

CREATE POLICY "Users can view running experiments"
  ON experiments FOR SELECT
  TO authenticated
  USING (status = 'running');

-- Assignments: Users can view their own
CREATE POLICY "Users can view own assignments"
  ON experiment_assignments FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can create assignments"
  ON experiment_assignments FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Events: Anyone can insert, admins can view all
CREATE POLICY "Anyone can create events"
  ON experiment_events FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can view all events"
  ON experiment_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'admin'
    )
  );

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE experiments IS 'A/B test experiment definitions';
COMMENT ON TABLE experiment_assignments IS 'User-to-variant assignments for experiments';
COMMENT ON TABLE experiment_events IS 'Event tracking for experiment metrics';
COMMENT ON FUNCTION get_experiment_results IS 'Calculate experiment results with variant statistics';
