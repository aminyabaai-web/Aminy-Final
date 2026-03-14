-- Migration 027: Prior Authorization Requests table
-- Migrates prior auth data from localStorage to Supabase persistence
-- Supports multi-device sync and server-side processing

CREATE TABLE IF NOT EXISTS prior_auth_requests (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  child_name TEXT NOT NULL,
  service_type TEXT NOT NULL,
  frequency TEXT NOT NULL,
  duration TEXT NOT NULL DEFAULT '6 months',
  diagnosis_codes TEXT[] NOT NULL DEFAULT '{}',
  provider_name TEXT NOT NULL,
  provider_npi TEXT,
  provider_credentials TEXT,
  insurance_company TEXT NOT NULL,
  member_id TEXT,
  attached_documents TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'ready', 'submitted', 'approved', 'denied')),
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Indexes
CREATE INDEX idx_prior_auth_requests_user ON prior_auth_requests(user_id);
CREATE INDEX idx_prior_auth_requests_status ON prior_auth_requests(status);
CREATE INDEX idx_prior_auth_requests_created ON prior_auth_requests(created_at DESC);
-- Enable RLS
ALTER TABLE prior_auth_requests ENABLE ROW LEVEL SECURITY;
-- Users can view their own prior auth requests
CREATE POLICY "Users can view own prior auth requests"
  ON prior_auth_requests FOR SELECT
  USING (auth.uid() = user_id);
-- Users can insert their own prior auth requests
CREATE POLICY "Users can insert own prior auth requests"
  ON prior_auth_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);
-- Users can update their own prior auth requests
CREATE POLICY "Users can update own prior auth requests"
  ON prior_auth_requests FOR UPDATE
  USING (auth.uid() = user_id);
-- Users can delete their own prior auth requests
CREATE POLICY "Users can delete own prior auth requests"
  ON prior_auth_requests FOR DELETE
  USING (auth.uid() = user_id);
-- Grant permissions to authenticated users
GRANT ALL ON prior_auth_requests TO authenticated;
-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_prior_auth_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER prior_auth_requests_updated_at
  BEFORE UPDATE ON prior_auth_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_prior_auth_requests_updated_at();
