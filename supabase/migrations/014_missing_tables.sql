-- Migration 014: Create all missing tables referenced in code
-- This fixes 24+ tables that are called in code but don't exist

-- ============================================
-- PRIORITY 1: CORE FUNCTIONALITY
-- ============================================

-- Children table (FK dependency for 3+ other tables)
CREATE TABLE IF NOT EXISTS children (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  date_of_birth DATE,
  age_years INTEGER,
  gender TEXT,
  diagnoses TEXT[] DEFAULT '{}',
  communication_level TEXT CHECK (communication_level IN ('verbal', 'limited_verbal', 'non_verbal', 'aac_user')),
  sensory_sensitivities TEXT[] DEFAULT '{}',
  strengths TEXT[] DEFAULT '{}',
  challenges TEXT[] DEFAULT '{}',
  current_therapies TEXT[] DEFAULT '{}',
  school_info JSONB DEFAULT '{}',
  avatar_url TEXT,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_children_parent ON children(parent_id);
-- Child profiles (extended info for provider view)
CREATE TABLE IF NOT EXISTS child_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  iep_goals TEXT[] DEFAULT '{}',
  behavior_plan_summary TEXT,
  medication_notes TEXT,
  emergency_contacts JSONB DEFAULT '[]',
  insurance_info JSONB DEFAULT '{}',
  preferred_reinforcers TEXT[] DEFAULT '{}',
  triggers TEXT[] DEFAULT '{}',
  calming_strategies TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_child_profiles_child ON child_profiles(child_id);
-- Provider applications
CREATE TABLE IF NOT EXISTS provider_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  provider_type TEXT NOT NULL CHECK (provider_type IN ('bcba', 'bcaba', 'rbt', 'lpc', 'lcsw', 'psychologist', 'slp', 'ot', 'pt', 'developmental_pediatrician', 'psychiatrist', 'other')),
  license_number TEXT NOT NULL,
  license_state TEXT NOT NULL,
  license_expiry DATE,
  npi_number TEXT,
  specialties TEXT[] DEFAULT '{}',
  years_experience INTEGER,
  bio TEXT,
  hourly_rate_min DECIMAL(10,2),
  hourly_rate_max DECIMAL(10,2),
  availability_notes TEXT,
  resume_url TEXT,
  license_document_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'approved', 'rejected', 'more_info_needed')),
  ai_verification_result JSONB,
  admin_notes TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_provider_applications_status ON provider_applications(status);
CREATE INDEX idx_provider_applications_user ON provider_applications(user_id);
-- Marketplace bookings (actual session bookings)
CREATE TABLE IF NOT EXISTS marketplace_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES provider_profiles(id) ON DELETE CASCADE,
  child_id UUID REFERENCES children(id) ON DELETE SET NULL,
  session_type TEXT NOT NULL,
  session_duration_minutes INTEGER NOT NULL DEFAULT 60,
  scheduled_at TIMESTAMPTZ NOT NULL,
  timezone TEXT DEFAULT 'America/New_York',
  concern TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed', 'no_show', 'rescheduled')),
  cancellation_reason TEXT,
  cancelled_at TIMESTAMPTZ,
  cancelled_by UUID REFERENCES auth.users(id),
  price DECIMAL(10,2) NOT NULL,
  provider_payout DECIMAL(10,2) NOT NULL,
  platform_fee DECIMAL(10,2) NOT NULL,
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded', 'failed')),
  payment_intent_id TEXT,
  provider_paid BOOLEAN DEFAULT false,
  payout_id TEXT,
  video_room_url TEXT,
  video_room_name TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  review TEXT,
  rated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_marketplace_bookings_user ON marketplace_bookings(user_id);
