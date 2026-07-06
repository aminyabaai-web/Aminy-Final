-- ============================================================================
-- Family shared access — caregiver RLS (co-parent / read-only)
--
-- Background: caregiver_invites (migration 20260703170000) RECORDS a child-scoped
-- invite but grants no data access. This migration makes an ACCEPTED caregiver
-- actually able to read (and, for role='caregiver', write) that specific child's
-- data — iCloud-Family-style, scoped per child.
--
-- Design (from the access-model audit):
--   * children.parent_id is the canonical owner key (children.user_id is vestigial).
--   * accepted_user_id links an invite to the co-parent's auth user (was missing).
--   * Two SECURITY DEFINER predicates read caregiver_invites past its owner-only RLS:
--       is_caregiver_for_child(child)  -> any accepted caregiver (read)
--       can_write_child(child)         -> accepted caregiver with role='caregiver' (write)
--   * Policies are ADDITIVE: new permissive policies added ALONGSIDE the existing
--     owner policies (Postgres ORs permissive policies). Owner access is untouched.
--
-- SAFETY: this migration is INERT until an invite is actually accepted — with zero
-- accepted rows, the predicates return false for everyone, granting no new access.
--
-- SCOPE (v1): child-scoped tables that carry a usable child_id. Deliberately
-- EXCLUDED for now (documented, follow-up): screening_results & clinical_outcomes
-- (legacy TEXT/jwt-sub keys, need casts), and wins_journal (no child_id — can't
-- scope per child without sharing all of the owner's children).
-- ============================================================================

-- ── 1. Link an accepted invite to the co-parent's auth user ──────────────────
ALTER TABLE public.caregiver_invites
  ADD COLUMN IF NOT EXISTS accepted_user_id uuid REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS idx_caregiver_invites_accepted_user
  ON public.caregiver_invites(accepted_user_id)
  WHERE accepted_user_id IS NOT NULL;

COMMENT ON COLUMN public.caregiver_invites.accepted_user_id IS
  'Auth user of the caregiver who accepted this invite. NULL until accepted. Drives shared-access RLS via is_caregiver_for_child().';

-- ── 2. Access predicates (SECURITY DEFINER: read caregiver_invites past its RLS)
-- STABLE + SET search_path='' per repo convention (see get_user_emails helper).
CREATE OR REPLACE FUNCTION public.is_caregiver_for_child(target_child_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT target_child_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.caregiver_invites ci
    WHERE ci.child_id = target_child_id
      AND ci.accepted_user_id = auth.uid()
      AND ci.status = 'accepted'
  );
$$;

CREATE OR REPLACE FUNCTION public.can_write_child(target_child_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT target_child_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.caregiver_invites ci
    WHERE ci.child_id = target_child_id
      AND ci.accepted_user_id = auth.uid()
      AND ci.status = 'accepted'
      AND ci.role = 'caregiver'   -- read-only caregivers excluded from writes
  );
$$;

REVOKE ALL ON FUNCTION public.is_caregiver_for_child(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_write_child(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_caregiver_for_child(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_write_child(uuid) TO authenticated;

-- ── 3. Accept flow (SECURITY DEFINER RPC) ────────────────────────────────────
-- The invitee cannot UPDATE caregiver_invites (owner-only RLS), so accepting runs
-- through this function. It matches the caller's VERIFIED email to pending invites
-- and stamps them accepted. Email match is case-insensitive; only confirmed emails
-- are honored (guards against unverified-email hijacking of an invite).
CREATE OR REPLACE FUNCTION public.accept_caregiver_invites()
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
  IF caller IS NULL THEN
    RETURN 0;
  END IF;

  SELECT email INTO caller_email
  FROM auth.users
  WHERE id = caller AND email_confirmed_at IS NOT NULL;

  IF caller_email IS NULL THEN
    RETURN 0;  -- unverified or missing email: do not auto-accept
  END IF;

  UPDATE public.caregiver_invites
  SET status = 'accepted',
      accepted_user_id = caller,
      accepted_at = COALESCE(accepted_at, now())
  WHERE lower(invitee_email) = lower(caller_email)
    AND status = 'pending';

  GET DIAGNOSTICS updated = ROW_COUNT;
  RETURN updated;
END;
$$;

REVOKE ALL ON FUNCTION public.accept_caregiver_invites() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_caregiver_invites() TO authenticated;

-- ── 4. Additive caregiver policies ───────────────────────────────────────────
-- All named caregiver_* to avoid colliding with existing owner policies.
-- Pattern A (row has user_id owner + nullable child_id): SELECT for read,
--   plus WITH CHECK write policies for co-parent role where writes make sense.
-- Pattern B (row keyed only by child_id, joins children): SELECT branch.

-- children (must branch so caregivers can read the child record itself)
DROP POLICY IF EXISTS caregiver_select_children ON public.children;
CREATE POLICY caregiver_select_children ON public.children
  FOR SELECT USING (public.is_caregiver_for_child(id));

-- Pattern A — read + (co-parent) write
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'behavior_logs','outcome_events','goals','memory_facts',
    'conversations','conversation_memories','care_plan_goals','sleep_records'
  ] LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables
               WHERE table_schema='public' AND table_name=t) THEN
      EXECUTE format('DROP POLICY IF EXISTS caregiver_select_%1$s ON public.%1$I;', t);
      EXECUTE format(
        'CREATE POLICY caregiver_select_%1$s ON public.%1$I FOR SELECT
           USING (public.is_caregiver_for_child(child_id));', t);
      EXECUTE format('DROP POLICY IF EXISTS caregiver_write_%1$s ON public.%1$I;', t);
      EXECUTE format(
        'CREATE POLICY caregiver_write_%1$s ON public.%1$I FOR INSERT
           WITH CHECK (public.can_write_child(child_id));', t);
      EXECUTE format('DROP POLICY IF EXISTS caregiver_update_%1$s ON public.%1$I;', t);
      EXECUTE format(
        'CREATE POLICY caregiver_update_%1$s ON public.%1$I FOR UPDATE
           USING (public.can_write_child(child_id))
           WITH CHECK (public.can_write_child(child_id));', t);
    END IF;
  END LOOP;
END $$;

-- Pattern B — read only (medications etc. are clinical; co-parent read is enough v1)
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'medications','medication_logs','behavior_intervention_plans','child_profiles'
  ] LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables
               WHERE table_schema='public' AND table_name=t) THEN
      EXECUTE format('DROP POLICY IF EXISTS caregiver_select_%1$s ON public.%1$I;', t);
      EXECUTE format(
        'CREATE POLICY caregiver_select_%1$s ON public.%1$I FOR SELECT
           USING (public.is_caregiver_for_child(child_id));', t);
    END IF;
  END LOOP;
END $$;
