-- RBT Supervision Tables
-- Moves BACB-compliant supervision tracking from localStorage to Supabase.
-- rbt-supervision.ts business logic is unchanged; only the storage layer moves here.

-- ── RBT org assignment (who supervises whom) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.rbt_org_assignments (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rbt_user_id             uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  supervising_bcba_id     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  org_id                  uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  rbt_certification_number text,
  certification_date      date,
  renewal_date            date,
  state                   text,
  hired_date              date,
  status                  text DEFAULT 'active' CHECK (status IN ('active','inactive','pending')),
  created_at              timestamptz DEFAULT now(),
  updated_at              timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rbt_org_assignments_bcba ON public.rbt_org_assignments(supervising_bcba_id);
CREATE INDEX IF NOT EXISTS idx_rbt_org_assignments_org  ON public.rbt_org_assignments(org_id);

-- ── Supervision sessions (replaces localStorage) ──────────────────────────────
CREATE TABLE IF NOT EXISTS public.rbt_supervision_sessions (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rbt_id                   uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  bcba_id                  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  date                     date NOT NULL,
  duration_minutes         integer NOT NULL,
  type                     text CHECK (type IN ('individual','group')),
  includes_direct_observation boolean DEFAULT false,
  topics_covered           text[] DEFAULT '{}',
  competencies_assessed    text[] DEFAULT '{}',
  bcba_notes               text,
  rbt_signed               boolean DEFAULT false,
  rbt_signed_at            timestamptz,
  bcba_signed              boolean DEFAULT false,
  bcba_signed_at           timestamptz,
  status                   text DEFAULT 'pending-signatures'
    CHECK (status IN ('scheduled','completed','cancelled','pending-signatures')),
  client_id                uuid,
  created_at               timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rbt_sup_sessions_rbt  ON public.rbt_supervision_sessions(rbt_id, date);
CREATE INDEX IF NOT EXISTS idx_rbt_sup_sessions_bcba ON public.rbt_supervision_sessions(bcba_id, date);

-- ── RBT direct service hours per month ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.rbt_direct_service_hours (
  id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rbt_id   uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  month    text NOT NULL,  -- 'YYYY-MM'
  hours    numeric(6,2) DEFAULT 0,
  UNIQUE(rbt_id, month)
);

-- ── BACB competency assessments ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.rbt_competency_assessments (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rbt_id           uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  bcba_id          uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  date             date NOT NULL,
  ratings          jsonb NOT NULL DEFAULT '[]',
  overall_notes    text,
  development_plan text[] DEFAULT '{}',
  created_at       timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rbt_assessments_rbt ON public.rbt_competency_assessments(rbt_id, date);

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE public.rbt_org_assignments       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rbt_supervision_sessions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rbt_direct_service_hours  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rbt_competency_assessments ENABLE ROW LEVEL SECURITY;

-- Assignments: BCBA sees their RBTs; RBT sees own record
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='rbt_org_assignments' AND policyname='rbt_assignments_access') THEN
    CREATE POLICY "rbt_assignments_access" ON public.rbt_org_assignments
      FOR ALL USING (supervising_bcba_id = auth.uid() OR rbt_user_id = auth.uid());
  END IF;
END $$;

-- Supervision sessions: both parties access
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='rbt_supervision_sessions' AND policyname='supervision_party_access') THEN
    CREATE POLICY "supervision_party_access" ON public.rbt_supervision_sessions
      FOR ALL USING (rbt_id = auth.uid() OR bcba_id = auth.uid());
  END IF;
END $$;

-- Direct service hours: RBT sees own; BCBA sees their RBTs (via join, handled in app)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='rbt_direct_service_hours' AND policyname='rbt_own_hours') THEN
    CREATE POLICY "rbt_own_hours" ON public.rbt_direct_service_hours
      FOR ALL USING (rbt_id = auth.uid());
  END IF;
END $$;

-- Competency assessments: both parties access
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='rbt_competency_assessments' AND policyname='assessment_party_access') THEN
    CREATE POLICY "assessment_party_access" ON public.rbt_competency_assessments
      FOR ALL USING (rbt_id = auth.uid() OR bcba_id = auth.uid());
  END IF;
END $$;
