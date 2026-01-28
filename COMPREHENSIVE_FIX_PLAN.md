# Comprehensive Production Fix Plan

## Executive Summary

**Current State: 4/10** (not 6/10 as previously stated)

The app has good UI scaffolding but critical backend/data flows are broken:
- AI chat memory doesn't persist
- Bookings are never saved
- Provider verification is fake
- Payments can silently succeed without charging
- 24 database tables are missing
- 54+ backend endpoints are orphaned

---

## PHASE 1: CRITICAL DATABASE FIXES (Must do first)

### 1.1 Create Missing Tables (24 tables)

These tables are called in code but have NO migration:

```sql
-- Priority 1: Core functionality
children                    -- FK dependency for 3+ tables
child_profiles              -- Provider portal, session prep
provider_applications       -- Provider onboarding
marketplace_bookings        -- Session booking
telehealth_sessions         -- Telehealth

-- Priority 2: Clinical features
medications                 -- Medication tracker
medication_logs             -- Medication history
behavior_intervention_plans -- BIP component
assessment_results          -- Outcomes measurement
crisis_logs                 -- Crisis detection
gad7_responses              -- GAD-7 screening
screening_results           -- Already exists but verify

-- Priority 3: Admin/Analytics
clinics                     -- Admin portal B2B
moderation_queue            -- Content moderation
nps_responses               -- NPS surveys
message_feedback            -- AI feedback
upgrade_prompt_analytics    -- Conversion tracking

-- Priority 4: Supporting features
goals                       -- Goal tracking
streaks                     -- (separate from user_streaks)
user_preferences            -- Email digest
insight_report_shares       -- Report sharing
referral_credits            -- Referral system
jr_sessions                 -- Aminy Jr
kv_store_8a022548           -- Key-value store
users                       -- May be auth.users reference issue
caregiver_time_entries      -- Documentation
```

### 1.2 Fix Broken Foreign Keys

```sql
-- Create children table FIRST
CREATE TABLE IF NOT EXISTS children (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  date_of_birth DATE,
  diagnoses TEXT[],
  communication_level TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Then fix FKs in:
-- - outcome_events.child_id
-- - user_baselines.child_id
-- - ai_chat_conversations.child_id
```

### 1.3 Fix Migration Numbering

Rename to avoid conflicts:
- `010_outcomes_tracking.sql` → `010a_outcomes_tracking.sql`
- `010_community_and_analytics.sql` → `010b_community_and_analytics.sql`
- `011_clinical_phase2.sql` → `011a_clinical_phase2.sql`
- `011_provider_credentials.sql` → `011b_provider_credentials.sql`
- `012_phase3_scale.sql` → `012a_phase3_scale.sql`
- `012_community_tables.sql` → `012b_community_tables.sql`

---

## PHASE 2: BACKEND ENDPOINT FIXES

### 2.1 Implement Missing Analytics Endpoints

```typescript
// These are called but don't exist:
POST /make-server-8a022548/analytics/module-usage
GET /make-server-8a022548/analytics/summary
GET /make-server-8a022548/analytics/cohort/export
```

### 2.2 Fix Stripe Payment Routing

Current issue: Endpoints are stubs that call functions but don't return properly.

```typescript
// Fix these in make-server-8a022548/index.ts:
POST /payments/create-checkout    // Currently stub
POST /payments/create-portal      // Currently stub
POST /payments/cancel             // Currently stub
POST /payments/resume             // Currently stub
POST /payments/create-payment     // Currently stub
```

### 2.3 Fix Telehealth URL Double-Prefix

```typescript
// Current bug in telehealth-api.ts:
API_BASE_URL = `https://${projectId}.supabase.co/functions/v1/telehealth`
// Then calls: ${API_BASE_URL}/telehealth/appointments
// Result: .../telehealth/telehealth/appointments (BROKEN)

