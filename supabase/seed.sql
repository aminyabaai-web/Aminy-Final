-- =============================================================================
-- Aminy Database Seed Data
-- =============================================================================
-- This file contains initial data for development and testing
-- DO NOT run in production without review!
-- =============================================================================

-- Seed promo codes for testing
INSERT INTO promo_codes (code, description, discount_type, discount_value, max_uses, per_user_limit, is_active, expires_at)
VALUES
  ('WELCOME25', 'Welcome discount - 25% off first month', 'percent', 25, 1000, 1, true, NOW() + INTERVAL '1 year'),
  ('FRIEND10', 'Friend referral - $10 off', 'fixed', 1000, NULL, 1, true, NOW() + INTERVAL '1 year'),
  ('LAUNCH50', 'Launch special - 50% off first 3 months', 'percent', 50, 100, 1, true, NOW() + INTERVAL '90 days'),
  ('BCBA2024', 'BCBA professional discount - 20% off', 'percent', 20, NULL, 1, true, NOW() + INTERVAL '1 year'),
  ('PILOT100', 'Pilot program - 100% off (testing only)', 'percent', 100, 50, 1, true, NOW() + INTERVAL '30 days')
ON CONFLICT (code) DO UPDATE SET
  description = EXCLUDED.description,
  discount_type = EXCLUDED.discount_type,
  discount_value = EXCLUDED.discount_value;

-- Seed visit types for telehealth
INSERT INTO visit_types (id, name, description, duration_minutes, price_cents, requires_approval)
VALUES
  ('initial-consult', 'Initial Consultation', 'First-time consultation with a specialist to discuss your child''s needs and create a care plan', 60, 15000, false),
  ('follow-up', 'Follow-up Session', 'Regular follow-up session to review progress and adjust strategies', 30, 7500, false),
  ('extended', 'Extended Session', 'Extended consultation for complex cases requiring deeper analysis', 90, 20000, false),
  ('emergency', 'Urgent Consultation', 'Same-day urgent consultation for crisis situations', 30, 12500, true),
  ('parent-coaching', 'Parent Coaching Session', 'One-on-one coaching for parents on ABA techniques', 45, 10000, false),
  ('iep-review', 'IEP Review & Advocacy', 'Review and prepare for IEP meetings', 60, 17500, false)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  duration_minutes = EXCLUDED.duration_minutes,
  price_cents = EXCLUDED.price_cents;

-- Seed provider specialties
INSERT INTO provider_specialties (name, description, abbreviation)
VALUES
  ('Board Certified Behavior Analyst', 'Licensed professional specializing in Applied Behavior Analysis', 'BCBA'),
  ('Board Certified Assistant Behavior Analyst', 'Supervised professional in Applied Behavior Analysis', 'BCaBA'),
  ('Speech-Language Pathologist', 'Licensed specialist in communication disorders', 'SLP'),
  ('Occupational Therapist', 'Licensed specialist in daily living skills and sensory processing', 'OT'),
  ('Child Psychologist', 'Licensed psychologist specializing in child development', 'PhD/PsyD'),
  ('Developmental Pediatrician', 'Board certified physician specializing in developmental disorders', 'MD'),
  ('Special Education Advocate', 'Professional advocate for special education rights', 'Advocate'),
  ('Registered Behavior Technician', 'Certified technician implementing ABA therapy', 'RBT')
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description;

-- Seed insurance plans (major plans by state)
INSERT INTO insurance_plans (name, plan_type, state, aba_coverage, telehealth_coverage, notes)
VALUES
  -- California
  ('Blue Cross Blue Shield CA PPO', 'commercial', 'CA', true, true, 'ABA coverage up to $50k/year'),
  ('Aetna CA', 'commercial', 'CA', true, true, 'Pre-authorization required for ABA'),
  ('Kaiser Permanente CA', 'commercial', 'CA', true, true, 'In-network providers only'),
  ('Medi-Cal', 'medicaid', 'CA', true, true, 'Regional center coordination required'),

  -- Texas
  ('Blue Cross Blue Shield TX', 'commercial', 'TX', true, true, 'ABA coverage included'),
  ('United Healthcare TX', 'commercial', 'TX', true, true, 'Prior auth for telehealth'),
  ('Texas Medicaid', 'medicaid', 'TX', true, false, 'Limited telehealth coverage'),

  -- New York
  ('Empire Blue Cross NY', 'commercial', 'NY', true, true, 'Autism mandate coverage'),
  ('NY Medicaid', 'medicaid', 'NY', true, true, 'Full ABA coverage'),

  -- Florida
  ('Florida Blue', 'commercial', 'FL', true, true, 'ABA with diagnosis'),
  ('Florida Medicaid', 'medicaid', 'FL', true, true, 'Waiver program available')
ON CONFLICT (name, state) DO UPDATE SET
  aba_coverage = EXCLUDED.aba_coverage,
  telehealth_coverage = EXCLUDED.telehealth_coverage;

