# Aminy Master Execution Plan
## Complete Feature List from Strategic Notes

---

## PHASE 0: PRODUCTION DEPLOYMENT (Today - 2 hours)
*Get the app live so real users can sign up*

### 0.1 Backend Secrets Configuration
**Location:** Supabase Dashboard > Edge Functions > Secrets

Required secrets:
```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
ANTHROPIC_API_KEY=sk-ant-...
RESEND_API_KEY=re_...
```

### 0.2 Stripe Webhook Setup
**Location:** Stripe Dashboard > Webhooks
- URL: `https://qpzsvafwcwyrkdolrjbu.supabase.co/functions/v1/make-server-8a022548/payments/webhook`
- Events: `checkout.session.completed`, `customer.subscription.*`, `invoice.*`

### 0.3 OAuth Configuration
**Location:** Supabase Dashboard > Auth > Providers
- Enable Google OAuth
- Enable Apple OAuth

### 0.4 Daily.co Configuration
- Set `VITE_DAILY_DOMAIN` in .env.local
- Required for telehealth video calls

**Status after Phase 0:** Users can sign up, pay, and use AI chat

---

## PHASE 1: ERROR LOGGING & USER FEEDBACK (Day 1 - 2 hours)
*From your notes: "I need to know when things break"*

### 1.1 Create Error Logs Database Table
**File:** `supabase/migrations/003_error_logging.sql`

```sql
-- Error logs for tracking issues
CREATE TABLE error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  error_message TEXT NOT NULL,
  error_stack TEXT,
  page_url TEXT,
  component_name TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  severity TEXT CHECK (severity IN ('error', 'warning', 'info'))
);

-- User feedback for bug reports
CREATE TABLE user_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  message TEXT NOT NULL,
  page_url TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'resolved'))
);

-- Enable RLS
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_feedback ENABLE ROW LEVEL SECURITY;

-- Policies for error_logs (admin only read, anyone can insert)
CREATE POLICY "Users can insert errors" ON error_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can read errors" ON error_logs FOR SELECT USING (
  auth.uid() IN (SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' = 'admin')
);

-- Policies for user_feedback
CREATE POLICY "Users can submit feedback" ON user_feedback FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own feedback" ON user_feedback FOR SELECT USING (auth.uid() = user_id);
```

### 1.2 Create Error Logging Service
**File:** `src/lib/error-logging.ts`

```typescript
import { supabase } from '@/utils/supabase/client';

export async function logError(
  error: Error,
  componentName?: string
): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    await supabase.from('error_logs').insert({
      user_id: user?.id,
      error_message: error.message,
      error_stack: error.stack,
      page_url: window.location.href,
      component_name: componentName,
      severity: 'error'
    });
  } catch (e) {
    // Silent fail - don't break the app if logging fails
    console.error('Failed to log error:', e);
  }
}

export async function submitFeedback(message: string): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase.from('user_feedback').insert({
      user_id: user?.id,
      message,
      page_url: window.location.href
    });

    return !error;
  } catch {
    return false;
  }
}
```

### 1.3 Create Floating Feedback Button
**File:** `src/components/FeedbackButton.tsx`

```typescript
import React, { useState } from 'react';
import { MessageCircle, X, Send } from 'lucide-react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { submitFeedback } from '@/lib/error-logging';
import { toast } from 'sonner';

export function FeedbackButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!message.trim()) return;

    setIsSubmitting(true);
    const success = await submitFeedback(message);
    setIsSubmitting(false);

    if (success) {
      toast.success('Thank you for your feedback!');
      setMessage('');
      setIsOpen(false);
    } else {
      toast.error('Failed to submit feedback. Please try again.');
    }
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-50 bg-primary text-white p-3 rounded-full shadow-lg hover:bg-primary/90 transition-colors"
        aria-label="Send feedback"
      >
        <MessageCircle className="w-6 h-6" />
      </button>

      {/* Feedback modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Share Feedback</h3>
              <button onClick={() => setIsOpen(false)}>
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tell us about any issues or suggestions..."
              rows={4}
              className="mb-4"
            />

            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !message.trim()}
              className="w-full"
            >
              <Send className="w-4 h-4 mr-2" />
              {isSubmitting ? 'Sending...' : 'Send Feedback'}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
```