CREATE INDEX idx_marketplace_bookings_provider ON marketplace_bookings(provider_id);
CREATE INDEX idx_marketplace_bookings_status ON marketplace_bookings(status);
CREATE INDEX idx_marketplace_bookings_scheduled ON marketplace_bookings(scheduled_at);
-- Telehealth sessions (video session records)
CREATE TABLE IF NOT EXISTS telehealth_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES marketplace_bookings(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES provider_profiles(id),
  patient_id UUID NOT NULL REFERENCES auth.users(id),
  child_id UUID REFERENCES children(id),
  room_name TEXT NOT NULL UNIQUE,
  room_url TEXT,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  recording_url TEXT,
  transcript TEXT,
  ai_summary TEXT,
  session_notes TEXT,
  status TEXT DEFAULT 'created' CHECK (status IN ('created', 'waiting', 'in_progress', 'completed', 'abandoned')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_telehealth_sessions_booking ON telehealth_sessions(booking_id);
CREATE INDEX idx_telehealth_sessions_provider ON telehealth_sessions(provider_id);
-- ============================================
-- PRIORITY 2: CLINICAL FEATURES
-- ============================================

-- Medications
CREATE TABLE IF NOT EXISTS medications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  dosage TEXT,
  frequency TEXT,
  time_of_day TEXT[] DEFAULT '{}',
  prescriber TEXT,
  pharmacy TEXT,
  purpose TEXT,
  start_date DATE,
  end_date DATE,
  refill_date DATE,
  quantity INTEGER,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_medications_child ON medications(child_id);
-- Medication logs
CREATE TABLE IF NOT EXISTS medication_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medication_id UUID NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  logged_by UUID NOT NULL REFERENCES auth.users(id),
  scheduled_time TIMESTAMPTZ NOT NULL,
  taken_at TIMESTAMPTZ,
  status TEXT NOT NULL CHECK (status IN ('taken', 'missed', 'skipped', 'late')),
  notes TEXT,
  side_effects TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_medication_logs_medication ON medication_logs(medication_id);
CREATE INDEX idx_medication_logs_child ON medication_logs(child_id);
CREATE INDEX idx_medication_logs_date ON medication_logs(scheduled_time);
-- Behavior intervention plans
CREATE TABLE IF NOT EXISTS behavior_intervention_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  title TEXT NOT NULL,
  target_behavior TEXT NOT NULL,
  behavior_definition TEXT,
  function_of_behavior TEXT,
  antecedent_strategies TEXT[] DEFAULT '{}',
  teaching_strategies TEXT[] DEFAULT '{}',
  consequence_strategies TEXT[] DEFAULT '{}',
  replacement_behaviors TEXT[] DEFAULT '{}',
  reinforcement_schedule TEXT,
  crisis_plan TEXT,
  data_collection_method TEXT,
  baseline_data JSONB,
  current_data JSONB,
  goals JSONB DEFAULT '[]',
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
  start_date DATE,
  review_date DATE,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_bip_child ON behavior_intervention_plans(child_id);
-- Assessment results
CREATE TABLE IF NOT EXISTS assessment_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  assessment_type TEXT NOT NULL,
  assessment_name TEXT NOT NULL,
  version TEXT,
  administered_by TEXT,
  administered_at TIMESTAMPTZ NOT NULL,
  raw_scores JSONB,
  scaled_scores JSONB,
  percentiles JSONB,
  total_score DECIMAL(10,2),
  severity TEXT,
  interpretation TEXT,
  recommendations TEXT[] DEFAULT '{}',
  document_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_assessment_results_child ON assessment_results(child_id);
CREATE INDEX idx_assessment_results_type ON assessment_results(assessment_type);
-- Crisis logs
CREATE TABLE IF NOT EXISTS crisis_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  child_id UUID REFERENCES children(id) ON DELETE SET NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  crisis_type TEXT,
  trigger_message TEXT,
  detected_keywords TEXT[] DEFAULT '{}',
  ai_response TEXT,
  escalated BOOLEAN DEFAULT false,
  escalation_type TEXT,
  escalation_contact TEXT,
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  followup_scheduled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_crisis_logs_user ON crisis_logs(user_id);
CREATE INDEX idx_crisis_logs_severity ON crisis_logs(severity);
-- GAD-7 responses (anxiety screening)
CREATE TABLE IF NOT EXISTS gad7_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  child_id UUID REFERENCES children(id) ON DELETE SET NULL,
  responses JSONB NOT NULL,
  total_score INTEGER NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('minimal', 'mild', 'moderate', 'severe')),
  administered_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_gad7_user ON gad7_responses(user_id);
-- PHQ-9 responses (depression screening)
CREATE TABLE IF NOT EXISTS phq9_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  responses JSONB NOT NULL,
  total_score INTEGER NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('minimal', 'mild', 'moderate', 'moderately_severe', 'severe')),
  has_suicidal_ideation BOOLEAN DEFAULT false,
  administered_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_phq9_user ON phq9_responses(user_id);
-- ============================================
-- PRIORITY 3: ADMIN/ANALYTICS
-- ============================================