-- Seed outcome measures
INSERT INTO outcome_measures (name, description, category, min_score, max_score, interpretation)
VALUES
  ('ATEC', 'Autism Treatment Evaluation Checklist - Parent-reported measure of autism symptoms', 'autism', 0, 180, 'Lower scores indicate less severe symptoms. 0-30: mild, 31-60: moderate, 61+: severe'),
  ('Vineland-3', 'Vineland Adaptive Behavior Scales - Measures adaptive behavior across domains', 'adaptive', 20, 160, 'Standard scores: 85-115 average, <70 indicates significant delay'),
  ('CGI-S', 'Clinical Global Impression - Severity - Clinician-rated overall severity', 'global', 1, 7, '1: Normal, 2: Borderline, 3: Mild, 4: Moderate, 5: Marked, 6: Severe, 7: Extreme'),
  ('ABC', 'Aberrant Behavior Checklist - Measures challenging behaviors', 'behavior', 0, 174, 'Higher scores indicate more problem behaviors'),
  ('SRS-2', 'Social Responsiveness Scale - Measures social communication deficits', 'social', 0, 195, 'T-scores: <60 normal, 60-65 mild, 66-75 moderate, >75 severe'),
  ('VABS-3', 'Vineland Adaptive Behavior Scales (Communication)', 'communication', 20, 160, 'Standard scores with mean of 100'),
  ('PSI-4', 'Parenting Stress Index - Measures parent stress levels', 'family', 36, 180, 'Higher scores indicate greater stress. >90th percentile clinically significant')
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  interpretation = EXCLUDED.interpretation;

-- Seed crisis resources
INSERT INTO crisis_resources (name, phone, url, description, available_24_7, category, priority)
VALUES
  ('988 Suicide & Crisis Lifeline', '988', 'https://988lifeline.org', 'National suicide prevention and mental health crisis line. Call or text 988.', true, 'mental_health', 1),
  ('Crisis Text Line', 'Text HOME to 741741', 'https://www.crisistextline.org', 'Free 24/7 crisis support via text message', true, 'mental_health', 2),
  ('Autism Society Helpline', '1-800-328-8476', 'https://www.autism-society.org', 'Support, resources, and referrals for autism families', false, 'autism', 3),
  ('SAMHSA National Helpline', '1-800-662-4357', 'https://www.samhsa.gov/find-help/national-helpline', 'Free, confidential, 24/7 treatment referral and information', true, 'substance', 4),
  ('National Parent Helpline', '1-855-427-2736', 'https://www.nationalparenthelpline.org', 'Emotional support and resources for parents', false, 'parenting', 5),
  ('Childhelp National Child Abuse Hotline', '1-800-422-4453', 'https://www.childhelp.org', 'Crisis intervention and support for child abuse', true, 'safety', 1),
  ('National Domestic Violence Hotline', '1-800-799-7233', 'https://www.thehotline.org', 'Support for domestic violence situations', true, 'safety', 2),
  ('Autism Speaks Resource Guide', NULL, 'https://www.autismspeaks.org/resource-guide', 'Comprehensive resource directory for autism services', false, 'autism', 4),
  ('Parent to Parent USA', '1-800-651-1151', 'https://www.p2pusa.org', 'Peer support from parents of children with disabilities', false, 'parenting', 6)
ON CONFLICT (name) DO UPDATE SET
  phone = EXCLUDED.phone,
  url = EXCLUDED.url,
  description = EXCLUDED.description;

-- Seed referral tiers
INSERT INTO referral_tiers (name, min_referrals, reward_description, badge_color)
VALUES
  ('Supporter', 1, '1 free month per referral + $25 credit for friend', '#0891b2'),
  ('Champion', 5, 'All Supporter perks + 20% off marketplace + priority support', '#43AA8B'),
  ('Ambassador', 10, 'All Champion perks + free BCBA session + early access + Ambassador badge', '#E07A5F')
ON CONFLICT (name) DO UPDATE SET
  min_referrals = EXCLUDED.min_referrals,
  reward_description = EXCLUDED.reward_description;

-- Seed default feature flags
INSERT INTO feature_flags (name, enabled, description, tier_required)
VALUES
  ('ai_chat', true, 'AI chat with Aminy', NULL),
  ('telehealth', true, 'Telehealth video sessions', 'core'),
  ('vault', true, 'Document vault storage', 'starter'),
  ('community', true, 'Community features', 'core'),
  ('junior_activities', true, 'Aminy Jr activities for children', 'starter'),
  ('progress_reports', true, 'Progress tracking and reports', 'starter'),
  ('provider_portal', true, 'Provider portal access', NULL),
  ('bcba_sessions', true, 'BCBA session booking', 'pro'),
  ('iep_analysis', true, 'IEP document analysis', 'core'),
  ('crisis_resources', true, 'Crisis resource access', NULL)
ON CONFLICT (name) DO UPDATE SET
  enabled = EXCLUDED.enabled,
  tier_required = EXCLUDED.tier_required;

-- Create a test admin user profile (for development only)
-- Note: This creates a profile, the auth user must be created separately via Supabase Auth
DO $$
BEGIN
  -- Only insert if we're in development/test environment
  IF current_setting('app.environment', true) = 'development' OR current_setting('app.environment', true) IS NULL THEN
    INSERT INTO profiles (id, email, full_name, role, tier, onboarding_completed)
    VALUES
      ('00000000-0000-0000-0000-000000000001', 'admin@aminy.app', 'Test Admin', 'admin', 'proplus', true),
      ('00000000-0000-0000-0000-000000000002', 'provider@aminy.app', 'Test Provider', 'provider', 'pro', true),
      ('00000000-0000-0000-0000-000000000003', 'parent@aminy.app', 'Test Parent', 'parent', 'core', true)
    ON CONFLICT (id) DO NOTHING;

    RAISE NOTICE 'Test profiles created for development';
  END IF;
END $$;

-- Log seed completion
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Seed data inserted successfully';
  RAISE NOTICE 'Timestamp: %', NOW();
  RAISE NOTICE '========================================';
END $$;
