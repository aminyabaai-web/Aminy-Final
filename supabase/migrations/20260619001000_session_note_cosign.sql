-- BCBA Co-Signature on Session Notes
-- Required for Medicaid billing of RBT-delivered services (CPT 97153 billed under supervising BCBA NPI).
-- When modality = 'rbt-direct', a BCBA must co-sign before claims can be submitted.

ALTER TABLE public.session_notes
  ADD COLUMN IF NOT EXISTS cosign_required boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS cosigned_by     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cosigned_at     timestamptz,
  ADD COLUMN IF NOT EXISTS cosign_hash     text;

CREATE INDEX IF NOT EXISTS idx_session_notes_cosign
  ON public.session_notes(cosign_required, cosigned_at)
  WHERE cosign_required = true AND cosigned_at IS NULL;

-- Auto-set cosign_required when modality is rbt-direct
CREATE OR REPLACE FUNCTION public.set_cosign_required()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.modality = 'rbt-direct' THEN
    NEW.cosign_required := true;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cosign_required ON public.session_notes;
CREATE TRIGGER trg_cosign_required
  BEFORE INSERT OR UPDATE OF modality ON public.session_notes
  FOR EACH ROW EXECUTE FUNCTION public.set_cosign_required();
