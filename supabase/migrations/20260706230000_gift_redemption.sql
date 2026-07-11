-- ============================================================================
-- Gift memberships — codes + redemption
--
-- Flow: someone buys a gift via a Stripe Payment Link (metadata kind=gift,
-- tier, duration_months). The stripe-webhook creates a gift_codes row with a
-- readable code and emails it to the buyer. The recipient enters the code on
-- the 'redeem-gift' screen; redeem_gift_code() marks it redeemed and grants the
-- gifted tier on their profile until gift_expires_at.
--
-- Gifts are PREPAID and NON-RENEWING. Automatic downgrade to free after
-- gift_expires_at (for users with no active paid subscription) is a documented
-- follow-up (a daily cron); v1 sets profiles.tier so existing gating works now.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.gift_codes (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code              text UNIQUE NOT NULL,
  tier              text NOT NULL,                 -- 'core' | 'pro'
  duration_months   integer NOT NULL DEFAULT 3,
  purchaser_email   text,
  stripe_session_id text UNIQUE,                   -- idempotency: one code per checkout session
  status            text NOT NULL DEFAULT 'unredeemed',  -- 'unredeemed' | 'redeemed'
  redeemed_by       uuid REFERENCES auth.users(id),
  redeemed_at       timestamptz,
  created_at        timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gift_codes_code ON public.gift_codes(code);
CREATE INDEX IF NOT EXISTS idx_gift_codes_session ON public.gift_codes(stripe_session_id);

-- RLS: only the service role (webhook) writes rows. Authenticated users NEVER
-- read the table directly (that would leak unredeemed codes) — redemption goes
-- through the SECURITY DEFINER RPC below, which reveals nothing about codes the
-- caller didn't supply.
ALTER TABLE public.gift_codes ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='gift_codes' AND policyname='gift_codes_service_only') THEN
    CREATE POLICY "gift_codes_service_only" ON public.gift_codes
      FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
  END IF;
END $$;
GRANT ALL ON public.gift_codes TO service_role;

-- Gift grant tracking on profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gift_expires_at timestamptz;
COMMENT ON COLUMN public.profiles.gift_expires_at IS
  'When a redeemed gift membership lapses back to free (unless a paid subscription is active). Set by redeem_gift_code().';

-- ── Redemption RPC ───────────────────────────────────────────────────────────
-- Validates the code, marks it redeemed by the caller, grants the tier until
-- now()+duration. Returns { ok, tier, expires_at } or { ok:false, error }.
CREATE OR REPLACE FUNCTION public.redeem_gift_code(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  caller uuid := auth.uid();
  rec public.gift_codes%ROWTYPE;
  new_expiry timestamptz;
  norm text := upper(regexp_replace(coalesce(p_code,''), '[^A-Za-z0-9]', '', 'g'));
BEGIN
  IF caller IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  SELECT * INTO rec FROM public.gift_codes
  WHERE upper(regexp_replace(code, '[^A-Za-z0-9]', '', 'g')) = norm
  FOR UPDATE;

  IF rec.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_code');
  END IF;
  IF rec.status = 'redeemed' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_redeemed');
  END IF;

  -- Extend from an existing active gift if the caller already has one, else from now.
  SELECT GREATEST(now(), COALESCE(gift_expires_at, now())) INTO new_expiry
  FROM public.profiles WHERE id = caller;
  new_expiry := COALESCE(new_expiry, now()) + (rec.duration_months || ' months')::interval;

  UPDATE public.gift_codes
  SET status = 'redeemed', redeemed_by = caller, redeemed_at = now()
  WHERE id = rec.id;

  UPDATE public.profiles
  SET tier = rec.tier, gift_expires_at = new_expiry
  WHERE id = caller;

  RETURN jsonb_build_object('ok', true, 'tier', rec.tier, 'expires_at', new_expiry);
END;
$$;

REVOKE ALL ON FUNCTION public.redeem_gift_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.redeem_gift_code(text) TO authenticated;
