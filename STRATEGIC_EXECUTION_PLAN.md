# Aminy Strategic Execution Plan
## From MVP to Market-Defining Product

---

## The Strategic Imperative

Your competitive advantage isn't the AI chat (ChatGPT can do that). It's:
1. **Structured tracking & progress visualization** - parents won't manually ask ChatGPT to log behaviors
2. **Healthcare bridge** - coverage coach, payer-ready reports, clinician viewer access
3. **Proactive system** - push notifications, daily check-ins, correlations surfaced automatically
4. **Measurable outcomes** - data that proves reduced parent stress, improved routine adherence

---

## Current State Assessment

| Feature Area | Completeness | Status |
|--------------|--------------|--------|
| Rewards/Gamification | 40% | Stars/streaks work, but no coins or redemption |
| Routines/Schedules | 35% | Planning exists, no visual timers |
| To-Do Lists | 50% | Tasks work, no checklist UI |
| Progress Measurement | 60% | Good foundation, needs real-time tracking |
| Sharing/Success Stories | 70% | Share cards work, no community |
| **Overall** | **51%** | Strong framework, needs completion |

---

## PHASE 1: Production Deployment (Day 1)
*Get the MVP live so users can start creating accounts and paying*

### 1.1 Backend Secrets (30 min)
**Location:** Supabase Dashboard > Edge Functions > Secrets

```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
ANTHROPIC_API_KEY=sk-ant-...
RESEND_API_KEY=re_...
```

### 1.2 Stripe Webhook (15 min)
**Location:** Stripe Dashboard > Webhooks

- Endpoint: `https://qpzsvafwcwyrkdolrjbu.supabase.co/functions/v1/make-server-8a022548/payments/webhook`
- Events: `checkout.session.completed`, `customer.subscription.*`, `invoice.*`

### 1.3 OAuth Providers (30 min)
**Location:** Supabase Dashboard > Auth > Providers

- Enable Google OAuth (credentials from Google Cloud Console)
- Enable Apple OAuth (credentials from Apple Developer)

### 1.4 Daily.co Setup (15 min)
- Get domain from daily.co dashboard
- Update `VITE_DAILY_DOMAIN` in .env.local

### 1.5 Deploy to Vercel (20 min)
```bash
git init && git add . && git commit -m "Initial production deployment"
git push -u origin main
```