// Fix: Remove /telehealth from API_BASE_URL or from endpoint paths
```

### 2.4 Implement Report Email Sharing

```typescript
// Current: Line 1550 is a placeholder
// Need: Real email sending via Resend/SendGrid
POST /reports/:reportId/share
```

---

## PHASE 3: CRITICAL FRONTEND FLOW FIXES

### 3.1 AI Chat Memory Persistence

**Current State:**
- Messages stored in React Context (memory only)
- Saved to localStorage on manual action
- Lost on logout/device switch

**Fix Required:**
```typescript
// In AIContext or claude-client.ts:

// 1. On conversation start, load from DB:
const { data } = await supabase
  .from('ai_chat_conversations')
  .select('*, ai_chat_messages(*)')
  .eq('user_id', userId)
  .order('created_at', { ascending: false })
  .limit(1)

// 2. On each message, save to DB:
await supabase.from('ai_chat_messages').insert({
  conversation_id: conversationId,
  role: message.role,
  content: message.content,
  created_at: new Date().toISOString()
})

// 3. Load memory facts for context:
const { data: memories } = await supabase
  .from('memory_facts')  // Or relevant table
  .select('*')
  .eq('user_id', userId)
  .limit(50)
```

### 3.2 Booking Flow - Actually Save Bookings

**Current State:**
- Booking state passed to parent
- Toast shown "Session booked!"
- NOTHING saved to database

**Fix Required:**
```typescript
// In ConversationalBooking.tsx handleConfirm():

const handleConfirm = async () => {
  // 1. Save to database
  const { data, error } = await supabase
    .from('marketplace_bookings')  // Need to create this table
    .insert({
      user_id: user.id,
      provider_id: state.selectedProvider.id,
      child_id: selectedChild.id,
      session_type: state.visitType,
      scheduled_at: state.selectedSlot.datetime,
      concern: state.concern,
      notes: state.notes,
      status: 'confirmed',
      price: calculatePrice(state.visitType),
      created_at: new Date().toISOString()
    })
    .select()
    .single()

  if (error) {
    toast.error('Failed to book session. Please try again.')
    return
  }

  // 2. Send confirmation email (via backend)
  await fetch(`${API_URL}/telehealth/notifications/email`, {
    method: 'POST',
    body: JSON.stringify({
      type: 'booking_confirmation',
      bookingId: data.id,
      userId: user.id
    })
  })

  // 3. Then navigate
  onComplete(data)
}
```

### 3.3 Provider Directory - Use Real Database

**Current State:**
- `MOCK_PROVIDERS` hardcoded array
- 3 fake providers: Dr. Sarah Chen, Dr. Michael Torres, Dr. Emily Watson

**Fix Required:**
```typescript
// In ConversationalBooking.tsx:

const [providers, setProviders] = useState<Provider[]>([])

useEffect(() => {
  const loadProviders = async () => {
    const { data } = await supabase
      .from('provider_profiles')
      .select(`
        id,
        user_id,
        full_name,
        credentials,
        specialty,
        bio,
        hourly_rate,
        rating,
        review_count,
        provider_availability(*)
      `)
      .eq('status', 'active')
      .eq('accepting_patients', true)

    setProviders(data || [])
  }
  loadProviders()
}, [])

// Remove MOCK_PROVIDERS constant entirely
```

### 3.4 My Appointments - Load Real Data

**Current State:**
- `MOCK_APPOINTMENTS` hardcoded array
- 4 fake appointments shown

**Fix Required:**
```typescript
// In MyAppointments.tsx:

const [appointments, setAppointments] = useState([])

useEffect(() => {
  const loadAppointments = async () => {
    const { data } = await supabase
      .from('marketplace_bookings')
      .select(`
        *,
        provider:provider_profiles(full_name, credentials, avatar_url),
        child:children(name)
      `)
      .eq('user_id', user.id)
      .order('scheduled_at', { ascending: true })

    setAppointments(data || [])
  }
  loadAppointments()
}, [])

