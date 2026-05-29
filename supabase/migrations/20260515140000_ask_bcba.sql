-- Migration: Ask a BCBA — async parent-to-BCBA messaging product
-- Compete with Answers Now ($55/mo). Parent asks question, AI drafts first,
-- BCBA reviews + signs within 24h. Premium add-on $30/mo or included in Pro+.

CREATE TABLE IF NOT EXISTS public.ask_bcba_threads (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now(),

  -- Who's asking
  parent_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  child_id        uuid,
  parent_name     text,
  child_name      text,

  -- The question
  question        text NOT NULL,
  category        text CHECK (category IN (
    'behavior', 'sleep', 'feeding', 'transitions', 'sensory', 'communication',
    'school', 'social', 'self-care', 'safety', 'medication', 'other'
  )),
  attachments     jsonb DEFAULT '[]'::jsonb,  -- array of {type, url, name}

  -- AI first draft
  ai_draft        text,
  ai_drafted_at   timestamptz,
  ai_model        text,

  -- BCBA review
  bcba_id         uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  bcba_name       text,
  bcba_response   text,
  bcba_responded_at timestamptz,
  bcba_credentials text,

  -- Status
  status          text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'ai_drafted', 'awaiting_bcba', 'completed', 'closed')),
  priority        text DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'urgent')),

  -- SLA tracking
  target_response_at timestamptz,  -- 24h from creation
  parent_rating   integer CHECK (parent_rating BETWEEN 1 AND 5),
  parent_feedback text
);

CREATE INDEX IF NOT EXISTS idx_ask_bcba_parent ON public.ask_bcba_threads(parent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ask_bcba_status ON public.ask_bcba_threads(status, target_response_at);
CREATE INDEX IF NOT EXISTS idx_ask_bcba_bcba ON public.ask_bcba_threads(bcba_id, status);

ALTER TABLE public.ask_bcba_threads ENABLE ROW LEVEL SECURITY;

-- Parents see their own threads
DROP POLICY IF EXISTS "Parents read own threads" ON public.ask_bcba_threads;
CREATE POLICY "Parents read own threads"
  ON public.ask_bcba_threads FOR SELECT
  USING (parent_id = auth.uid());

-- Parents can create threads
DROP POLICY IF EXISTS "Parents create threads" ON public.ask_bcba_threads;
CREATE POLICY "Parents create threads"
  ON public.ask_bcba_threads FOR INSERT
  WITH CHECK (parent_id = auth.uid());

-- Parents can update only their own rating/feedback
DROP POLICY IF EXISTS "Parents rate own threads" ON public.ask_bcba_threads;
CREATE POLICY "Parents rate own threads"
  ON public.ask_bcba_threads FOR UPDATE
  USING (parent_id = auth.uid());

-- BCBAs see all pending threads in their queue
DROP POLICY IF EXISTS "BCBAs read queue" ON public.ask_bcba_threads;
CREATE POLICY "BCBAs read queue"
  ON public.ask_bcba_threads FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'provider'
    )
  );

-- BCBAs can write responses (claim a thread by setting bcba_id, then update bcba_response)
DROP POLICY IF EXISTS "BCBAs respond" ON public.ask_bcba_threads;
CREATE POLICY "BCBAs respond"
  ON public.ask_bcba_threads FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'provider'
    )
  );
