-- ============================================================================
-- Migration: Preferred Providers
-- Description: Allow users to mark providers as favorites for priority booking
-- ============================================================================

-- Create preferred providers table
CREATE TABLE IF NOT EXISTS user_preferred_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,

  -- Preference details
  priority INTEGER DEFAULT 1, -- Lower = higher priority (1 is top)
  notes TEXT, -- Optional user notes about this provider

  -- Tracking
  times_booked INTEGER DEFAULT 0, -- How many times user booked this provider
  last_booked_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure unique user-provider pairs
  UNIQUE(user_id, provider_id)
);
-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_preferred_providers_user ON user_preferred_providers(user_id);
CREATE INDEX IF NOT EXISTS idx_preferred_providers_provider ON user_preferred_providers(provider_id);
CREATE INDEX IF NOT EXISTS idx_preferred_providers_priority ON user_preferred_providers(user_id, priority);
-- Enable RLS
ALTER TABLE user_preferred_providers ENABLE ROW LEVEL SECURITY;
-- RLS Policies
CREATE POLICY "Users can view own preferred providers"
  ON user_preferred_providers FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Users can add preferred providers"
  ON user_preferred_providers FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own preferred providers"
  ON user_preferred_providers FOR UPDATE
  USING (auth.uid() = user_id);
CREATE POLICY "Users can remove preferred providers"
  ON user_preferred_providers FOR DELETE
  USING (auth.uid() = user_id);
-- Function to toggle preferred provider
CREATE OR REPLACE FUNCTION toggle_preferred_provider(
  p_provider_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_existing RECORD;
  v_result JSONB;
BEGIN
  -- Get current user
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Check if already preferred
  SELECT * INTO v_existing
  FROM user_preferred_providers
  WHERE user_id = v_user_id AND provider_id = p_provider_id;

  IF v_existing IS NOT NULL THEN
    -- Remove from preferred
    DELETE FROM user_preferred_providers
    WHERE user_id = v_user_id AND provider_id = p_provider_id;

    v_result := jsonb_build_object(
      'success', true,
      'action', 'removed',
      'is_preferred', false
    );
  ELSE
    -- Add to preferred (get next priority number)
    INSERT INTO user_preferred_providers (user_id, provider_id, priority)
    SELECT v_user_id, p_provider_id, COALESCE(MAX(priority), 0) + 1
    FROM user_preferred_providers
    WHERE user_id = v_user_id;

    v_result := jsonb_build_object(
      'success', true,
      'action', 'added',
      'is_preferred', true
    );
  END IF;

  RETURN v_result;
END;
$$;
-- Function to get providers sorted by preference
CREATE OR REPLACE FUNCTION get_providers_by_preference(
  p_provider_type TEXT DEFAULT NULL,
  p_specialty TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  title TEXT,
  bio TEXT,
  provider_type TEXT,
  specialties TEXT[],
  licenses JSONB,
  profile_image_url TEXT,
  rating NUMERIC,
  review_count INTEGER,
  is_preferred BOOLEAN,
  preference_priority INTEGER,
  times_booked INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();

  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.title,
    p.bio,
    p.provider_type,
    p.specialties,
    p.licenses,
    p.profile_image_url,
    p.rating,
    p.review_count,
    (upp.id IS NOT NULL) AS is_preferred,
    COALESCE(upp.priority, 999) AS preference_priority,
    COALESCE(upp.times_booked, 0) AS times_booked
  FROM providers p
  LEFT JOIN user_preferred_providers upp
    ON p.id = upp.provider_id AND upp.user_id = v_user_id
  WHERE p.is_active = true
    AND (p_provider_type IS NULL OR p.provider_type = p_provider_type)
    AND (p_specialty IS NULL OR p_specialty = ANY(p.specialties))
  ORDER BY
    (upp.id IS NOT NULL) DESC, -- Preferred first
    COALESCE(upp.priority, 999) ASC, -- Then by priority
    COALESCE(upp.times_booked, 0) DESC, -- Then by times booked
    p.rating DESC NULLS LAST; -- Then by rating
END;
$$;
-- Function to update booking count when session is booked
CREATE OR REPLACE FUNCTION update_preferred_provider_booking()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update times_booked and last_booked_at for preferred providers
  UPDATE user_preferred_providers
  SET
    times_booked = times_booked + 1,
    last_booked_at = NOW(),
    updated_at = NOW()
  WHERE user_id = NEW.user_id
    AND provider_id = NEW.provider_id;

  RETURN NEW;
END;
$$;
-- Create trigger on sessions table (if it exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sessions') THEN
    DROP TRIGGER IF EXISTS trigger_update_preferred_provider_booking ON sessions;
    CREATE TRIGGER trigger_update_preferred_provider_booking
      AFTER INSERT ON sessions
      FOR EACH ROW
      EXECUTE FUNCTION update_preferred_provider_booking();
  END IF;
END $$;
-- Grant execute permissions
GRANT EXECUTE ON FUNCTION toggle_preferred_provider(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_providers_by_preference(TEXT, TEXT) TO authenticated;
