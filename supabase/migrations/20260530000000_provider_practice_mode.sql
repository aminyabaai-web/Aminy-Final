-- Independent-BCBA "practice-in-a-box" wedge: persist the provider's chosen
-- practice structure so the choice round-trips (ProviderOnboarding writes it,
-- ProviderPortal reads it to frame "My Practice / Your RBTs" vs "Organization Caseload").
--   'independent' = BCBA runs their own practice (rosters/supervises their own RBTs)
--   'org'         = BCBA operates under an organization (org owns billing/contracts)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS practice_mode text NOT NULL DEFAULT 'independent';

-- Optional guard: keep values constrained (drop-and-recreate so re-runs are safe).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_practice_mode_chk'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_practice_mode_chk
      CHECK (practice_mode IN ('independent', 'org'));
  END IF;
END $$;
