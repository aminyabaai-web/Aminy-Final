-- Migration 022: Referral Program
-- Adds tables for referral codes, tracking, and rewards

-- ============================================
-- REFERRAL CODES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS referral_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  uses INTEGER NOT NULL DEFAULT 0,
  max_uses INTEGER,
  reward_type TEXT NOT NULL DEFAULT 'free_month' CHECK (reward_type IN ('free_month', 'discount', 'credits', 'tier_upgrade')),
  reward_value DECIMAL NOT NULL DEFAULT 1,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_referral_codes_user ON referral_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_codes_code ON referral_codes(code);
CREATE INDEX IF NOT EXISTS idx_referral_codes_active ON referral_codes(is_active);
-- ============================================
-- REFERRALS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referral_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'converted', 'rewarded', 'expired')),
  converted_at TIMESTAMPTZ,
  rewarded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(referred_id)
);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred ON referrals(referred_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(status);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals(referral_code);
-- ============================================
-- REFERRAL REWARDS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS referral_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referral_id UUID REFERENCES referrals(id) ON DELETE SET NULL,
  reward_type TEXT NOT NULL,
  reward_value DECIMAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'applied', 'expired')),
  applied_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_referral_rewards_user ON referral_rewards(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_rewards_status ON referral_rewards(status);
-- ============================================
-- REFERRAL SHARES TABLE (Analytics)
-- ============================================

CREATE TABLE IF NOT EXISTS referral_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referral_code TEXT NOT NULL,
  platform TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_referral_shares_user ON referral_shares(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_shares_code ON referral_shares(referral_code);
CREATE INDEX IF NOT EXISTS idx_referral_shares_platform ON referral_shares(platform);
-- ============================================
-- STATS FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION get_referral_stats(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'totalReferrals', (SELECT COUNT(*) FROM referrals WHERE referrer_id = p_user_id),
    'pendingReferrals', (SELECT COUNT(*) FROM referrals WHERE referrer_id = p_user_id AND status = 'pending'),
    'convertedReferrals', (SELECT COUNT(*) FROM referrals WHERE referrer_id = p_user_id AND status IN ('converted', 'rewarded')),
    'rewardsEarned', (SELECT COALESCE(SUM(reward_value), 0) FROM referral_rewards WHERE user_id = p_user_id AND status = 'applied'),
    'currentStreak', 0,
    'bestStreak', 0
  ) INTO result;
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_shares ENABLE ROW LEVEL SECURITY;
-- Codes: Users manage own, anyone can validate
CREATE POLICY "Users can manage own codes" ON referral_codes FOR ALL TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Anyone can read active codes" ON referral_codes FOR SELECT TO authenticated
  USING (is_active = true);
-- Referrals: Users can see where they are referrer or referred
CREATE POLICY "Users can view own referrals" ON referrals FOR SELECT TO authenticated
  USING (referrer_id = auth.uid() OR referred_id = auth.uid());
CREATE POLICY "Users can create referrals" ON referrals FOR INSERT TO authenticated
  WITH CHECK (referred_id = auth.uid());
-- Rewards: Users see own
CREATE POLICY "Users can view own rewards" ON referral_rewards FOR ALL TO authenticated
  USING (user_id = auth.uid());
-- Shares: Users manage own
CREATE POLICY "Users can manage own shares" ON referral_shares FOR ALL TO authenticated
  USING (user_id = auth.uid());
-- ============================================
-- TRIGGERS
-- ============================================

CREATE OR REPLACE FUNCTION update_referral_code_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS referral_code_updated ON referral_codes;
CREATE TRIGGER referral_code_updated
  BEFORE UPDATE ON referral_codes
  FOR EACH ROW
  EXECUTE FUNCTION update_referral_code_timestamp();
-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE referral_codes IS 'Referral codes for viral growth';
COMMENT ON TABLE referrals IS 'Tracks referral relationships';
COMMENT ON TABLE referral_rewards IS 'Rewards earned from referrals';
COMMENT ON TABLE referral_shares IS 'Analytics for share actions';
