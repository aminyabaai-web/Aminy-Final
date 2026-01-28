-- ============================================================================
-- PROVIDER CREDENTIALS VERIFICATION
-- Stores and tracks provider credential verification status
-- ============================================================================

-- Provider credentials table
CREATE TABLE IF NOT EXISTS provider_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credential_type TEXT NOT NULL,
  credential_number TEXT NOT NULL,
  issuing_body TEXT,
  state TEXT,
  issue_date DATE,
  expiration_date DATE,
  verification_status TEXT NOT NULL DEFAULT 'pending',
  verified_at TIMESTAMPTZ,
  verification_notes TEXT,
  raw_response JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Prevent duplicate credentials
  UNIQUE(provider_id, credential_type, credential_number),

  -- Valid credential types
  CONSTRAINT valid_credential_type CHECK (credential_type IN (
    'bcba', 'bcba-d', 'bcaba', 'rbt',
    'lcsw', 'lmft', 'psychologist',
    'slp', 'ot', 'pt', 'npi'
  )),

  -- Valid verification statuses
  CONSTRAINT valid_verification_status CHECK (verification_status IN (
    'pending', 'verified', 'failed', 'expired', 'manual_review'
  ))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_provider_credentials_provider ON provider_credentials(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_credentials_status ON provider_credentials(verification_status);
CREATE INDEX IF NOT EXISTS idx_provider_credentials_type ON provider_credentials(credential_type);
CREATE INDEX IF NOT EXISTS idx_provider_credentials_expiry ON provider_credentials(expiration_date)
  WHERE expiration_date IS NOT NULL;

-- Admin tasks table for manual verification
CREATE TABLE IF NOT EXISTS admin_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_type TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'pending',
  assigned_to UUID REFERENCES auth.users(id),
  data JSONB DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,

  CONSTRAINT valid_priority CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  CONSTRAINT valid_task_status CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled'))
);

CREATE INDEX IF NOT EXISTS idx_admin_tasks_status ON admin_tasks(status);
CREATE INDEX IF NOT EXISTS idx_admin_tasks_type ON admin_tasks(task_type);
CREATE INDEX IF NOT EXISTS idx_admin_tasks_priority ON admin_tasks(priority);

-- Enable RLS
ALTER TABLE provider_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for provider_credentials
CREATE POLICY "Providers can view own credentials"
  ON provider_credentials FOR SELECT
  USING (auth.uid() = provider_id);

CREATE POLICY "Providers can insert own credentials"
  ON provider_credentials FOR INSERT
  WITH CHECK (auth.uid() = provider_id);

CREATE POLICY "Admins can view all credentials"
  ON provider_credentials FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  );

-- RLS Policies for admin_tasks (admin only)
CREATE POLICY "Admins can manage tasks"
  ON admin_tasks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  );

-- Function to check for expiring credentials (run daily)
CREATE OR REPLACE FUNCTION check_expiring_credentials()
RETURNS void AS $$
DECLARE
  credential RECORD;
BEGIN
  -- Find credentials expiring in the next 30 days
  FOR credential IN
    SELECT * FROM provider_credentials
    WHERE verification_status = 'verified'
    AND expiration_date IS NOT NULL
    AND expiration_date <= CURRENT_DATE + INTERVAL '30 days'
    AND expiration_date > CURRENT_DATE
  LOOP
    -- Create a notification task
    INSERT INTO admin_tasks (task_type, priority, status, data)
    VALUES (
      'credential_expiring',
      'medium',
      'pending',
      jsonb_build_object(
        'provider_id', credential.provider_id,
        'credential_type', credential.credential_type,
        'credential_number', credential.credential_number,
        'expiration_date', credential.expiration_date
      )
    )
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- Mark expired credentials
  UPDATE provider_credentials
  SET verification_status = 'expired',
      updated_at = NOW()
  WHERE verification_status = 'verified'
  AND expiration_date IS NOT NULL
  AND expiration_date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- View for provider verification summary
CREATE OR REPLACE VIEW provider_verification_summary AS
SELECT
  pc.provider_id,
  COUNT(*) as total_credentials,
  COUNT(*) FILTER (WHERE pc.verification_status = 'verified') as verified_count,
  COUNT(*) FILTER (WHERE pc.verification_status = 'pending') as pending_count,
  COUNT(*) FILTER (WHERE pc.verification_status = 'manual_review') as review_count,
  COUNT(*) FILTER (WHERE pc.verification_status = 'failed') as failed_count,
  COUNT(*) FILTER (WHERE pc.verification_status = 'expired') as expired_count,
  ARRAY_AGG(pc.credential_type) FILTER (WHERE pc.verification_status = 'verified') as verified_credentials,
  MIN(pc.expiration_date) FILTER (WHERE pc.verification_status = 'verified') as next_expiration,
  CASE
    WHEN COUNT(*) FILTER (WHERE pc.verification_status = 'verified') >= 2 THEN 'gold'
    WHEN COUNT(*) FILTER (WHERE pc.verification_status = 'verified') >= 1 THEN 'verified'
    WHEN COUNT(*) FILTER (WHERE pc.verification_status IN ('pending', 'manual_review')) > 0 THEN 'pending'
    ELSE 'none'
  END as badge_level
FROM provider_credentials pc
GROUP BY pc.provider_id;

COMMENT ON TABLE provider_credentials IS 'Stores provider credential verification status and history';
COMMENT ON TABLE admin_tasks IS 'Admin task queue for manual verifications and other admin actions';
