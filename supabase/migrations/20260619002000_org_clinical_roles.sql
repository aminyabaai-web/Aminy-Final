-- Org Clinical Roles + Provider Supervisor Link
-- Extends organization_members with a clinical_role distinguishing
-- clinical_director / bcba / rbt / billing / admin within the org.
-- Also adds supervisor_user_id to providers so RBTs can be linked to their supervising BCBA.

ALTER TABLE public.organization_members
  ADD COLUMN IF NOT EXISTS clinical_role text DEFAULT 'bcba'
    CHECK (clinical_role IN ('clinical_director','bcba','rbt','billing','admin'));

-- providers table may be named 'providers' or 'provider_profiles' depending on migration order
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='providers') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema='public' AND table_name='providers' AND column_name='supervisor_user_id') THEN
      ALTER TABLE public.providers
        ADD COLUMN supervisor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
    END IF;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='provider_profiles') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema='public' AND table_name='provider_profiles' AND column_name='supervisor_user_id') THEN
      ALTER TABLE public.provider_profiles
        ADD COLUMN supervisor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_org_members_clinical_role
  ON public.organization_members(org_id, clinical_role)
  WHERE status = 'active';