### 1.4 Create Admin Error Dashboard
**File:** `src/components/AdminErrorDashboard.tsx`

Simple admin page to view recent errors and feedback.

### 1.5 Integration
- Add `<FeedbackButton />` to App.tsx (always visible)
- Update ErrorBoundary to call `logError()`
- Add AdminErrorDashboard to admin routes

---

## PHASE 2: COVERAGE COACH CONTENT (Day 1-2 - 3 hours)
*From your notes: "Parents are desperate for this"*

### 2.1 Create Coverage Coach Component
**File:** `src/components/CoverageCoach.tsx`

Sections to include:

#### Section 1: Insurance Questions Checklist
```
Questions to ask your insurance company:
□ Is ABA therapy covered under my plan?
□ What is my deductible for behavioral health services?
□ Is there a limit on the number of ABA sessions per year?
□ Do I need a referral or prior authorization?
□ Which ABA providers are in-network?
□ Is telehealth ABA covered?
□ Are BCBAs and RBTs covered at the same rate?
□ What documentation is required for coverage?
```

#### Section 2: CPT Codes Explained
```
97151 - Behavior identification assessment
  "The initial evaluation where the BCBA assesses your child's needs"
  Typically: 2-4 hours, done once at start

97153 - Adaptive behavior treatment (technician)
  "Direct therapy sessions with an RBT"
  Typically: 2-8 hours per week of direct therapy

97155 - Adaptive behavior treatment (BCBA)
  "Sessions where the BCBA works directly with your child"
  Typically: 1-2 hours per week

97156 - Family guidance
  "Parent training sessions"
  Typically: 1-4 hours per month

97157 - Group therapy
  "Social skills groups with multiple children"
  Typically: 1-2 hours per week
```

#### Section 3: Appeal Letter Template
Pre-written template parents can copy and customize.

#### Section 4: Single-Case Agreement Guide
Step-by-step process for getting out-of-network coverage.

#### Section 5: Medicaid Waivers
```
Many families qualify for Medicaid waiver funding and don't realize it.

Common waivers:
- HCBS (Home and Community-Based Services)
- EPSDT (Early Periodic Screening, Diagnostic & Treatment)
- State-specific autism waivers

To find your state's waivers:
Search "[your state] autism waiver" or "[your state] HCBS waiver"
```

#### Section 6: Using Waiver Funding for Aminy
```
If you receive Medicaid waiver services (like HCBS or state autism waivers),
your waiver funding may cover Aminy's subscription and telehealth services.

How waiver funding works:
Waiver funding is managed through fiscal intermediaries—companies like
Public Partnerships (PPL), Acumen, GT Independence, and Consumer Direct
Care Network that help you direct your approved budget toward services
you choose.

To use waiver dollars for Aminy:
1. Ask your support coordinator if therapy support apps and telehealth
   are approved categories in your plan
2. Request Aminy be added as an approved vendor if needed
3. Your fiscal intermediary can process payment directly

We're actively partnering with fiscal intermediaries to become a
pre-approved vendor. In the meantime, you can request approval
individually—we'll help with the paperwork.
```

#### Section 7: For Paid Parent Caregivers
```
Some parents are paid caregivers through Medicaid waiver programs and
need to document their time and activities.

How Aminy helps:
- Progress tracking creates automatic activity logs
- Weekly reports can support documentation requirements
- Export reports in formats fiscal intermediaries accept

Common fiscal intermediaries:
- Public Partnerships (PPL) - 21+ states
- Acumen Fiscal Agent - expanding nationally
- GT Independence - 17 states + DC
- Consumer Direct Care Network - 14 states

If you work with a fiscal intermediary, your Aminy reports can help
you keep organized records of caregiving activities. We're building
deeper integrations—email us at support@aminy.com if this would help you.
```

### 2.2 Add Link to Companion
Add note in Coverage Coach:
"Need help writing a letter? Ask Aminy's companion to help you draft
prior authorization requests, appeal letters, or waiver enrollment letters."

---

## PHASE 3: AI LETTER DRAFTING (Day 2 - 2 hours)
*From your notes: "The companion should ask clarifying questions...then draft a professional letter"*

### 3.1 Update AI System Prompt
**File:** `src/supabase/functions/server/index.tsx`

