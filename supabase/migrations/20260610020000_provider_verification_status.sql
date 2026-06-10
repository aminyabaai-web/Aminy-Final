-- Add verification_status to provider_profiles.
-- Column was defined in 026_seed_providers.sql but missing from the remote DB schema.
ALTER TABLE provider_profiles
  ADD COLUMN IF NOT EXISTS verification_status TEXT NOT NULL DEFAULT 'verified'
    CHECK (verification_status IN ('verified', 'pending', 'manual_review', 'expired', 'failed'));

CREATE INDEX IF NOT EXISTS idx_provider_profiles_verification_status
  ON provider_profiles (verification_status);
