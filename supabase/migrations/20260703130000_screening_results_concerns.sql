-- Multi-select funnel: carry ALL selected concerns through signup.
-- FreeScreeningFlow now saves concerns[] + primaryConcern on each result;
-- these columns let handleOnboardingComplete forward them so the
-- screening-due engine and AI context can see queued (unscreened) concerns
-- after signup. Additive + nullable — old rows and old clients unaffected.

ALTER TABLE public.screening_results ADD COLUMN IF NOT EXISTS concerns text[];
ALTER TABLE public.screening_results ADD COLUMN IF NOT EXISTS primary_concern text;