// Remove MOCK_APPOINTMENTS constant
```

### 3.5 Onboarding - Persist to Database Immediately

**Current State:**
- Data in sessionStorage only
- Only saved after auth completes (can be lost)

**Fix Required:**
```typescript
// In OnboardingEnhanced.tsx, after each critical step:

const saveProgress = async (stepData: Partial<OnboardingData>) => {
  // Save to localStorage as backup
  localStorage.setItem('onboarding_progress', JSON.stringify({
    ...currentData,
    ...stepData,
    savedAt: Date.now()
  }))

  // If user is authenticated, also save to DB
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    await supabase
      .from('profiles')
      .update({
        onboarding_data: { ...currentData, ...stepData },
        onboarding_step: currentStep
      })
      .eq('id', user.id)
  }
}
```

### 3.6 Stripe Payment - Remove Silent Fallback

**Current State:**
```typescript
if (!isStripeConfigured()) {
  toast.info('Payment processing is being set up. Activating trial mode.')
  onSubscribe(tierId)  // SILENTLY SUCCEEDS WITHOUT PAYMENT
  return
}
```

**Fix Required:**
```typescript
if (!isStripeConfigured()) {
  toast.error('Payment system is currently unavailable. Please try again later.')
  console.error('[Payment] Stripe not configured - missing env vars')
  return  // DO NOT proceed with fake subscription
}
```

---

## PHASE 4: PROVIDER EXPERIENCE FIXES

### 4.1 Real Credential Verification

**Current State:**
- `verifyProviderCredentials()` just checks string length
- No real license board API calls
- No NPI verification

**Fix Required:**
```typescript
// In auth-roles.ts:

export async function verifyProviderCredentials(application: ProviderApplication) {
  const results = {
    license_valid: false,
    npi_valid: false,
    name_match: false,
    verification_source: 'pending',
    flags: []
  }

  // 1. NPI Verification via NPPES API (free, public)
  try {
    const npiResponse = await fetch(
      `https://npiregistry.cms.hhs.gov/api/?number=${application.npi_number}&version=2.1`
    )
    const npiData = await npiResponse.json()

    if (npiData.result_count > 0) {
      const provider = npiData.results[0]
      results.npi_valid = true
      results.name_match = provider.basic.name.toLowerCase()
        .includes(application.full_name.split(' ')[1].toLowerCase())
    }
  } catch (e) {
    results.flags.push('NPI verification failed - manual review needed')
  }

  // 2. For now, mark as pending for manual review
  // Real license verification requires state-specific APIs or services like:
  // - Nursys (nursing)
  // - BACB Registry (BCBAs)
  // - State medical board APIs
  results.verification_source = 'NPI Registry + Manual Review Required'

  return results
}
```

### 4.2 Provider Portal - Real Patient Data

**Current State:**
```typescript
// Fallback for demo
setProvider({ name: 'Dr. Sarah Mitchell', ... })
patientsList.push(
  { childName: 'Emma Thompson', ... },  // FAKE
  { childName: 'Liam Chen', ... },      // FAKE
)
```

**Fix Required:**
- Remove ALL fallback demo data
- Show empty state with "No patients yet" message
- Add proper loading/error states

### 4.3 Provider Payments - Implement Disbursements

**Current State:**
- `providerPay` values exist in pricing.ts
- No actual payment to providers

**Fix Required:**
```typescript
// New endpoint: POST /providers/:providerId/payouts

// 1. Calculate earnings from completed sessions
const { data: sessions } = await supabase
  .from('marketplace_bookings')
  .select('*')
  .eq('provider_id', providerId)
  .eq('status', 'completed')
  .eq('provider_paid', false)

// 2. Create Stripe Transfer (requires Stripe Connect)
const transfer = await stripe.transfers.create({
  amount: totalEarnings,
  currency: 'usd',
  destination: providerStripeAccountId,
  description: `Aminy payout for ${sessions.length} sessions`
})

// 3. Mark sessions as paid
await supabase
  .from('marketplace_bookings')
  .update({ provider_paid: true, payout_id: transfer.id })
  .in('id', sessionIds)
