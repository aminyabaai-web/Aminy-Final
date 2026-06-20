-- Family Journey Roadmap State
-- Tracks which onboarding steps a family has completed so the AI can
-- reference the roadmap and proactively nudge toward incomplete steps.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_steps_completed jsonb DEFAULT '{}';

-- Example shape: {"evaluation": true, "iep_request": false, "aba_booked": true,
--                 "meds_setup": false, "benefits_checked": false, "community_joined": false}
