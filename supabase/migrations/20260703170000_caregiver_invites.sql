-- Family & Care Team invites (Viral Loop 2: second-parent / co-caregiver)
-- CHILD-SCOPED like iCloud Family sharing: each row invites one person into ONE
-- child's care circle (multi-child invites = one row per child). Previously the
-- caregiver screens were local-state stubs — invites vanished on reload and no
-- record existed at all.
--
-- ENFORCEMENT STATUS (be honest in UI copy):
--   * This table RECORDS the child-scoped invite + role. That's what exists.
--   * Data-access enforcement for an ACCEPTED caregiver (RLS granting the
--     co-parent read/write on the child's rows — children.parent_id is still
--     the only access path) is NOT yet implemented. Accept flow + shared-access
--     RLS is the follow-up; UI copy must not promise live shared access until
--     that lands.

CREATE TABLE IF NOT EXISTS public.caregiver_invites (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id      uuid NOT NULL,              -- inviting parent (auth.uid())
  child_id      uuid,                       -- scoped child (children.id); null = legacy/unscoped
  child_name    text,                       -- denormalized for display + invite message
  invitee_name  text,
  invitee_email text NOT NULL,
  -- 'caregiver' (co-parent) | 'read-only'
  role          text DEFAULT 'caregiver',
  -- 'pending' | 'accepted' | 'revoked'
  status        text DEFAULT 'pending',
  invited_at    timestamptz DEFAULT now(),
  accepted_at   timestamptz,
  UNIQUE(owner_id, invitee_email, child_id)
);

CREATE INDEX IF NOT EXISTS idx_caregiver_invites_owner
  ON public.caregiver_invites(owner_id);
CREATE INDEX IF NOT EXISTS idx_caregiver_invites_email
  ON public.caregiver_invites(invitee_email);

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE public.caregiver_invites ENABLE ROW LEVEL SECURITY;

-- The inviting parent manages only their own invites.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='caregiver_invites' AND policyname='owner_own_caregiver_invites') THEN
    CREATE POLICY "owner_own_caregiver_invites" ON public.caregiver_invites
      FOR ALL USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
  END IF;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.caregiver_invites TO authenticated;
GRANT ALL ON public.caregiver_invites TO service_role;
