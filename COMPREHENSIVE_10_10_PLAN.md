# AMINY COMPREHENSIVE 10/10 IMPLEMENTATION PLAN

## Executive Summary

**Current State:** The codebase has excellent architecture with Phase 0 critical fixes completed. Consumer-facing features are now ~85% complete; enterprise/clinical features are 40% complete.

**Overall Score: 7/10** - Ready for soft pilot with 50-100 families

---

## PHASE 0 COMPLETION STATUS (January 25, 2026) ✅

### Completed Today:
1. **Email Service Enabled** ✅
   - Uncommented Resend integration in `email-service.ts`
   - Added graceful fallback when API key missing (logs but doesn't block)
   - Created 4 new email functions: Welcome, Re-engagement, Trial Reminder, Weekly Digest

2. **Email API Endpoints Created** ✅
   - `POST /email/welcome` - Sends welcome email after onboarding
   - `POST /email/re-engage` - Sends re-engagement emails for inactive users
   - `POST /email/trial-reminder` - Sends trial expiration reminders
   - `POST /email/weekly-digest` - Sends weekly progress summaries

3. **Retention Engine Wired** ✅
   - `triggerOnboardingSequence()` now calls real email endpoint
   - `triggerReengagementCampaign()` updated with real email endpoint
   - `sendWeeklyDigest()` wired to actual email delivery

4. **Edge Function Deployed** ✅
   - All email endpoints live on Supabase

### Required Manual Step:
```bash
# Add RESEND_API_KEY to Supabase Secrets:
# 1. Go to https://supabase.com/dashboard/project/qpzsvafwcwyrkdolrjbu/settings/secrets
# 2. Add: RESEND_API_KEY = your_resend_api_key
# 3. Get API key from https://resend.com/api-keys
```

---

---

## MULTI-STAKEHOLDER ASSESSMENT

### Current Scores by Stakeholder

| Stakeholder | Current Score | Target | Gap |
|-------------|---------------|--------|-----|
| McKinsey Consultant | 6.5/10 | 9/10 | Unit economics, fiscal agent integration |
| Venture Capitalist | 7/10 | 9/10 | Defensibility, live integrations |
| Developmental Pediatrician | 5/10 | 8/10 | Clinical validation, outcome measurement |
| BCBA | 4/10 | 9/10 | Treatment plans, data collection |
| Therapist (SLP/OT) | 6/10 | 8/10 | Session prep, parent coaching |
| Parent/Caregiver | 7.5/10 | 9.5/10 | Multi-caregiver sync, outcome proof |
| Payor/Insurance | 3/10 | 8/10 | Claims integration, utilization |
| Fiscal Agent (Acumen) | 4/10 | 9/10 | EVV compliance, API integration |
| Fiscal Agent (DCI) | 3/10 | 8/10 | Budget management, self-direction |

---

## TECHNICAL AUDIT SUMMARY

### Mobile Optimization: 7/10
- **CRITICAL:** `user-scalable=no` violates WCAG accessibility
- **HIGH:** `text-xs` overused (12px) - needs 14px minimum
- **HIGH:** No swipe gestures implemented
- **MEDIUM:** Hardcoded safe area values

### AI Integration: 8.5/10 ✅ (Updated Jan 25)
- ✅ Claude API fully configured and streaming works
- ✅ Rate limiting implemented with tier-based message limits
- ✅ Memory system working with Supabase + localStorage hybrid
- ✅ "Aminy remembers" callouts visible in chat UI
- ✅ Crisis detection implemented

### Community: 5.5/10 (Partial Fix Jan 25)
- ✅ Post/comment/like CRUD functions now exist in community.ts
- ✅ AI moderation with 12 pattern types implemented
- ⚠️ STILL localStorage only - users can't see each other's posts
- Family matching algorithm solid but no UI integration
- Local groups hardcoded (5 metros only)

### Provider Portal: 5.6/10
- **CRITICAL:** Credentialing workflow missing (3/10)
- **CRITICAL:** Payment processing incomplete (4/10)
- Secure messaging excellent (8/10)
- No clinical data collection

### Retention: 8/10 ✅ (Updated Jan 25)
- ✅ Push notifications infrastructure working
- ✅ Email automation now triggered on onboarding completion
- ✅ Morning Mission system implemented and integrated
- ✅ Streak warning system with 3-level urgency (critical/warning/gentle)
- Streak system good but rewards could be stronger

---

## MUST FIX (Before Any Pilot)

### 1. Configure AI Environment (Day 1)
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-key-here
VITE_SENTRY_DSN=https://...
```

### 2. Fix Rate Limiting (Day 1)
```typescript
// EnhancedAskAminy.tsx line 144
// CHANGE FROM:
const canSendMessage = true;
// TO:
const canSendMessage = memoryManager.canSendMessage(childId, userTier);
```

### 3. Fix Accessibility (Day 1)
```html
<!-- index.html line 6 - REMOVE user-scalable=no -->
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
```

### 4. Fix Community Imports (Day 2)
Create actual CRUD functions in community.ts:
- `createPost()`
- `likePost()`
- `addComment()`
- Wire to Supabase backend

### 5. Enable Push Notifications (Day 2)
- Configure VAPID keys in Supabase
- Wire `triggerOnboardingSequence()` to signup handler
- Test push delivery on real devices

---

## SHOULD FIX (Before Launch)

### Phase 1: Consumer Experience (Week 1-2)

| Task | Impact | Effort |
|------|--------|--------|
| Wire email automation to signup flow | +8% retention | 2 days |
| Add streak expiry warning (8 PM nudge) | +12% D1 retention | 1 day |
| Implement first achievement badges | +5% engagement | 2 days |
| Fix text-xs to text-sm on mobile | Accessibility | 1 day |
| Add swipe gestures for nav | UX polish | 2 days |
| Create morning mission system | +15% DAU | 3 days |

### Phase 2: Provider Tools (Week 3-4)

| Task | Impact | Effort |
|------|--------|--------|
| Build ABA data collection forms | Clinical readiness | 5 days |
| Add treatment plan editor | BCBA adoption | 5 days |
| Implement credentialing workflow | Compliance | 3 days |
| Wire payment/payout processing | Revenue | 3 days |
| Create session notes templates | Therapist adoption | 2 days |

### Phase 3: Enterprise Integration (Week 5-8)

| Task | Impact | Effort |
|------|--------|--------|
| Complete EVV GPS accuracy | Medicaid compliance | 5 days |
| Build Acumen/DCI API integration | Fiscal agent revenue | 10 days |
| Add claims submission workflow | Insurance revenue | 5 days |
| Create outcome attribution model | Clinical proof | 5 days |
| Multi-child family mode | Market expansion | 3 days |

---

## NICE TO HAVE (Post-Launch)

- Social proof leaderboards
- Video coaching for parent training
- Pediatrician EHR integration
- Adaptive difficulty for routines
- Child-facing dashboard
- Advanced outcome prediction ML
- White-label for clinics/schools

---

## PRICING/TIER ASSESSMENT

### Current Tiers (Correct Strategy)

| Tier | Price | Key Value | Score |
|------|-------|-----------|-------|
| Free | $0 | 5 messages/day, no memory | 8/10 - Good hook |
| Starter | $6.99 | 20 messages, 30-day memory | 7/10 - Weak middle tier |
| Core | $14.99 | Unlimited, 90-day memory, vault | 9/10 - Best value |
| Pro | $29.99 | Expert sessions, unlimited everything | 8/10 - Clear upgrade |
| Pro+ | $49.99 | Family plan, analytics | 7/10 - Enterprise-ish |

### Recommended Changes
1. **Strengthen Starter → Core upgrade path:** Show memory preview ("Here's what Pro would remember about Emma")
2. **Add urgency:** "Daily messages reset at midnight" timer
3. **B2B2C tier missing:** Add School/Clinic edition at $19.99/seat

---

## RETENTION STRATEGY

### Current State: Users Sign Up → Don't Return

**Root Causes:**
1. No morning anchor ritual
2. Push notifications dormant
3. Email automation not triggered
4. Streak has no teeth (no "lose it" fear)
5. Achievement system incomplete

### Target State: Daily Habit Loop

```
6 AM → Push: "Good morning! Emma's routine starts in 30 min"
       ↓
User Opens → Sees "Today's Mission" + streak at risk warning
       ↓
Completes 1 task → Celebration + "1 more to save streak!"
       ↓
7 PM → Push: "Evening check-in time"
       ↓
Day 7 → Email: "Your weekly wins" + progress report
       ↓
Day 30 → Badge: "Calm Parent Champion" + share to social
```

### Implementation Priority

1. **Week 1:** Wire push + email automation
2. **Week 2:** Morning mission system + streak warnings
3. **Week 3:** Achievement badges + early wins
4. **Week 4:** Predictive upgrade nudges + social proof

---

## FISCAL AGENT INTEGRATION STRATEGY

### Best/Easiest Path for AACT/RISE/Acumen/DCI

**Reality Check:** Direct API integration requires:
- SOC2 certification ($15-50K audit)
- State-specific compliance review
- 6-12 month approval timeline
- Technical certification per aggregator

**Recommended Approach:**

#### Phase 1: Timesheet Export (Now)
- Generate compliant PDF timesheets
- Include all EVV data fields
- Parent can manually submit to fiscal agent portal
- **Revenue:** Charge for SuperBill generation ($2.99/export or included in Pro)

#### Phase 2: Portal Automation (3 months)
- Build browser extension/instructions for auto-filling fiscal agent portals
- Step-by-step guides for each major agent
- **Revenue:** Premium feature in Pro tier

#### Phase 3: Direct API (6-12 months)
- Start with Acumen (largest, most technical)
- Pursue formal API partnership
- Potential revenue share model
- **Revenue:** $X per successful submission + % of caregiver wages

### Fiscal Agent Revenue Model

| Revenue Stream | Timeline | Est. Revenue |
|---------------|----------|--------------|
| SuperBill PDF export | Now | $5/mo/user avg |
| EVV compliance tools | Now | Included in Core+ |
| Portal automation guides | Month 3 | Premium feature |
| Direct submission API | Month 12 | $2-5 per submission |
| Revenue share with agents | Month 18 | 0.5-1% of wages |

---

## CLINICAL OUTCOMES PLAN

### Current Gap
- Outcome metrics are mock/aspirational
- No validated instruments
- No attribution to intervention

### Target State
1. **Validated Instruments:** SDQ, CARS, M-CHAT integration
2. **Serial Assessment:** Track scores over time
3. **Outcome Attribution:** "82% of families using routine tools 3x/week showed 12-point improvement"
4. **Provider Reports:** Auto-generate progress summaries for pediatricians

### Pilot Design (100 families, 12 weeks)

**Week 0:** Baseline assessment (SDQ-Parent, custom routine scale)
**Week 4:** Check-in assessment
**Week 8:** Check-in assessment
**Week 12:** Final assessment + NPS

**Success Metrics:**
- 25% improvement in routine adherence
- 15% reduction in parent stress (PSI)
- 60% D30 retention
- NPS > 50

---

## COMPETITIVE DIFFERENTIATION

### vs. Forta/Elemy

| Feature | Aminy | Forta | Elemy |
|---------|-------|-------|-------|
| AI Companion | Real Claude + Memory | Basic chatbot | None |
| EVV Tools | Built-in | Separate app | None |
| Community | Family matching | Forums | None |
| Medicaid Support | Core focus | Afterthought | Private pay only |
| Price | $14.99/mo | $99+/mo | $150+/mo |

**Forta's $99/mo "Real AI":** Marketing. They use standard AI without the memory/personalization system we've built. Our advantage is the context engine + memory that makes AI feel like it knows your child.

### Defensible Moats (Timeline to Build)

1. **Data Moat (6-12 months):** Outcome data showing which interventions work
2. **Regulatory Moat (12 months):** EVV compliance + fiscal agent certifications
3. **Network Effect (18 months):** Parents → Providers → Clinics ecosystem

---

## IMMEDIATE NEXT STEPS

### This Week

| Day | Task | Owner |
|-----|------|-------|
| Mon | Configure env vars, fix rate limiting | Dev |
| Mon | Fix accessibility (user-scalable) | Dev |
| Tue | Wire push notifications | Dev |
| Tue | Create community CRUD functions | Dev |
| Wed | Test AI end-to-end on production | QA |
| Thu | Add email automation to signup | Dev |
| Fri | Deploy and verify on mobile devices | QA |

### This Month

1. Complete Phase 1 consumer fixes
2. Begin provider tools (treatment plan editor)
3. Design pilot program structure
4. Identify 10 beta families for feedback

### This Quarter

1. Launch pilot with 100 families
2. Complete provider portal
3. Begin fiscal agent conversations
4. Publish initial outcome data

---

## RESOURCE REQUIREMENTS

### Engineering (to reach 9/10)
- **Frontend:** 4 weeks focused work
- **Backend:** 6 weeks (Supabase functions, APIs)
- **Mobile:** 2 weeks (swipe, native features)

### Clinical (to validate)
- **Advisory Board:** 1 pediatrician, 1 BCBA, 1 SLP
- **Pilot Coordinator:** Part-time for 12 weeks
- **Assessment Tools:** License SDQ, potentially CARS

### Business Development
- **Fiscal Agent Partnerships:** 2-3 initial conversations
- **Insurance Pilot:** 1 regional Medicaid MCO
- **Clinic Partnerships:** 2-3 ABA clinics for provider feedback

---

## SUCCESS CRITERIA

### For Pilot
- 100 families enrolled
- 60% D30 retention
- 80% complete onboarding
- NPS > 50
- 1 measurable outcome improvement

### For Launch
- All stakeholder scores > 7/10
- Push/email automation working
- Provider portal clinically usable
- EVV compliant for 3 states
- $10K MRR target

### For Series A
- 1,000+ paying users
- 70% D30 retention
- Clinical outcome data published
- 1 fiscal agent integration live
- $100K MRR

---

## APPENDIX: File-by-File Fixes

### Critical Files to Modify

1. **EnhancedAskAminy.tsx:144** - Re-enable rate limiting
2. **index.html:6** - Remove user-scalable=no
3. **.env.local** - Add all required env vars
4. **community.ts** - Add createPost, likePost, addComment functions
5. **retention-engine.ts** - Wire triggerOnboardingSequence to signup
6. **memory-system.ts** - Connect to Supabase backend
7. **caregiver-db.ts** - Fix GPS accuracy issues

### New Files to Create

1. **src/lib/email-automation.ts** - Email sequence execution
2. **src/components/TreatmentPlanEditor.tsx** - BCBA tool
3. **src/components/ABADataCollection.tsx** - Session data entry
4. **src/lib/fiscal-agent-api.ts** - Acumen/DCI integration
5. **src/components/CredentialingFlow.tsx** - Provider verification

---

*Generated: January 2025*
*Status: Ready for Implementation*