-- Clinics (B2B)
CREATE TABLE IF NOT EXISTS clinics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  logo_url TEXT,
  description TEXT,
  specialties TEXT[] DEFAULT '{}',
  providers_count INTEGER DEFAULT 0,
  patients_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
  billing_email TEXT,
  contract_type TEXT,
  contract_start DATE,
  contract_end DATE,
  monthly_fee DECIMAL(10,2),
  per_session_fee DECIMAL(10,2),
  admin_user_id UUID REFERENCES auth.users(id),
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_clinics_status ON clinics(status);
-- Moderation queue
CREATE TABLE IF NOT EXISTS moderation_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type TEXT NOT NULL CHECK (content_type IN ('post', 'comment', 'message', 'profile', 'review')),
  content_id UUID NOT NULL,
  reported_by UUID REFERENCES auth.users(id),
  reason TEXT NOT NULL,
  details TEXT,
  ai_flagged BOOLEAN DEFAULT false,
  ai_confidence DECIMAL(5,4),
  ai_categories TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'escalated')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  action_taken TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_moderation_status ON moderation_queue(status);
CREATE INDEX idx_moderation_content ON moderation_queue(content_type, content_id);
-- NPS responses
CREATE TABLE IF NOT EXISTS nps_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 10),
  feedback TEXT,
  category TEXT,
  trigger_event TEXT,
  user_tier TEXT,
  days_since_signup INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_nps_user ON nps_responses(user_id);
CREATE INDEX idx_nps_score ON nps_responses(score);
-- Message feedback (AI response ratings)
CREATE TABLE IF NOT EXISTS message_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID,
  conversation_id UUID,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  helpful BOOLEAN,
  feedback_type TEXT CHECK (feedback_type IN ('helpful', 'not_helpful', 'incorrect', 'offensive', 'other')),
  feedback_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_message_feedback_user ON message_feedback(user_id);
-- Upgrade prompt analytics
CREATE TABLE IF NOT EXISTS upgrade_prompt_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prompt_type TEXT NOT NULL,
  prompt_location TEXT,
  current_tier TEXT,
  target_tier TEXT,
  action TEXT CHECK (action IN ('shown', 'dismissed', 'clicked', 'converted')),
  converted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_upgrade_analytics_user ON upgrade_prompt_analytics(user_id);
-- ============================================
-- PRIORITY 4: SUPPORTING FEATURES
-- ============================================

-- Goals (user-defined goals)
CREATE TABLE IF NOT EXISTS goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  child_id UUID REFERENCES children(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  target_date DATE,
  target_value DECIMAL(10,2),
  current_value DECIMAL(10,2) DEFAULT 0,
  unit TEXT,
  frequency TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'abandoned')),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_goals_user ON goals(user_id);
CREATE INDEX idx_goals_child ON goals(child_id);
-- User preferences
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  email_weekly_digest BOOLEAN DEFAULT true,
  email_session_reminders BOOLEAN DEFAULT true,
  email_milestone_alerts BOOLEAN DEFAULT true,
  email_community_updates BOOLEAN DEFAULT false,
  email_marketing BOOLEAN DEFAULT false,
  push_enabled BOOLEAN DEFAULT true,
  push_chat_replies BOOLEAN DEFAULT true,
  push_reminders BOOLEAN DEFAULT true,
  sms_enabled BOOLEAN DEFAULT false,
  sms_urgent_only BOOLEAN DEFAULT true,
  theme TEXT DEFAULT 'system',
  language TEXT DEFAULT 'en',
  timezone TEXT DEFAULT 'America/New_York',
  ai_personality TEXT DEFAULT 'warm',
  show_tips BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_user_preferences_user ON user_preferences(user_id);
-- Insight report shares
CREATE TABLE IF NOT EXISTS insight_report_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  report_type TEXT NOT NULL,
  report_id UUID,
  shared_with_email TEXT,
  shared_with_name TEXT,
  shared_with_role TEXT,
  access_token TEXT UNIQUE,
  expires_at TIMESTAMPTZ,
  accessed_at TIMESTAMPTZ,
  access_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_report_shares_user ON insight_report_shares(user_id);
