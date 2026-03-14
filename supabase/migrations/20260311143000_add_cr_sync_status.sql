CREATE TABLE IF NOT EXISTS public.cr_sync_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data_type text NOT NULL,
  direction text NOT NULL CHECK (direction IN ('pull', 'push')),
  status text NOT NULL DEFAULT 'idle' CHECK (status IN ('idle', 'syncing', 'success', 'error', 'backoff')),
  last_sync_at timestamptz,
  last_error text,
  consecutive_failures integer NOT NULL DEFAULT 0,
  next_sync_at timestamptz,
  records_synced integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cr_sync_status_user_data_direction_key UNIQUE (user_id, data_type, direction)
);

CREATE INDEX IF NOT EXISTS idx_cr_sync_status_user_id ON public.cr_sync_status(user_id);
CREATE INDEX IF NOT EXISTS idx_cr_sync_status_status ON public.cr_sync_status(status);

GRANT SELECT, INSERT, UPDATE ON public.cr_sync_status TO authenticated;
GRANT ALL ON public.cr_sync_status TO service_role;
