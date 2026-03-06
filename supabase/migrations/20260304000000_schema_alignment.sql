-- ============================================================================
-- SCHEMA ALIGNMENT MIGRATION
-- Adds missing columns, views, and tables to match frontend expectations
-- ============================================================================

-- 1. Add full_name generated column to provider_profiles
-- Frontend uses full_name in 20+ places; DB has 'name'
ALTER TABLE provider_profiles ADD COLUMN IF NOT EXISTS full_name TEXT GENERATED ALWAYS AS (name) STORED;

-- 2. Create evv_records view (frontend references evv_records, DB has evv_timesheets)
CREATE OR REPLACE VIEW evv_records AS
SELECT
  id,
  caregiver_id AS provider_id,
  patient_id AS child_id,
  shift_start AS clock_in_time,
  shift_end AS clock_out_time,
  start_latitude,
  start_longitude,
  end_latitude,
  end_longitude,
  status,
  acumen_dci_export_id,
  created_at,
  -- Computed columns the frontend expects
  NULL::uuid AS authorization_id,
  NULL::text AS provider_name,
  NULL::date AS service_date,
  NULL::jsonb AS clock_in_location,
  NULL::jsonb AS clock_out_location,
  NULL::integer AS duration_minutes,
  NULL::integer AS units,
  NULL::text AS service_code,
  'gps'::text AS verification_method,
  NULL::text AS client_signature,
  NULL::text AS provider_signature,
  NULL::text AS rejection_reason,
  NULL::text AS notes
FROM evv_timesheets;

-- 3. Vault Documents table
CREATE TABLE IF NOT EXISTS vault_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL DEFAULT 'other',
  file_path TEXT NOT NULL,
  file_size BIGINT DEFAULT 0,
  mime_type TEXT,
  record_type TEXT DEFAULT 'uploaded' CHECK (record_type IN (
    'iep', 'evaluation', 'report', 'prescription', 'care-plan',
    'uploaded', 'coach-note', 'session-artifact', 'school-letter', 'other'
  )),
  source TEXT DEFAULT 'parent-upload' CHECK (source IN (
    'parent-upload', 'junior', 'coach', 'school', 'clinic', 'other'
  )),
  visibility TEXT DEFAULT 'private' CHECK (visibility IN ('private', 'shared')),
  uploaded_at TIMESTAMPTZ DEFAULT now(),
  metadata JSONB DEFAULT '{}'
);

ALTER TABLE vault_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own vault documents" ON vault_documents;
CREATE POLICY "Users manage own vault documents" ON vault_documents
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 4. Vault Share Links
CREATE TABLE IF NOT EXISTS vault_share_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES vault_documents(id) ON DELETE CASCADE NOT NULL,
  expires_at TIMESTAMPTZ,
  passcode TEXT,
  max_views INTEGER,
  view_count INTEGER DEFAULT 0,
  recipient_email TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE vault_share_links ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own share links" ON vault_share_links;
CREATE POLICY "Users manage own share links" ON vault_share_links
  FOR ALL USING (
    document_id IN (SELECT id FROM vault_documents WHERE user_id = auth.uid())
  );

-- 5. Vault Access Log (audit trail)
CREATE TABLE IF NOT EXISTS vault_access_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES vault_documents(id) ON DELETE CASCADE,
  accessed_by UUID REFERENCES auth.users(id),
  access_type TEXT DEFAULT 'view',
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE vault_access_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users see own vault access logs" ON vault_access_log;
CREATE POLICY "Users see own vault access logs" ON vault_access_log
  FOR SELECT USING (
    document_id IN (SELECT id FROM vault_documents WHERE user_id = auth.uid())
  );

