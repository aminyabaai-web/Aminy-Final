-- Telehealth Database Schema for Aminy
-- Run this migration in your Supabase SQL Editor

-- ============================================
-- PROVIDERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  credentials TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('physician', 'np', 'pa', 'therapist', 'specialist')),
  specialty TEXT,
  photo TEXT,
  bio TEXT,
  languages TEXT[] DEFAULT ARRAY['English'],
  rating DECIMAL(2,1) DEFAULT 5.0,
  review_count INTEGER DEFAULT 0,
  accepting_new_patients BOOLEAN DEFAULT true,
  video_enabled BOOLEAN DEFAULT true,
  states_licensed TEXT[] DEFAULT ARRAY[]::TEXT[],
  hourly_rate INTEGER DEFAULT 15000, -- in cents
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PROVIDER AVAILABILITY TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS provider_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES providers(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(provider_id, day_of_week, start_time)
);

-- ============================================
-- PROVIDER TIME OFF TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS provider_time_off (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES providers(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- APPOINTMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  provider_id UUID REFERENCES providers(id) ON DELETE SET NULL,
  concern_id TEXT NOT NULL,
  concern_label TEXT NOT NULL,
  visit_type TEXT NOT NULL CHECK (visit_type IN ('consult', 'extended', 'follow-up')),
  visit_format TEXT NOT NULL CHECK (visit_format IN ('video', 'phone', 'in-person')),
  scheduled_time TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 25,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'in-progress', 'completed', 'cancelled', 'no-show')),
  video_room_url TEXT,
  video_room_name TEXT,
  intake_answers JSONB DEFAULT '{}',
  notes TEXT,
  cancellation_reason TEXT,
  cancelled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PAYMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  stripe_payment_intent_id TEXT,
  stripe_customer_id TEXT,
  amount INTEGER NOT NULL, -- in cents
  currency TEXT DEFAULT 'usd',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'succeeded', 'failed', 'refunded', 'partially_refunded')),
  promo_code TEXT,
  discount_amount INTEGER DEFAULT 0,
  refund_amount INTEGER DEFAULT 0,
  refund_reason TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- VISIT SUMMARIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS visit_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  provider_id UUID REFERENCES providers(id) ON DELETE SET NULL,
  provider_name TEXT NOT NULL,
  visit_date DATE NOT NULL,
  chief_complaint TEXT NOT NULL,
  diagnosis TEXT[],
  treatment_plan TEXT,
  prescriptions JSONB DEFAULT '[]',
  follow_up_date DATE,
  notes TEXT,
  attachments JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ACTION ITEMS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS action_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_summary_id UUID REFERENCES visit_summaries(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SCHEDULED REMINDERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS scheduled_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reminder_type TEXT NOT NULL CHECK (reminder_type IN ('24h', '1h', '15min')),
  scheduled_for TIMESTAMPTZ NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'sms', 'push')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SLOT HOLDS TABLE (for checkout flow)
-- ============================================
CREATE TABLE IF NOT EXISTS slot_holds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES providers(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  slot_time TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 25,
  expires_at TIMESTAMPTZ NOT NULL,
  released BOOLEAN DEFAULT false,
  converted_to_appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- WAITLIST TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_id UUID REFERENCES providers(id) ON DELETE SET NULL,
  concern_id TEXT NOT NULL,
  preferred_dates TEXT[],
  preferred_times TEXT[],
  notes TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'notified', 'booked', 'expired', 'cancelled')),
  notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_appointments_user_id ON appointments(user_id);