Add to system prompt:

```
You can help parents draft letters for insurance and waiver purposes.
When a parent asks for help with a letter, you should:

1. Ask clarifying questions about:
   - Child's diagnosis and date of diagnosis
   - Services being requested or denied
   - Insurance company/plan name
   - Relevant dates (denial date, treatment dates, etc.)
   - Prescribing physician's name

2. You can help draft:
   - Prior authorization request letters
   - Medical necessity letters
   - Insurance appeal letters
   - Waiver enrollment request letters
   - Letters requesting Aminy be approved as a waiver-funded service

3. Format letters professionally with:
   - Date and recipient address block
   - Clear subject line
   - Reference numbers (claim #, member ID)
   - Specific diagnosis codes (ICD-10)
   - CPT codes for services requested
   - Medical necessity justification
   - Signature block

Always remind parents to review and customize the letter, and to have
their physician review medical necessity statements.
```

### 3.2 Create Letter Templates
**File:** `src/lib/letter-templates.ts`

Pre-built templates for:
- Prior authorization request
- Insurance appeal (after denial)
- Medical necessity letter
- Single-case agreement request
- Waiver enrollment request

---

## PHASE 4: MEASURABLE OUTCOMES SYSTEM (Day 2-3 - 4 hours)
*From your notes: "demonstrating tangible outcomes—reduced parent stress, improved routine adherence"*

### 4.1 Daily Stress Check-In
**File:** `src/components/StressCheckIn.tsx`

Features:
- Morning check-in: "How are you feeling today?" (1-10 scale)
- Evening check-in: "How was today?" (1-10 scale)
- Visual emoji scale for quick input
- Store in database for trending

### 4.2 Routine Adherence Tracking
**File:** `src/components/RoutineAdherence.tsx`

Track:
- Scheduled routines vs completed
- On-time completion rate
- Weekly adherence percentage
- Streak tracking per routine

### 4.3 Database Schema
**File:** `supabase/migrations/004_outcomes_tracking.sql`

```sql
-- Daily stress logs
CREATE TABLE stress_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  stress_level INTEGER CHECK (stress_level >= 1 AND stress_level <= 10),
  check_in_type TEXT CHECK (check_in_type IN ('morning', 'evening')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Routine completions
CREATE TABLE routine_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  routine_id TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  status TEXT CHECK (status IN ('completed', 'partial', 'skipped', 'delayed')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE stress_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE routine_completions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can manage own stress logs" ON stress_logs
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own routine completions" ON routine_completions
  FOR ALL USING (auth.uid() = user_id);
```

### 4.4 Outcomes Dashboard Enhancement
**File:** `src/components/OutcomesTracking.tsx`

Add sections:
- **Stress Trend**: Week 1 average vs current week
- **Routine Adherence**: % completed this week vs last week
- **Goals Progress**: Achieved vs set
- **Engagement**: Days active, AI conversations, tools used

---

## PHASE 5: EASY SUCCESS SHARING (Day 3 - 3 hours)
*From your notes: "We need to make that easy for parents to do"*

### 5.1 Celebration Auto-Prompts
**File:** `src/components/CelebrationPrompt.tsx`

Trigger celebrations at key moments:
- 3-day streak → "You're on a roll! Share your progress?"
- First goal completed → "Amazing! Your first goal! Share this win?"
- Stress improved → "Your stress is down this week! Celebrate?"
- 7-day streak → Generate shareable card automatically

### 5.2 Testimonial Capture
**File:** `src/components/TestimonialCapture.tsx`

After key moments (7-day mark, first goal), ask:
- "Would you recommend Aminy to other parents?" (1-10 NPS)
- "What's been most helpful so far?" (open text)
- "Can we feature your story (anonymized)?" (opt-in checkbox)

### 5.3 Share Templates
Enhance ShareableMilestoneCard.tsx with pre-written messages:
- "Week 1 with Aminy: Completed X goals, Y calm moments!"
- "My child just [milestone] with Aminy's help!"
- "Feeling more confident as a parent 💪"

---

## PHASE 6: HSA/FSA PAYMENT MESSAGING (Day 3 - 1 hour)
*From your notes: "Add HSA/FSA guidance throughout the payment experience"*

### 6.1 Pricing Page Badge
Add "HSA/FSA Eligible" badge near subscription options.

