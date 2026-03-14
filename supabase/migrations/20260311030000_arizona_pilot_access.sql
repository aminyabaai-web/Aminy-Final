-- Arizona pilot access metadata for AACT / Rise / payer / EVV rollout
-- Keeps pilot gating and pathway labels tied to durable profile data.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS pilot_eligible BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS pilot_organization TEXT,
  ADD COLUMN IF NOT EXISTS pilot_payers TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS evv_system TEXT,
  ADD COLUMN IF NOT EXISTS system_of_record TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.constraint_column_usage
    WHERE table_name = 'profiles'
      AND constraint_name = 'profiles_pilot_organization_check'
  ) THEN
    ALTER TABLE profiles
      ADD CONSTRAINT profiles_pilot_organization_check
      CHECK (pilot_organization IS NULL OR pilot_organization IN ('aact', 'rise', 'invite_network', 'general_az'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.constraint_column_usage
    WHERE table_name = 'profiles'
      AND constraint_name = 'profiles_evv_system_check'
  ) THEN
    ALTER TABLE profiles
      ADD CONSTRAINT profiles_evv_system_check
      CHECK (evv_system IS NULL OR evv_system IN ('spokchoice', 'dci', 'acumen', 'manual'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.constraint_column_usage
    WHERE table_name = 'profiles'
      AND constraint_name = 'profiles_system_of_record_check'
  ) THEN
    ALTER TABLE profiles
      ADD CONSTRAINT profiles_system_of_record_check
      CHECK (system_of_record IS NULL OR system_of_record IN ('external', 'aminy_shadow', 'aminy_primary'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_profiles_pilot_eligible ON profiles (pilot_eligible);
CREATE INDEX IF NOT EXISTS idx_profiles_pilot_organization ON profiles (pilot_organization);