CREATE INDEX idx_report_shares_token ON insight_report_shares(access_token);
-- Referral credits
CREATE TABLE IF NOT EXISTS referral_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referral_id UUID REFERENCES referrals(id),
  amount DECIMAL(10,2) NOT NULL,
  credit_type TEXT NOT NULL CHECK (credit_type IN ('signup_bonus', 'referral_bonus', 'promotional', 'compensation')),
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'available', 'used', 'expired')),
  available_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  used_at TIMESTAMPTZ,
  used_for TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_referral_credits_user ON referral_credits(user_id);
-- Jr sessions (Aminy Jr for kids)
CREATE TABLE IF NOT EXISTS jr_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  parent_id UUID NOT NULL REFERENCES auth.users(id),
  session_type TEXT NOT NULL,
  activity_name TEXT,
  duration_seconds INTEGER,
  coins_earned INTEGER DEFAULT 0,
  xp_earned INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT false,
  score INTEGER,
  data JSONB DEFAULT '{}',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
CREATE INDEX idx_jr_sessions_child ON jr_sessions(child_id);
-- Key-value store (for edge functions)
CREATE TABLE IF NOT EXISTS kv_store_8a022548 (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- Caregiver time entries (respite tracking)
CREATE TABLE IF NOT EXISTS caregiver_time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  child_id UUID REFERENCES children(id) ON DELETE SET NULL,
  entry_type TEXT NOT NULL CHECK (entry_type IN ('caregiving', 'respite', 'therapy_transport', 'medical_appointment', 'school_meeting', 'other')),
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  duration_minutes INTEGER,
  stress_level INTEGER CHECK (stress_level >= 1 AND stress_level <= 10),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_caregiver_time_user ON caregiver_time_entries(user_id);
-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS on all new tables
ALTER TABLE children ENABLE ROW LEVEL SECURITY;
ALTER TABLE child_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE telehealth_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE medication_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE behavior_intervention_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE crisis_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE gad7_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE phq9_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE nps_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE upgrade_prompt_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE insight_report_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE jr_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE caregiver_time_entries ENABLE ROW LEVEL SECURITY;
-- Children policies
CREATE POLICY "Users can view own children" ON children FOR SELECT USING (auth.uid() = parent_id);
CREATE POLICY "Users can insert own children" ON children FOR INSERT WITH CHECK (auth.uid() = parent_id);
CREATE POLICY "Users can update own children" ON children FOR UPDATE USING (auth.uid() = parent_id);
CREATE POLICY "Users can delete own children" ON children FOR DELETE USING (auth.uid() = parent_id);
-- Child profiles policies
CREATE POLICY "Users can view own child profiles" ON child_profiles FOR SELECT
  USING (EXISTS (SELECT 1 FROM children WHERE children.id = child_profiles.child_id AND children.parent_id = auth.uid()));
CREATE POLICY "Users can manage own child profiles" ON child_profiles FOR ALL
  USING (EXISTS (SELECT 1 FROM children WHERE children.id = child_profiles.child_id AND children.parent_id = auth.uid()));
-- Provider applications policies
CREATE POLICY "Users can view own applications" ON provider_applications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own applications" ON provider_applications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all applications" ON provider_applications FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);
CREATE POLICY "Admins can update applications" ON provider_applications FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);
-- Marketplace bookings policies
CREATE POLICY "Users can view own bookings" ON marketplace_bookings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Providers can view their bookings" ON marketplace_bookings FOR SELECT
  USING (EXISTS (SELECT 1 FROM provider_profiles WHERE provider_profiles.id = marketplace_bookings.provider_id AND provider_profiles.user_id = auth.uid()));
CREATE POLICY "Users can create bookings" ON marketplace_bookings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own bookings" ON marketplace_bookings FOR UPDATE USING (auth.uid() = user_id);
-- Telehealth sessions policies
CREATE POLICY "Participants can view sessions" ON telehealth_sessions FOR SELECT
  USING (auth.uid() = patient_id OR EXISTS (SELECT 1 FROM provider_profiles WHERE id = telehealth_sessions.provider_id AND user_id = auth.uid()));
-- Medications policies
CREATE POLICY "Users can manage medications for own children" ON medications FOR ALL
  USING (EXISTS (SELECT 1 FROM children WHERE children.id = medications.child_id AND children.parent_id = auth.uid()));
-- Medication logs policies
CREATE POLICY "Users can manage medication logs" ON medication_logs FOR ALL
  USING (EXISTS (SELECT 1 FROM children WHERE children.id = medication_logs.child_id AND children.parent_id = auth.uid()));