### 6.2 Checkout Messaging
Add text at checkout:
```
Paying with HSA/FSA?
Most health savings and flexible spending accounts cover therapy-related
services. Your HSA/FSA card works like a regular credit card at checkout.
Save your receipt for your records.
```

### 6.3 Receipt Formatting
Ensure receipts include:
- "Aminy - Therapy Support Platform"
- "Telehealth Services"
- Service date and amount

---

## PHASE 7: BRAND VOICE AUDIT (Day 3-4 - 2 hours)
*From your notes: "Gentle guidance. Meaningful progress. Proactive calm."*

### 7.1 Copy Audit Checklist
Review all user-facing copy for:
- [ ] Remove clinical/cold/corporate language
- [ ] Replace urgency with warm encouragement
- [ ] CTAs should be supportive ("Let's get started" not "Sign up now")
- [ ] Error messages should be kind, not robotic
- [ ] Empty states should be encouraging

### 7.2 Key Screens to Update
- SplashPage.tsx
- LoginScreen.tsx
- CreateAccountScreen.tsx
- OnboardingFlow5Steps.tsx
- Dashboard10.tsx
- PricingPage.tsx
- Error messages throughout

---

## PHASE 8: MARKETING CONTENT (Day 4 - 2 hours)
*From your notes: Waitlist + supplementing services messaging*

### 8.1 Waitlist Marketing
Add to landing page and onboarding:
- "Can't wait 18 months for ABA services? Start supporting your child today."
- "The waitlist doesn't have to mean doing nothing."
- "Early support matters. Begin building skills now."

### 8.2 Supplementing Services Marketing
For families already in therapy:
- "Already in ABA or speech therapy? Reinforce the progress at home."
- "Your child's therapy is a few hours a week. Aminy extends the learning."
- "Keep your care team in sync with progress reports they can use."

---

## PHASE 9: CAREGIVER DOCUMENTATION (Day 4-5 - 4 hours)
*From your notes: "AI-assisted documentation features for paid parent caregivers"*

### 9.1 Caregiver Activity Logger
**File:** `src/components/CaregiverLog.tsx`

Features:
- Prompt parent for: activity type, start/end time, description, child's response
- Output formatted log entry
- Activity types: therapy practice, behavioral support, skill building, personal care, community integration

### 9.2 Caregiver Log Section
Dedicated area to view/edit saved logs with fields:
- Participant name
- Date of service
- Service type
- Start time, end time, duration
- Description of activity
- Goals addressed
- Caregiver name
- Signature line

### 9.3 Export Functionality
- PDF export formatted for FI submission
- CSV export for spreadsheet tracking
- Include header with participant info, date range, hours summary

### 9.4 EVV-Compatible Fields
Ensure exports include:
- Service date
- Start and end times
- Service type/code
- Location (home/community)
- Participant ID field (user-entered)
- Caregiver/employee name
- Description of services
- Duration in hours and minutes

### 9.5 Companion Prompts
Add to AI:
- "I can help you document your caregiving activities for your waiver program. Want to log today's activities?"
- "Need to generate a documentation report for your fiscal intermediary? I can help format your logs."

---

## PHASE 10: B2B PARTNERSHIP MATERIALS (Day 5 - 2 hours)
*From your notes: Acumen partnership prep*

### 10.1 Fiscal Intermediary One-Pager
**File:** Create PDF or dedicated page

Content:
- Header: "Aminy: AI-Powered Support for Self-Directing Families"
- Value prop for families: daily plans, emotional support, goal tracking, telehealth
- Value prop for FIs: clean invoices, documentation support, compliance help
- Integration opportunity teaser
- CTA: Partner email

### 10.2 Acumen Pilot Proposal
**File:** Create one-page PDF

Content:
- Opportunity: Acumen families need daily support + documentation help
- Pilot structure: 50-100 families, 90 days, free/discounted access
- Success metrics: engagement, documentation rates, stress reduction, NPS
- What Aminy needs: intro to families, DCI format feedback, vendor pathway
- What Acumen gets: differentiation, better documentation, outcomes data, equity position

---

## PHASE 11: VISUAL TIMER & SKYLIGHT FEATURES (Day 5-6 - 4 hours)
*From your notes: "Concept similar to Skylight...rewards, routines, to-do list"*

