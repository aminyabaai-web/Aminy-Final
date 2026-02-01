-- ============================================================================
-- Seed Provider Data
-- Real provider profiles for the marketplace
-- ============================================================================

-- Create provider_profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS provider_profiles (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  credentials TEXT NOT NULL,
  provider_type TEXT NOT NULL,
  photo_url TEXT,
  rating DECIMAL(2,1) DEFAULT 5.0,
  review_count INTEGER DEFAULT 0,
  years_experience INTEGER DEFAULT 1,
  specialties TEXT[] DEFAULT '{}',
  conditions TEXT[] DEFAULT '{}',
  languages TEXT[] DEFAULT '{English}',
  bio TEXT,
  approach TEXT,
  hourly_rate INTEGER,
  session_rate INTEGER,
  states_licensed TEXT[] DEFAULT '{}',
  insurance_accepted TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  is_accepting_patients BOOLEAN DEFAULT true,
  verification_status TEXT DEFAULT 'verified' CHECK (verification_status IN ('verified', 'pending', 'manual_review', 'expired', 'failed')),
  next_available TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_provider_profiles_type ON provider_profiles(provider_type);
CREATE INDEX IF NOT EXISTS idx_provider_profiles_active ON provider_profiles(is_active, is_accepting_patients);
CREATE INDEX IF NOT EXISTS idx_provider_profiles_rating ON provider_profiles(rating DESC);

ALTER TABLE provider_profiles ENABLE ROW LEVEL SECURITY;

-- Everyone can view active provider profiles
DROP POLICY IF EXISTS "Anyone can view active providers" ON provider_profiles;
CREATE POLICY "Anyone can view active providers"
  ON provider_profiles FOR SELECT
  USING (is_active = true);

-- Providers can update their own profile
DROP POLICY IF EXISTS "Providers can update own profile" ON provider_profiles;
CREATE POLICY "Providers can update own profile"
  ON provider_profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- Insert seed providers (delete existing first to avoid conflicts)
DELETE FROM provider_profiles WHERE id LIKE 'seed-%';

-- BEHAVIORAL TEAM
INSERT INTO provider_profiles (
  id, first_name, last_name, credentials, provider_type, photo_url, rating, review_count,
  years_experience, specialties, conditions, languages, bio, approach, session_rate,
  states_licensed, insurance_accepted, is_active, is_accepting_patients, verification_status, next_available
) VALUES
(
  'seed-bcba-001',
  'Sarah', 'Chen', 'BCBA-D', 'bcba',
  'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=200&h=200&fit=crop&crop=face',
  4.9, 156, 12,
  ARRAY['Early Intervention', 'Parent Training', 'Teen Services', 'Social Skills'],
  ARRAY['Autism', 'ADHD', 'Developmental Delays'],
  ARRAY['English', 'Mandarin'],
  'Board Certified Behavior Analyst with over 12 years of experience supporting families. I specialize in early intervention and creating personalized behavior plans that work for your unique family dynamics.',
  'I believe in collaborative, family-centered care. My approach focuses on understanding each child''s strengths and building on them while addressing challenging behaviors with evidence-based strategies.',
  99,
  ARRAY['California', 'Texas', 'New York', 'Florida'],
  ARRAY['Aetna', 'Blue Cross Blue Shield', 'Cigna', 'Medicaid', 'Self-Pay'],
  true, true, 'verified',
  NOW() + INTERVAL '1 day'
),
(
  'seed-bcba-002',
  'Michael', 'Thompson', 'BCBA', 'bcba',
  'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=200&h=200&fit=crop&crop=face',
  4.8, 89, 8,
  ARRAY['Transition Planning', 'Social Skills', 'Daily Routines'],
  ARRAY['Autism', 'Anxiety', 'ADHD'],
  ARRAY['English', 'Spanish'],
  'Passionate BCBA focusing on helping adolescents and young adults transition to independence. I work closely with families to build life skills and prepare for adulthood.',
  'My approach emphasizes practical skill-building and naturalistic teaching. I believe in meeting clients where they are and celebrating every step forward.',
  99,
  ARRAY['Texas', 'Arizona', 'New Mexico'],
  ARRAY['UnitedHealthcare', 'Tricare', 'Self-Pay'],
  true, true, 'verified',
  NOW() + INTERVAL '2 days'
),
(
  'seed-rbt-001',
  'Jessica', 'Martinez', 'RBT', 'rbt',
  'https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=200&h=200&fit=crop&crop=face',
  4.9, 203, 5,
  ARRAY['Play-Based Learning', 'Daily Routines', 'Social Skills'],
  ARRAY['Autism', 'Developmental Delays'],
  ARRAY['English', 'Spanish'],
  'Registered Behavior Technician specializing in play-based ABA therapy. I make learning fun while helping children develop essential skills.',
  'I believe that children learn best through play. My sessions are engaging, fun, and structured to maximize skill development.',
  49,
  ARRAY['California', 'Nevada'],
  ARRAY['Medicaid', 'Blue Cross Blue Shield', 'Self-Pay'],
  true, true, 'verified',
  NOW()
),
(
  'seed-rbt-002',
  'David', 'Kim', 'RBT', 'rbt',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face',
  4.7, 145, 4,
  ARRAY['Early Intervention', 'Communication', 'Self-Care Skills'],
  ARRAY['Autism', 'Speech Delays'],
  ARRAY['English', 'Korean'],
  'Dedicated RBT with a focus on early intervention and communication skills. I work with children ages 2-10 to build foundational skills.',
  'Patient, structured, and positive reinforcement-focused. I create a supportive environment where children feel safe to learn and grow.',
  49,
  ARRAY['California', 'Washington', 'Oregon'],
  ARRAY['Aetna', 'Cigna', 'Kaiser Permanente', 'Self-Pay'],
  true, true, 'verified',
  NOW() + INTERVAL '1 day'
),

-- THERAPY TEAM
(
  'seed-lpc-001',
  'Emily', 'Rodriguez', 'LPC', 'lpc',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&h=200&fit=crop&crop=face',
  4.9, 178, 10,
  ARRAY['Anxiety', 'Emotional Regulation', 'Family Therapy'],
  ARRAY['Autism', 'ADHD', 'Anxiety', 'Depression'],
  ARRAY['English', 'Spanish'],
  'Licensed Professional Counselor specializing in working with neurodiverse children and their families. I help families navigate the emotional challenges of parenting and support children in developing coping skills.',
  'I use a combination of CBT, play therapy, and family systems approaches tailored to each family''s unique needs.',
  99,
  ARRAY['Texas', 'Colorado', 'Arizona'],
  ARRAY['Aetna', 'Blue Cross Blue Shield', 'Humana', 'Self-Pay'],
  true, true, 'verified',
  NOW()
),
(
  'seed-lcsw-001',
  'Amanda', 'Williams', 'LCSW', 'lcsw',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&h=200&fit=crop&crop=face',
  4.8, 134, 15,
  ARRAY['System Navigation', 'IEP Advocacy', 'Family Therapy', 'Crisis Support'],
  ARRAY['Autism', 'ADHD', 'Learning Disabilities'],
  ARRAY['English'],
  'Clinical Social Worker with 15 years helping families navigate the special education system and access resources. I specialize in advocacy and connecting families with services.',
  'I believe in empowering families with knowledge and skills to advocate effectively for their children. Let me help you navigate the system.',
  99,
  ARRAY['New York', 'New Jersey', 'Connecticut'],
  ARRAY['UnitedHealthcare', 'Cigna', 'Medicaid', 'Self-Pay'],
  true, true, 'verified',
  NOW() + INTERVAL '1 day'
),
(
  'seed-slp-001',
  'Jennifer', 'Park', 'CCC-SLP', 'slp',
  'https://images.unsplash.com/photo-1551836022-deb4988cc6c0?w=200&h=200&fit=crop&crop=face',
  5.0, 212, 9,
  ARRAY['AAC', 'Social Communication', 'Feeding'],
  ARRAY['Autism', 'Apraxia', 'Language Delays'],
  ARRAY['English', 'Korean'],
  'Speech-Language Pathologist specializing in AAC and social communication. I help children find their voice, whether through words, devices, or both.',
  'Communication is a fundamental human right. I use evidence-based practices to help every child communicate effectively.',
  89,
  ARRAY['California', 'Oregon', 'Washington'],
  ARRAY['Blue Cross Blue Shield', 'Kaiser Permanente', 'Medicaid', 'Self-Pay'],
  true, true, 'verified',
  NOW()
),
(
  'seed-ot-001',
  'Rebecca', 'Taylor', 'OTR/L', 'ot',
  'https://images.unsplash.com/photo-1614608682850-e0d6ed316d47?w=200&h=200&fit=crop&crop=face',
  4.9, 167, 11,
  ARRAY['Sensory Processing', 'Fine Motor', 'Self-Care Skills', 'Daily Routines'],
  ARRAY['Autism', 'Sensory Processing Disorder', 'Developmental Delays'],
  ARRAY['English'],
  'Occupational Therapist specializing in sensory integration and fine motor development. I help children participate fully in daily activities at home and school.',
  'I create sensory-smart strategies that can be implemented throughout the day. My goal is to help children feel regulated and ready to learn.',
  99,
  ARRAY['Florida', 'Georgia', 'Alabama'],
  ARRAY['Aetna', 'UnitedHealthcare', 'Tricare', 'Self-Pay'],
  true, true, 'verified',
  NOW() + INTERVAL '2 days'
),

-- MEDICAL TEAM
(
  'seed-psych-001',
  'Dr. Robert', 'Goldstein', 'MD', 'psychiatrist',
  'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=200&h=200&fit=crop&crop=face',
  4.9, 89, 20,
  ARRAY['Medication Management', 'Complex Diagnoses', 'ADHD Treatment'],
  ARRAY['Autism', 'ADHD', 'Anxiety', 'OCD', 'Mood Disorders'],
  ARRAY['English'],
  'Board-certified Child and Adolescent Psychiatrist with 20 years of experience. I specialize in medication management for complex neurodevelopmental conditions.',
  'Medication is just one tool in the toolkit. I work closely with families and other providers to create comprehensive treatment plans.',
  275,
  ARRAY['California', 'Nevada', 'Arizona'],
  ARRAY['Blue Cross Blue Shield', 'Cigna', 'Self-Pay'],
  true, true, 'verified',
  NOW() + INTERVAL '5 days'
),
(
  'seed-devped-001',
  'Dr. Lisa', 'Nakamura', 'MD, FAAP', 'developmental_pediatrician',
  'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=200&h=200&fit=crop&crop=face',
  5.0, 67, 18,
  ARRAY['Diagnostic Evaluations', 'Complex Diagnoses', 'Early Intervention'],
  ARRAY['Autism', 'ADHD', 'Developmental Delays', 'Genetic Conditions'],
  ARRAY['English', 'Japanese'],
  'Developmental-Behavioral Pediatrician specializing in comprehensive evaluations and diagnosis. I help families understand their child''s unique profile and create a roadmap for support.',
  'Every child develops on their own timeline. My evaluations are thorough, compassionate, and focused on identifying strengths alongside challenges.',
  350,
  ARRAY['California', 'Oregon'],
  ARRAY['Aetna', 'Blue Cross Blue Shield', 'Kaiser Permanente', 'Self-Pay'],
  true, true, 'verified',
  NOW() + INTERVAL '14 days'
);

-- Create provider_availability table if needed
CREATE TABLE IF NOT EXISTS provider_availability (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  provider_id TEXT NOT NULL REFERENCES provider_profiles(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  timezone TEXT DEFAULT 'America/Phoenix',
  is_recurring BOOLEAN DEFAULT true,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add timezone column if it doesn't exist
ALTER TABLE provider_availability ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/Phoenix';
ALTER TABLE provider_availability ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_provider_availability_provider ON provider_availability(provider_id);

-- Seed availability for each provider (Mon-Fri, 9am-5pm)
INSERT INTO provider_availability (id, provider_id, day_of_week, start_time, end_time, is_available)
SELECT
  gen_random_uuid()::text,
  p.id,
  dow,
  '09:00'::TIME,
  '17:00'::TIME,
  true
FROM provider_profiles p
CROSS JOIN generate_series(1, 5) AS dow
WHERE p.id LIKE 'seed-%'
ON CONFLICT DO NOTHING;

-- Create provider_reviews table for future use
CREATE TABLE IF NOT EXISTS provider_reviews (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  provider_id TEXT NOT NULL REFERENCES provider_profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_provider_reviews_provider ON provider_reviews(provider_id);

ALTER TABLE provider_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view verified reviews" ON provider_reviews
  FOR SELECT USING (is_verified = true);

CREATE POLICY "Users can create reviews" ON provider_reviews
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Grant permissions
GRANT SELECT ON provider_profiles TO anon, authenticated;
GRANT SELECT ON provider_availability TO anon, authenticated;
GRANT SELECT ON provider_reviews TO anon, authenticated;
GRANT INSERT ON provider_reviews TO authenticated;