```

---

## PHASE 5: REMOVE ALL MOCK/DEMO DATA

### Files to Clean

Search and remove all instances of:
- `MOCK_PROVIDERS`
- `MOCK_APPOINTMENTS`
- `MOCK_GOALS`
- `// Fallback for demo`
- `// Demo data`
- `Dr. Sarah Mitchell`
- `Dr. Sarah Chen`
- `Emma Thompson`
- `Liam Chen`
- `Sofia Rodriguez`

### Console.log Cleanup

Remove 214+ console.log statements (keep error logging).

---

## PHASE 6: STREAMLINE ONBOARDING

### Current: 11+ Steps
0. What to Expect
1. Parent name
2. Child basics
3. Primary concern
4. Tone selection
5. Diagnoses + communication
6. Focus areas
7. Quick win reveal
8. Parent capacity
9. Child mental health
10. Email + insurance
11. Plan generation

### Target: 5 Steps
1. **Account** - Email, password, parent name (combined)
2. **Child** - Name, age, primary diagnosis (3 fields max)
3. **Concern** - What's hardest right now? (single selection)
4. **Quick Win** - Show immediate value (AI tip based on concern)
5. **Plan** - Show personalized plan, offer subscription

Remove:
- Tone selection (default to warm)
- Communication level (infer from diagnosis)
- Focus areas (auto-suggest based on concern)
- Parent capacity (move to later)
- Child mental health (move to later)
- Insurance (move to settings)

---

## PHASE 7: CODE QUALITY

### 7.1 Type Safety
- Remove all `as any` casts
- Add proper types to event handlers
- Add null checks

### 7.2 Error Handling
- Replace silent failures with user-visible errors
- Add retry logic for network failures
- Add proper error boundaries

### 7.3 Performance
- Memoize expensive computations
- Lazy load heavy components
- Add proper loading states

---

## IMPLEMENTATION ORDER

### Week 1: Database & Backend
- [ ] Create 24 missing tables (migration 014)
- [ ] Fix foreign key to children table
- [ ] Implement 3 missing analytics endpoints
- [ ] Fix Stripe payment routing
- [ ] Fix telehealth URL bug

### Week 2: Core Flows
- [ ] AI chat memory persistence
- [ ] Booking flow saves to database
- [ ] Provider directory from database
- [ ] Appointments from database
- [ ] Remove payment silent fallback

### Week 3: Provider Experience
- [ ] Real NPI verification
- [ ] Remove provider demo data
- [ ] Provider payout system (Stripe Connect)
- [ ] Provider dashboard real data

### Week 4: Polish
- [ ] Streamline onboarding to 5 steps
- [ ] Remove all mock data
- [ ] Remove console.logs
- [ ] Type safety fixes
- [ ] Error handling
- [ ] Testing

---

## SUCCESS CRITERIA

### Before Launch Checklist
- [ ] Zero `MOCK_` constants in codebase
- [ ] Zero `// demo` or `// fallback` comments
- [ ] All 24 missing tables created
- [ ] AI chat persists across sessions
- [ ] Bookings save to database
- [ ] Providers load from database
- [ ] Payments require real Stripe
- [ ] Onboarding is 5 steps
- [ ] Console.logs removed
- [ ] All endpoints return proper errors (no silent failures)

---

## ESTIMATED EFFORT

| Phase | Effort | Priority |
|-------|--------|----------|
| Phase 1: Database | 1-2 days | CRITICAL |
| Phase 2: Backend | 1-2 days | CRITICAL |
| Phase 3: Frontend Flows | 3-4 days | CRITICAL |
| Phase 4: Provider | 2-3 days | HIGH |
| Phase 5: Mock Cleanup | 1 day | HIGH |
| Phase 6: Onboarding | 1-2 days | MEDIUM |
| Phase 7: Code Quality | 2-3 days | MEDIUM |

**Total: ~2-3 weeks of focused work**

This is the real work needed. No more "it's almost done" - this is what actually needs to happen.