### 11.1 Visual Timer
**File:** `src/components/VisualTimer.tsx`

Features:
- Circular countdown display
- Color progression (green → yellow → red)
- Audio cues at intervals
- Celebration animation on completion
- Integration with routines

### 11.2 Calm Coins System
**File:** `src/lib/calm-coins.ts`

System:
- Earn: tasks (5), routines (10), goals (25), streaks (50)
- Redeem: parent-set custom rewards
- Visual coin counter on dashboard

### 11.3 Checklist View
**File:** `src/components/ChecklistView.tsx`

Features:
- Large, satisfying checkboxes
- Progress bar at top
- Celebration on all-done
- Kid-friendly visuals

---

## IMPLEMENTATION TIMELINE

| Day | Focus | Hours | Deliverables |
|-----|-------|-------|--------------|
| 1 | Deployment + Error Logging | 4h | App live, feedback button |
| 2 | Coverage Coach + Letter Drafting | 5h | Insurance guidance, AI letters |
| 3 | Outcomes Tracking + Sharing | 5h | Stress/adherence tracking, celebration prompts |
| 4 | HSA + Brand Voice + Marketing | 5h | Payment messaging, copy cleanup |
| 5 | Caregiver Docs + B2B Materials | 6h | Activity logger, FI one-pager |
| 6 | Visual Timer + Calm Coins | 4h | Skylight-like features |

**Total: ~29 hours over 6 days**

---

## SUCCESS METRICS

### User Engagement
- Daily active users
- Return to companion chat rate (target: 60%+ weekly)
- Tasks completed per user per week
- Streaks > 7 days (target: 30% of users)

### Measurable Outcomes (Your Moat)
- Stress level: baseline vs week 4 (target: 20% improvement)
- Routine adherence: week 1 vs week 4 (target: 40% improvement)
- Goals completed per month (target: 3+)

### Virality
- Share rate per user per week (target: 1+)
- Testimonials captured (target: 10% of active users)
- NPS score (target: 50+)

### B2B Traction
- Clinic inquiries
- FI partnership conversations
- Pilot family signups

---

## FILES TO CREATE (Summary)

### New Components
1. `src/components/FeedbackButton.tsx`
2. `src/components/AdminErrorDashboard.tsx`
3. `src/components/CoverageCoach.tsx`
4. `src/components/StressCheckIn.tsx`
5. `src/components/RoutineAdherence.tsx`
6. `src/components/CelebrationPrompt.tsx`
7. `src/components/TestimonialCapture.tsx`
8. `src/components/CaregiverLog.tsx`
9. `src/components/VisualTimer.tsx`
10. `src/components/ChecklistView.tsx`

### New Lib Files
1. `src/lib/error-logging.ts`
2. `src/lib/letter-templates.ts`
3. `src/lib/calm-coins.ts`
4. `src/lib/outcomes-calculator.ts`

### Database Migrations
1. `003_error_logging.sql`
2. `004_outcomes_tracking.sql`
3. `005_calm_coins.sql`

### Marketing/B2B
1. FI Partnership One-Pager (PDF)
2. Acumen Pilot Proposal (PDF)

---

## WHAT THIS GIVES YOU

1. **ChatGPT-Proof Moat**: Structured tracking, insurance guidance, documentation exports
2. **Measurable Outcomes**: Data proving stress reduction and routine adherence
3. **Virality Engine**: Easy sharing + celebration prompts + testimonial capture
4. **B2B Ready**: FI-compatible exports, partnership materials, pilot proposal
5. **Skylight Parity**: Visual timer, coins, checklists, routines

---

## NEXT STEPS

Ready to execute? The recommended order is:

1. **Today**: Phase 0 (deployment) - 2 hours of configuration
2. **Tomorrow**: Phase 1-2 (error logging + coverage coach) - 5 hours
3. **Day 3**: Phase 3-4 (letters + outcomes) - 6 hours
4. **Day 4**: Phase 5-7 (sharing + HSA + brand) - 5 hours
5. **Day 5**: Phase 8-9 (marketing + caregiver docs) - 6 hours
6. **Day 6**: Phase 10-11 (B2B + Skylight features) - 6 hours

Would you like me to start executing Phase 0 right now?