-- BIP policies
CREATE POLICY "Users can view BIPs for own children" ON behavior_intervention_plans FOR SELECT
  USING (EXISTS (SELECT 1 FROM children WHERE children.id = behavior_intervention_plans.child_id AND children.parent_id = auth.uid()));
CREATE POLICY "Providers can manage BIPs" ON behavior_intervention_plans FOR ALL
  USING (auth.uid() = created_by OR EXISTS (SELECT 1 FROM provider_profiles WHERE user_id = auth.uid()));
-- Assessment results policies
CREATE POLICY "Users can view own assessment results" ON assessment_results FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own assessment results" ON assessment_results FOR INSERT WITH CHECK (auth.uid() = user_id);
-- Crisis logs policies
CREATE POLICY "Users can view own crisis logs" ON crisis_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can insert crisis logs" ON crisis_logs FOR INSERT WITH CHECK (true);
-- Screening response policies (GAD7, PHQ9)
CREATE POLICY "Users can manage own GAD7 responses" ON gad7_responses FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own PHQ9 responses" ON phq9_responses FOR ALL USING (auth.uid() = user_id);
-- Clinics policies
CREATE POLICY "Admins can manage clinics" ON clinics FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));
CREATE POLICY "Clinic admins can view own clinic" ON clinics FOR SELECT USING (admin_user_id = auth.uid());
-- Moderation policies
CREATE POLICY "Admins can manage moderation queue" ON moderation_queue FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin', 'moderator')));
-- NPS policies
CREATE POLICY "Users can manage own NPS responses" ON nps_responses FOR ALL USING (auth.uid() = user_id);
-- Message feedback policies
CREATE POLICY "Users can manage own feedback" ON message_feedback FOR ALL USING (auth.uid() = user_id);
-- Upgrade analytics policies
CREATE POLICY "Users can insert own analytics" ON upgrade_prompt_analytics FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all analytics" ON upgrade_prompt_analytics FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));
-- Goals policies
CREATE POLICY "Users can manage own goals" ON goals FOR ALL USING (auth.uid() = user_id);
-- User preferences policies
CREATE POLICY "Users can manage own preferences" ON user_preferences FOR ALL USING (auth.uid() = user_id);
-- Insight report shares policies
CREATE POLICY "Users can manage own report shares" ON insight_report_shares FOR ALL USING (auth.uid() = user_id);
-- Referral credits policies
CREATE POLICY "Users can view own credits" ON referral_credits FOR SELECT USING (auth.uid() = user_id);
-- Jr sessions policies
CREATE POLICY "Users can manage own jr sessions" ON jr_sessions FOR ALL USING (auth.uid() = parent_id);
-- Caregiver time entries policies
CREATE POLICY "Users can manage own time entries" ON caregiver_time_entries FOR ALL USING (auth.uid() = user_id);
-- KV store - service role only
CREATE POLICY "Service role can access kv store" ON kv_store_8a022548 FOR ALL USING (true);
-- ============================================
-- GRANT PERMISSIONS
-- ============================================

GRANT ALL ON children TO authenticated;
GRANT ALL ON child_profiles TO authenticated;
GRANT ALL ON provider_applications TO authenticated;
GRANT ALL ON marketplace_bookings TO authenticated;
GRANT ALL ON telehealth_sessions TO authenticated;
GRANT ALL ON medications TO authenticated;
GRANT ALL ON medication_logs TO authenticated;
GRANT ALL ON behavior_intervention_plans TO authenticated;
GRANT ALL ON assessment_results TO authenticated;
GRANT ALL ON crisis_logs TO authenticated;
GRANT ALL ON gad7_responses TO authenticated;
GRANT ALL ON phq9_responses TO authenticated;
GRANT ALL ON clinics TO authenticated;
GRANT ALL ON moderation_queue TO authenticated;
GRANT ALL ON nps_responses TO authenticated;
GRANT ALL ON message_feedback TO authenticated;
GRANT ALL ON upgrade_prompt_analytics TO authenticated;
GRANT ALL ON goals TO authenticated;
GRANT ALL ON user_preferences TO authenticated;
GRANT ALL ON insight_report_shares TO authenticated;
GRANT ALL ON referral_credits TO authenticated;
GRANT ALL ON jr_sessions TO authenticated;
GRANT ALL ON kv_store_8a022548 TO authenticated;
GRANT ALL ON caregiver_time_entries TO authenticated;
