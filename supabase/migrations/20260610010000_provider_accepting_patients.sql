-- Add is_accepting_patients flag to provider_profiles.
-- Used by ProviderMarketplace and OnDemandTelehealth to filter available providers.
ALTER TABLE provider_profiles
  ADD COLUMN IF NOT EXISTS is_accepting_patients BOOLEAN NOT NULL DEFAULT true;
