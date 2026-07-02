-- Memory facts: tier-based expiry support
--
-- The /memory/store edge route accepts an `expiresAt` from the client
-- (contextLayer.storeMemory sends a 30-day window) but the memory_facts table
-- had no column to persist it — the value was silently dropped. This adds the
-- column so stored memories can expire per tier retention windows.
--
-- The edge function is defensive: it retries the upsert without expires_at if
-- this migration has not been applied yet, and /memory/recent filters expired
-- rows in JS. So this migration can be applied at any time without breaking
-- the deployed function.

ALTER TABLE public.memory_facts
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- Partial index: most rows never expire (NULL), so only index rows that do.
CREATE INDEX IF NOT EXISTS idx_memory_facts_expires_at
  ON public.memory_facts (expires_at)
  WHERE expires_at IS NOT NULL;

COMMENT ON COLUMN public.memory_facts.expires_at IS
  'Tier-based memory retention deadline. NULL = never expires. Rows past this timestamp are excluded from /memory/recent and AI prompt injection.';