-- 6. Calm Tool Sessions
CREATE TABLE IF NOT EXISTS calm_tool_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  child_id UUID,
  tool_type TEXT NOT NULL CHECK (tool_type IN (
    'breathing', 'visual-timer', 'bubble-pop', 'fluid-swirl',
    'fidget-spinner', 'grounding', 'body-scan', 'music',
    'white-noise', 'counting', 'squeeze', 'shake-it-out'
  )),
  started_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER DEFAULT 0,
  mood_before INTEGER CHECK (mood_before BETWEEN 1 AND 5),
  mood_after INTEGER CHECK (mood_after BETWEEN 1 AND 5),
  was_effective BOOLEAN,
  triggered_by TEXT,
  context TEXT,
  notes TEXT,
  coins_earned INTEGER DEFAULT 0
);

ALTER TABLE calm_tool_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own calm sessions" ON calm_tool_sessions;
CREATE POLICY "Users manage own calm sessions" ON calm_tool_sessions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 7. Daily Routines
CREATE TABLE IF NOT EXISTS daily_routines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  child_id UUID,
  period TEXT DEFAULT 'morning' CHECK (period IN ('morning', 'afternoon', 'evening', 'bedtime')),
  name TEXT NOT NULL,
  description TEXT,
  steps JSONB DEFAULT '[]',
  scheduled_time TEXT,
  estimated_duration INTEGER DEFAULT 30,
  is_ai_generated BOOLEAN DEFAULT false,
  linked_goal_ids JSONB DEFAULT '[]',
  difficulty TEXT DEFAULT 'moderate' CHECK (difficulty IN ('easy', 'moderate', 'challenging')),
  is_active BOOLEAN DEFAULT true,
  days_of_week JSONB DEFAULT '[0,1,2,3,4,5,6]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE daily_routines ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own routines" ON daily_routines;
CREATE POLICY "Users manage own routines" ON daily_routines
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 8. Routine Completions
CREATE TABLE IF NOT EXISTS routine_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  routine_id UUID REFERENCES daily_routines(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  child_id UUID,
  scheduled_date DATE NOT NULL DEFAULT CURRENT_DATE,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped', 'partial')),
  steps_completed INTEGER DEFAULT 0,
  total_steps INTEGER DEFAULT 0,
  adherence_score INTEGER DEFAULT 0 CHECK (adherence_score BETWEEN 0 AND 100),
  notes TEXT,
  mood_before TEXT CHECK (mood_before IN ('calm', 'neutral', 'agitated')),
  mood_after TEXT CHECK (mood_after IN ('calm', 'neutral', 'agitated')),
  challenges_noted JSONB DEFAULT '[]'
);

ALTER TABLE routine_completions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own routine completions" ON routine_completions;
CREATE POLICY "Users manage own routine completions" ON routine_completions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 9. Create vault-documents storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('vault-documents', 'vault-documents', false, 52428800)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: users can only access their own files
-- File paths are structured as: user_id/filename
DROP POLICY IF EXISTS "Users can upload their own vault files" ON storage.objects;
CREATE POLICY "Users can upload their own vault files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'vault-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can view their own vault files" ON storage.objects;
CREATE POLICY "Users can view their own vault files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'vault-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can delete their own vault files" ON storage.objects;
CREATE POLICY "Users can delete their own vault files"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'vault-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 10. Fix find_matching_providers RPC to match actual providers table schema
-- Must DROP first because return type changed (CREATE OR REPLACE can't change return types)
DROP FUNCTION IF EXISTS find_matching_providers(TEXT, TEXT, TEXT, INT);

CREATE FUNCTION find_matching_providers(
  p_state TEXT,
  p_insurance TEXT,
  p_type TEXT DEFAULT 'bcba',
  p_limit INT DEFAULT 3
)
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  title TEXT,
  avatar_url TEXT,
  hourly_rate INTEGER,
  rating DECIMAL
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.name AS full_name,
    p.role AS title,
    p.photo AS avatar_url,
    p.hourly_rate,
    p.rating
  FROM
    providers p
  WHERE
    p.role = p_type
    AND p.accepting_new_patients = TRUE
    AND (
      p_state IS NULL
      OR p_state = ANY(p.states_licensed)
      OR p.video_enabled = TRUE
    )
  ORDER BY
    p.rating DESC,
    random()
  LIMIT
    p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION find_matching_providers(TEXT, TEXT, TEXT, INT) TO authenticated;
