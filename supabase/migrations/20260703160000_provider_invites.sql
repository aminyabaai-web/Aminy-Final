-- Provider → Family invites (Viral Loop 1: provider imports their caseload)
-- Each row = one family a provider invited to Aminy from the InviteFamiliesPanel
-- (ProviderPortal → Clients tab). Signup attribution: CreateAccountScreen persists
-- ?provider_invite={id} to localStorage ('aminy_provider_invite'); post-signup
-- linking marks the row accepted and records the relationship as provider_sourced.

CREATE TABLE IF NOT EXISTS public.provider_invites (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id  uuid NOT NULL,
  parent_name  text,
  parent_email text NOT NULL,
  parent_phone text,
  child_name   text,
  -- 'sent' | 'email_failed' | 'accepted'
  status       text DEFAULT 'sent',
  invited_at   timestamptz DEFAULT now(),
  accepted_at  timestamptz,
  UNIQUE(provider_id, parent_email)
);

CREATE INDEX IF NOT EXISTS idx_provider_invites_provider
  ON public.provider_invites(provider_id);
-- Post-signup linking looks invites up by the new user's email.
CREATE INDEX IF NOT EXISTS idx_provider_invites_email
  ON public.provider_invites(parent_email);

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE public.provider_invites ENABLE ROW LEVEL SECURITY;

-- A provider manages only their own invites.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='provider_invites' AND policyname='provider_own_invites') THEN
    CREATE POLICY "provider_own_invites" ON public.provider_invites
      FOR ALL USING (provider_id = auth.uid()) WITH CHECK (provider_id = auth.uid());
  END IF;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.provider_invites TO authenticated;
GRANT ALL ON public.provider_invites TO service_role;