CREATE INDEX IF NOT EXISTS idx_appointments_provider_id ON appointments(provider_id);
CREATE INDEX IF NOT EXISTS idx_appointments_scheduled_time ON appointments(scheduled_time);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_payments_appointment_id ON payments(appointment_id);
CREATE INDEX IF NOT EXISTS idx_payments_stripe_payment_intent_id ON payments(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_visit_summaries_user_id ON visit_summaries(user_id);
CREATE INDEX IF NOT EXISTS idx_action_items_user_id ON action_items(user_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_reminders_scheduled_for ON scheduled_reminders(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_scheduled_reminders_status ON scheduled_reminders(status);
CREATE INDEX IF NOT EXISTS idx_slot_holds_expires_at ON slot_holds(expires_at);
CREATE INDEX IF NOT EXISTS idx_provider_availability_provider_id ON provider_availability(provider_id);

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_time_off ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE visit_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE slot_holds ENABLE ROW LEVEL SECURITY;
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

-- Providers: Public read, owner write
CREATE POLICY "Providers are viewable by everyone" ON providers FOR SELECT USING (true);
CREATE POLICY "Providers can update own profile" ON providers FOR UPDATE USING (auth.uid() = user_id);

-- Provider availability: Public read
CREATE POLICY "Availability is viewable by everyone" ON provider_availability FOR SELECT USING (true);
CREATE POLICY "Providers can manage own availability" ON provider_availability FOR ALL USING (
  provider_id IN (SELECT id FROM providers WHERE user_id = auth.uid())
);

-- Provider time off: Provider only
CREATE POLICY "Time off viewable by provider" ON provider_time_off FOR SELECT USING (
  provider_id IN (SELECT id FROM providers WHERE user_id = auth.uid())
);
CREATE POLICY "Providers can manage own time off" ON provider_time_off FOR ALL USING (
  provider_id IN (SELECT id FROM providers WHERE user_id = auth.uid())
);

-- Appointments: User and provider can view their own
CREATE POLICY "Users can view own appointments" ON appointments FOR SELECT USING (
  auth.uid() = user_id OR
  provider_id IN (SELECT id FROM providers WHERE user_id = auth.uid())
);
CREATE POLICY "Users can create appointments" ON appointments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own appointments" ON appointments FOR UPDATE USING (auth.uid() = user_id);

-- Payments: User only
CREATE POLICY "Users can view own payments" ON payments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create payments" ON payments FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Visit summaries: User and provider
CREATE POLICY "Users can view own visit summaries" ON visit_summaries FOR SELECT USING (
  auth.uid() = user_id OR
  provider_id IN (SELECT id FROM providers WHERE user_id = auth.uid())
);

-- Action items: User only
CREATE POLICY "Users can view own action items" ON action_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own action items" ON action_items FOR UPDATE USING (auth.uid() = user_id);

-- Scheduled reminders: User only
CREATE POLICY "Users can view own reminders" ON scheduled_reminders FOR SELECT USING (auth.uid() = user_id);

-- Slot holds: User only
CREATE POLICY "Users can view own slot holds" ON slot_holds FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create slot holds" ON slot_holds FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can release own slot holds" ON slot_holds FOR UPDATE USING (auth.uid() = user_id);

-- Waitlist: User only
CREATE POLICY "Users can view own waitlist entries" ON waitlist FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can join waitlist" ON waitlist FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own waitlist entries" ON waitlist FOR UPDATE USING (auth.uid() = user_id);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to clean up expired slot holds
CREATE OR REPLACE FUNCTION cleanup_expired_slot_holds()
RETURNS void AS $$
BEGIN
  UPDATE slot_holds
  SET released = true
  WHERE expires_at < NOW() AND released = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_providers_updated_at
  BEFORE UPDATE ON providers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at
  BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SEED DATA: Sample Providers
-- ============================================
INSERT INTO providers (name, credentials, role, specialty, bio, languages, rating, review_count, states_licensed, hourly_rate)
VALUES
  ('Dr. Sarah Chen', 'MD, Board Certified', 'physician', 'Family Medicine', 'Dr. Chen specializes in family medicine with a focus on preventive care and chronic disease management.', ARRAY['English', 'Mandarin'], 4.9, 127, ARRAY['CA', 'NY', 'TX', 'FL'], 15000),
  ('Dr. Michael Roberts', 'MD, Internal Medicine', 'physician', 'Internal Medicine', 'Dr. Roberts has 15 years of experience in internal medicine and telehealth consultations.', ARRAY['English', 'Spanish'], 4.8, 89, ARRAY['CA', 'AZ', 'NV', 'OR', 'WA'], 15000),
  ('Jessica Williams', 'NP, FNP-BC', 'np', 'Primary Care', 'Jessica is a family nurse practitioner passionate about accessible healthcare for all.', ARRAY['English'], 4.9, 156, ARRAY['CA', 'TX', 'FL', 'NY', 'IL'], 12500),
  ('Dr. Emily Park', 'PsyD', 'therapist', 'Mental Health', 'Dr. Park specializes in anxiety, depression, and stress management using evidence-based approaches.', ARRAY['English', 'Korean'], 5.0, 203, ARRAY['CA', 'WA', 'OR', 'CO', 'NY'], 17500)
ON CONFLICT DO NOTHING;

-- Add availability for sample providers
DO $$
DECLARE
  provider_rec RECORD;
BEGIN
  FOR provider_rec IN SELECT id FROM providers LOOP
    -- Monday to Friday, 9 AM to 5 PM
    FOR day IN 1..5 LOOP
      INSERT INTO provider_availability (provider_id, day_of_week, start_time, end_time)
      VALUES (provider_rec.id, day, '09:00', '17:00')
      ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;
END $$;
