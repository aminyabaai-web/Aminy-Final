-- 1. Orchestration audit trail (used by all 3 orchestrators)
CREATE TABLE IF NOT EXISTS orchestration_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  flow_type text NOT NULL,
  step_name text NOT NULL,
  status text NOT NULL DEFAULT 'started',
  metadata jsonb DEFAULT '{}',
  error_message text,
  created_at timestamptz DEFAULT now()
);

-- 2. FHIR export storage
CREATE TABLE IF NOT EXISTS fhir_exports (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  resource_type text NOT NULL,
  fhir_bundle jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- 3. Screening recommendations from onboarding
CREATE TABLE IF NOT EXISTS screening_recommendations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  child_id uuid,
  instrument text NOT NULL,
  reason text,
  priority text DEFAULT 'medium',
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

-- 4. Benefits lookup cache
CREATE TABLE IF NOT EXISTS benefits_lookups (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  state text,
  lookup_results jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- 5. Insurance appeal letters
CREATE TABLE IF NOT EXISTS appeal_letters (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  prior_auth_id uuid,
  letter_content text,
  letter_type text DEFAULT 'initial',
  status text DEFAULT 'draft',
  created_at timestamptz DEFAULT now()
);

-- 6. Claim submission retry queue
CREATE TABLE IF NOT EXISTS claim_submission_attempts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  claim_data jsonb NOT NULL,
  status text DEFAULT 'pending',
  attempts integer DEFAULT 0,
  last_error text,
  next_retry_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE orchestration_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE fhir_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE screening_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE benefits_lookups ENABLE ROW LEVEL SECURITY;
ALTER TABLE appeal_letters ENABLE ROW LEVEL SECURITY;
ALTER TABLE claim_submission_attempts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist so we can recreate them safely
DROP POLICY IF EXISTS "Users see own data" ON orchestration_events;
DROP POLICY IF EXISTS "Users see own data" ON fhir_exports;
DROP POLICY IF EXISTS "Users see own data" ON screening_recommendations;
DROP POLICY IF EXISTS "Users see own data" ON benefits_lookups;
DROP POLICY IF EXISTS "Users see own data" ON appeal_letters;
DROP POLICY IF EXISTS "Users see own data" ON claim_submission_attempts;

-- RLS policies: users can only see their own data
CREATE POLICY "Users see own data" ON orchestration_events FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users see own data" ON fhir_exports FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users see own data" ON screening_recommendations FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users see own data" ON benefits_lookups FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users see own data" ON appeal_letters FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users see own data" ON claim_submission_attempts FOR ALL USING (auth.uid() = user_id);
