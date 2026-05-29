-- Migration: Extend ask_bcba_threads to support multiple provider types.
-- The product now supports: BCBA (full), behavioralist RBT (basic), and
-- mental-health therapist (LMFT/LCSW/Psychologist). Each tier has different
-- pricing + provider eligibility.

ALTER TABLE public.ask_bcba_threads
  ADD COLUMN IF NOT EXISTS responder_tier text DEFAULT 'bcba'
    CHECK (responder_tier IN ('bcba', 'rbt', 'therapist', 'psychiatrist')),
  /** Which state's licensure the answering provider must hold (parent's state) */
  ADD COLUMN IF NOT EXISTS required_state char(2),
  /** When the responder was assigned vs claimed */
  ADD COLUMN IF NOT EXISTS assigned_at timestamptz,
  /** Was this question routed by AI to a specific tier based on content? */
  ADD COLUMN IF NOT EXISTS auto_routed boolean DEFAULT false;

-- New category options for MH-focused questions
ALTER TABLE public.ask_bcba_threads
  DROP CONSTRAINT IF EXISTS ask_bcba_threads_category_check;

ALTER TABLE public.ask_bcba_threads
  ADD CONSTRAINT ask_bcba_threads_category_check
  CHECK (category IN (
    'behavior', 'sleep', 'feeding', 'transitions', 'sensory', 'communication',
    'school', 'social', 'self-care', 'safety', 'medication',
    -- Mental health additions
    'anxiety', 'depression', 'family_dynamics', 'parent_wellbeing', 'sibling_dynamics',
    'other'
  ));

-- Index: assigning queue by tier + state (responder dashboard query)
CREATE INDEX IF NOT EXISTS idx_ask_bcba_queue
  ON public.ask_bcba_threads(responder_tier, required_state, status, target_response_at)
  WHERE status IN ('pending', 'ai_drafted', 'awaiting_bcba');