Add GitHub secrets: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`

---

## PHASE 2: Measurable Outcomes System (Days 2-3)
*"The key will be demonstrating tangible outcomes—reduced parent stress, improved routine adherence"*

### 2.1 Parent Stress Tracking
**File to enhance:** `src/context/AIContext.tsx`

Add daily stress check-in:
- Morning: "How are you feeling today?" (1-10 scale)
- Evening: "How was today?" (1-10 scale)
- Store in database for trending

**Create:** `src/components/StressCheckIn.tsx`
```typescript
// Quick stress check-in modal
// Appears daily at configurable times
// Stores: userId, stressLevel (1-10), timestamp, context (morning/evening)
// Visualizes trend over 7/30/90 days
```

### 2.2 Routine Adherence Tracking
**File to create:** `src/components/RoutineAdherenceTracker.tsx`

Track:
- Which routines scheduled vs completed
- Completion time vs scheduled time
- Streak of routine adherence per routine
- Weekly adherence percentage

**Database table needed:**
```sql
CREATE TABLE routine_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  routine_id TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  completion_status TEXT CHECK (completion_status IN ('completed', 'partial', 'skipped', 'delayed')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2.3 Outcomes Dashboard Enhancement
**File to enhance:** `src/components/OutcomesTracking.tsx`

Add real metrics:
- **Stress Reduction**: Week 1 avg vs current week avg
- **Routine Adherence**: % of scheduled routines completed
- **Engagement Trend**: Days active per week
- **Goal Progress**: Goals achieved vs set

### 2.4 Weekly Outcomes Report
**File to create:** `src/components/WeeklyOutcomesReport.tsx`

Auto-generate every Sunday:
- This week's stress average vs last week
- Routines completed (X/Y)
- Goals achieved this week
- AI-generated insight paragraph
- Shareable summary card

---

## PHASE 3: Easy Success Story Sharing (Days 3-4)
*"We need to make that easy for parents to do"*

### 3.1 One-Tap Win Capture
**File exists:** `src/components/WinsJournal.tsx`

Enhance:
- Floating "+" button always visible on dashboard
- Voice-to-text win capture
- Auto-tag from AI context
- Instant share preview

### 3.2 Automated Celebration Prompts
**File to create:** `src/components/CelebrationPrompt.tsx`

Trigger celebrations automatically:
- 3-day streak → Prompt to share
- First goal completed → Prompt to share
- Stress level improved → "You're doing better this week!"
- 7-day streak → Generate shareable milestone card

### 3.3 Share Templates
**File to enhance:** `src/components/ShareableMilestoneCard.tsx`

Add pre-written templates:
- "Week 1 with Aminy: [Auto-filled metrics]"
- "My child just [milestone] with Aminy's help!"
- "Feeling more confident as a parent 💪"

### 3.4 Social Proof Collection
**File to create:** `src/components/TestimonialCapture.tsx`

After key moments (7-day mark, first goal), ask:
- "Would you recommend Aminy to other parents?"
- "Can we feature your story (anonymized)?"
- Capture for marketing use

---

## PHASE 4: Skylight-Parity Features (Days 4-7)
*"Concept similar to Skylight tool parents are using...rewards, routines, to-do list"*

### 4.1 Visual Timer System
**File to create:** `src/components/VisualTimer.tsx`

Features:
- Circular countdown timer
- Color-coded segments (green → yellow → red)
- Audio cues at intervals
- Celebration animation on completion
- Integration with routines

### 4.2 Calm Coins System
**File to create:** `src/lib/calm-coins.ts`

System:
- Earn coins for: completing tasks (5), routines (10), goals (25), streaks (50)
- Redeem for: custom rewards (parent-set), screen time, special activities
- Visual coin counter on dashboard
- Weekly coin report

**Database table:**
```sql
CREATE TABLE calm_coins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  amount INTEGER NOT NULL,
  reason TEXT NOT NULL,
  source_type TEXT CHECK (source_type IN ('task', 'routine', 'goal', 'streak', 'bonus', 'redemption')),
  source_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  title TEXT NOT NULL,
  cost INTEGER NOT NULL,
  icon TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 4.3 Visual Schedule Builder
**File to create:** `src/components/VisualSchedule.tsx`

Features:
- Drag-and-drop routine ordering
- Picture cards for each activity
- Time blocks with visual duration
- Print-friendly view for posting
- Kid-friendly icons

### 4.4 Checklist UI
**File to create:** `src/components/ChecklistView.tsx`

Transform tasks into visual checklist:
- Large checkboxes
- Satisfying check animation
- Progress bar at top
- Celebration on all-done

---

## PHASE 5: Coverage Coach Content (Days 7-8)
*"The healthcare bridge—coverage coach, payer-ready reports, clinician viewer access"*

### 5.1 Static Educational Content
**File to create:** `src/components/CoverageCoach.tsx`

Sections:
1. **Insurance Questions Checklist** - Questions to ask your insurance
2. **CPT Codes Explained** - 97151, 97153, 97155, 97156, 97157 in plain English
3. **Appeal Template** - Copy-paste letter template
4. **Single-Case Agreement Guide** - Step-by-step instructions
5. **Medicaid Waiver Info** - State-by-state waiver overview

### 5.2 AI Letter Drafting
**File to enhance:** `src/lib/ai-conversation.ts`

Add system prompt capabilities:
- Prior authorization request letters
- Medical necessity letters
- Insurance appeal letters
- Waiver enrollment letters

### 5.3 For Paid Parent Caregivers
**File to create:** `src/components/CaregiverDocumentation.tsx`

Features:
- Time tracking for waiver documentation
- Activity log export (PDF/CSV)
- Fiscal intermediary-compatible formats
- Integration note with Acumen/PPL/CDCN

---

## PHASE 6: HSA/FSA & Payment Enhancements (Day 8)
*"Make subscription feel essential"*

### 6.1 HSA/FSA Messaging
**Files to update:** Pricing page, checkout flow

- Add "HSA/FSA Eligible" badge
- Checkout text explaining HSA/FSA cards work
- Receipt formatting for reimbursement

### 6.2 Waitlist Marketing Copy
**Files to create:** Landing page content

- "Can't wait 18 months for ABA services? Start today."
- "Early support matters. Begin building skills now."
- "Complement formal therapy when your spot opens."

---

## Implementation Priority Matrix

| Feature | Impact | Effort | Priority | When |
|---------|--------|--------|----------|------|
| Deploy secrets | High | Low | P0 | Day 1 |
| OAuth setup | High | Low | P0 | Day 1 |
| Stress tracking | High | Medium | P1 | Day 2 |
| Routine adherence | High | Medium | P1 | Day 2-3 |
| Win capture enhancement | High | Low | P1 | Day 3 |
| Celebration prompts | Medium | Low | P2 | Day 3-4 |
| Visual timer | High | Medium | P2 | Day 4-5 |
| Calm coins | Medium | High | P3 | Day 5-6 |
| Coverage coach content | Medium | Medium | P2 | Day 7 |
| Visual schedule | Medium | High | P3 | Day 7-8 |
| HSA/FSA messaging | Low | Low | P3 | Day 8 |

---

## Success Metrics (What You'll Measure)

### User Engagement
- Daily active users
- Return to companion chat rate
- Tasks completed per user per week
- Streaks > 7 days

### Outcomes (Your Differentiator)
- Average stress level (baseline vs week 4)
- Routine adherence % (week 1 vs week 4)
- Goals completed per month
- Time-to-first-goal

### Virality
- Share rate (shares per user per week)
- Referral signups
- Testimonials captured
- NPS score

### Business
- Trial-to-paid conversion
- Monthly churn rate
- LTV:CAC ratio
- Clinic inquiries

---

## Files to Create (Summary)

### New Components
1. `src/components/StressCheckIn.tsx`
2. `src/components/RoutineAdherenceTracker.tsx`
3. `src/components/WeeklyOutcomesReport.tsx`
4. `src/components/CelebrationPrompt.tsx`
5. `src/components/TestimonialCapture.tsx`
6. `src/components/VisualTimer.tsx`
7. `src/components/VisualSchedule.tsx`
8. `src/components/ChecklistView.tsx`
9. `src/components/CoverageCoach.tsx`
10. `src/components/CaregiverDocumentation.tsx`

### New Hooks
1. `src/hooks/useStressTracking.ts`
2. `src/hooks/useRoutineAdherence.ts`
3. `src/hooks/useCalmCoins.ts`

### New Lib Files
1. `src/lib/calm-coins.ts`
2. `src/lib/outcomes-calculator.ts`
3. `src/lib/celebration-triggers.ts`

### Database Migrations
1. `003_outcomes_tracking.sql` - stress_logs, routine_completions
2. `004_calm_coins.sql` - calm_coins, rewards

---

## Estimated Timeline

| Day | Focus | Deliverable |
|-----|-------|-------------|
| 1 | Deployment | MVP live, users can sign up and pay |
| 2 | Stress tracking | Daily check-ins working |
| 3 | Routine adherence + wins | Measurable outcomes + easy sharing |
| 4 | Celebrations | Auto-prompts for sharing |
| 5 | Visual timer | Skylight-like timer |
| 6 | Calm coins | Gamification system |
| 7 | Coverage coach | Insurance guidance content |
| 8 | Polish + HSA | Payment enhancements |

**Total: 8 days to feature-complete MVP with measurable outcomes**

---

## What This Gives You

1. **Proof of Value**: Measurable stress reduction + routine adherence data
2. **Virality Engine**: Easy win sharing + celebration prompts
3. **Retention Hook**: Calm coins + streaks + visual progress
4. **B2B Ready**: Outcomes data for clinic/payer conversations
5. **Differentiation**: The things ChatGPT can't do

---

## Next Steps

1. **Today**: Run Phase 1 (deployment) - 2 hours
2. **This Week**: Run Phases 2-3 (outcomes + sharing) - 2 days
3. **Next Week**: Run Phases 4-6 (Skylight parity + coverage) - 5 days
4. **Then**: User testing with Amy and 5 pilot families

Would you like me to start executing on Phase 1 right now?
