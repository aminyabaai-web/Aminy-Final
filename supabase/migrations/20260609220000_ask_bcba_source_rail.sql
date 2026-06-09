-- Track which economics rail a question arrived on (see src/lib/ask-bcba-economics.ts):
-- session_bundled | pro_plus_pool | pay_per_question | partner_org:<slug>
-- auto_routed guards in case the deployed schema predates it.
ALTER TABLE public.ask_bcba_threads
  ADD COLUMN IF NOT EXISTS source TEXT,
  ADD COLUMN IF NOT EXISTS auto_routed BOOLEAN NOT NULL DEFAULT false;
