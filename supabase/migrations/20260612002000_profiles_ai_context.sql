-- AI-generated context (calm cues, wins, struggle notes) stored as JSONB
-- Replaces KV key: context:${userId}
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS ai_context JSONB NOT NULL DEFAULT '{}';
