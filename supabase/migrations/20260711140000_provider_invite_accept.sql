-- ============================================================================
-- Provider-invite accept flow (audit follow-up).
--
-- Providers invite families via InviteFamiliesPanel -> provider_invites rows
-- (status 'sent'). Previously nothing ever flipped them to 'accepted' — the
-- signup stored `aminy_provider_invite` in localStorage but no code read it.
-- This adds an accept RPC (matches the caller's verified email, like the
-- caregiver accept flow) so a family that signs up after a provider invite
-- links back to that provider. Called once per session from the App auth hook.
-- ============================================================================

ALTER TABLE public.provider_invites
  ADD COLUMN IF NOT EXISTS accepted_user_id uuid REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS idx_provider_invites_accepted_user
  ON public.provider_invites(accepted_user_id) WHERE accepted_user_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.accept_provider_invites()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  caller uuid := auth.uid();
  caller_email text;
  updated integer;
BEGIN
  IF caller IS NULL THEN RETURN 0; END IF;
  SELECT email INTO caller_email FROM auth.users
  WHERE id = caller AND email_confirmed_at IS NOT NULL;
  IF caller_email IS NULL THEN RETURN 0; END IF;

  UPDATE public.provider_invites
  SET status = 'accepted',
      accepted_user_id = caller,
      accepted_at = COALESCE(accepted_at, now())
  WHERE lower(parent_email) = lower(caller_email)
    AND status = 'sent';

  GET DIAGNOSTICS updated = ROW_COUNT;
  RETURN updated;
END;
$$;

REVOKE ALL ON FUNCTION public.accept_provider_invites() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.accept_provider_invites() FROM anon;
GRANT EXECUTE ON FUNCTION public.accept_provider_invites() TO authenticated;
