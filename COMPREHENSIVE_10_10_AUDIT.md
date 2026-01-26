# AMINY 10/10 PRODUCTION AUDIT & IMPLEMENTATION PLAN

## Executive Summary

**Current State: 7.5/10** (Good architecture, significant gaps in execution)

Based on a comprehensive multi-agent audit of the entire codebase, this document provides:
1. Detailed stakeholder assessments
2. Complete gap analysis
3. Prioritized implementation plan
4. File-level action items

---

## PART 1: MULTI-STAKEHOLDER ASSESSMENT

### 1. McKinsey Consultant View: 6.5/10

**Strengths:**
- Clear tier monetization strategy ($14.99 → $29.99 → $49.99)
- Unit economics tracking infrastructure exists
- B2B tier definitions in place

**Critical Gaps:**
- Admin dashboard has HARDCODED metrics (lines 333-368 in AdminPortal.tsx)
- Top intents, peak hours, satisfaction scores are fake percentages
- Marketplace metrics all zeros - no actual tracking
- B2B metrics completely unimplemented
- No real A/B testing despite infrastructure existing

**Path to 10/10:**
1. Replace hardcoded admin metrics with real Supabase queries
2. Implement intent classification on messages
3. Build marketplace analytics (bookings, revenue, ratings)
4. Create B2B partnership tracking tables

---

### 2. Venture Capitalist View: 6/10

**Strengths:**
- Strong TAM ($15B+ autism services market)
- Clear value proposition vs Forta ($14.99 vs $99)
- Memory/personalization as moat

**Critical Gaps:**
- Retention data is approximated, not measured
- Revenue tracking not wired (Stripe connected but not reporting)
- No cohort analysis capability
- Referral loop exists but not integrated into flows
- User acquisition cost unknown

**Path to 10/10:**
1. Wire Stripe webhook for real revenue tracking
2. Build cohort retention views (D1, D7, D30)
3. Integrate referral into post-onboarding and paywall
4. Add acquisition channel tracking
5. Create investor dashboard with real metrics

---

### 3. Developmental Pediatrician View: 7/10

**Strengths:**
- Comprehensive child profile structure (diagnoses, conditions, IEP goals)
- M-CHAT-R/F screening tool implemented
- Care plan documentation exists

**Critical Gaps:**
- No ASQ-3/ASQ:SE-2 validated instruments
- Developmental milestone tracking basic
- No standardized assessment scoring
- Clinical notes don't auto-generate from AI conversations

**Path to 10/10:**
1. Add ASQ-3, PEDS, and other validated screeners
2. Implement standardized developmental milestone checklist
3. Auto-generate visit summaries from AI conversations
4. Add referral packet export for specialists

---

### 4. BCBA View: 7.5/10

**Strengths:**
- ABC Data Collection component EXISTS and SAVES TO SUPABASE
- Treatment Plan Editor FULLY FUNCTIONAL
- Session Notes with SOAP format WORKING
- Goal tracking with baseline/mastery criteria

**Critical Gaps:**
- No BIP (Behavior Intervention Plan) template
- ABC data visualization limited (no trend graphs)
- No automatic skill acquisition tracking
- Trial-by-trial data collection missing
- No interobserver agreement (IOA) tools

**Path to 10/10:**
1. Add BIP template with replacement behaviors
2. Build ABC trend visualization (frequency over time)
3. Add trial-by-trial discrete trial training (DTT) tracker
4. Implement skill acquisition programs with targets
5. Add IOA calculation tool

---

### 5. Therapist (SLP/OT/PT) View: 6.5/10

**Strengths:**
- Session notes template supports therapy disciplines
- Provider portal allows patient viewing
- Secure messaging exists

**Critical Gaps:**
- No "Since Last Session" AI summary
- No therapy-specific goal templates (articulation, sensory, motor)
- No homework assignment tracking
- No parent training video library
- Progress notes don't differentiate by discipline

**Path to 10/10:**
1. Add discipline-specific goal banks
2. Build "What happened since last session" AI digest
3. Create homework assignment tracker
4. Add video demo library for home exercises
5. Discipline-specific progress note templates

---

### 6. Parent/Caregiver (Mom) View: 8/10

**Strengths:**
- Onboarding feels personalized and warm
- Quick Win tip delivered in ~3 minutes
- Streaks provide gamification
- Community exists for peer support
- Dark/light/system theme support

**Critical Gaps:**
- Community Feed has ZERO DARK MODE (completely broken in dark)
- No "what to do TODAY" morning briefing
- No meal/sleep/mood tracking integration
- Push notifications may not actually be firing
- Referral rewards not visible in app

**Path to 10/10:**
1. FIX Community Feed dark mode (CRITICAL)
2. Add daily morning mission with prioritized tasks
3. Integrate sleep/meal tracking or connect to apps
4. Verify push notifications actually send
5. Add referral progress tracker to dashboard

---

### 7. Payor/Insurance View: 5/10

**Strengths:**
- Availity integration research documented
- Insurance verification UI exists
- Fiscal agent export templates (Acumen, DCI, PPL)

**Critical Gaps:**
- No actual claims submission
- No CPT code tracking per session
- No authorization management
- No outcomes data for value-based contracting
- No cost-savings evidence generation

**Path to 10/10:**
1. Wire Availity API for real eligibility checks
2. Implement claims submission workflow
3. Add CPT code assignment to sessions (97151-97158)
4. Build outcomes report generator for payors
5. Create cost-savings calculator (AI hours vs BCBA hours)

---

### 8. Acumen/DCI/SpokChoice (Fiscal Agent) View: 7/10

**Strengths:**
- Fiscal Agent Export component EXISTS
- PDF timesheet generation with service codes
- ABA billing codes properly mapped (97151-97158)
- Provider NPI and credential tracking

**Critical Gaps:**
- No direct EDI submission
- No budget tracking (remaining hours per child)
- No authorization tracking
- No electronic timesheet approval workflow

**Path to 10/10:**
1. Add authorization hours tracking
2. Build budget remaining calculator
3. Create approval workflow (parent → supervisor)
4. Add direct submission API integration

---

## PART 2: TECHNICAL AUDIT FINDINGS

### A. AI/Memory System: 7.5/10

**What Works:**
- ✅ Claude API integration REAL (makes actual HTTP calls)
- ✅ Streaming responses working
- ✅ Crisis detection comprehensive
- ✅ Rate limiting dual-layer (client + server)

**CRITICAL ISSUE - MEMORY SPLIT:**
- `conversation-memory.ts` → Supabase persistence
- `memory-system.ts` → localStorage ONLY
- **These two systems don't sync - data loss risk**

**Missing:**
- ❌ No visible "Aminy remembers" indicator in UI
- ❌ Memory facts extracted locally, not from AI analysis
- ❌ Daily message reset uses UTC, not user timezone

---

### B. Provider/Admin Systems: 6.5/10

**What Works:**
- ✅ Provider Portal - FULLY WIRED to Supabase
- ✅ ABC Data Collection - SAVES TO SUPABASE
- ✅ Treatment Plans - FULL CRUD working
- ✅ Session Notes - PERSISTS correctly
- ✅ Community - Supabase with localStorage fallback

**CRITICAL ISSUES:**

1. **Admin Dashboard Fake Data (AdminPortal.tsx:332-374):**
   - Top intents: HARDCODED percentages (26%, 18%, etc.)
   - Peak hours: HARDCODED array [9, 19, 21]
   - Goal progress: HARDCODED 45.3%
   - Satisfaction: HARDCODED 4.5
   - Marketplace metrics: ALL ZEROS
   - B2B metrics: ALL ZEROS

2. **Telehealth BROKEN:**
   - Daily.co API key NOT CONFIGURED
   - Default: MOCK DATA (`USE_MOCK_DATA = true`)
   - Video room URLs are FAKE
   - Appointments in localStorage only, not Supabase

---

### C. Mobile/UX: 7/10

**What Works:**
- ✅ Viewport meta correct
- ✅ Safe area insets implemented
- ✅ Most touch targets 44px+
- ✅ Dashboard has dark mode
- ✅ Onboarding has dark mode

**CRITICAL ISSUES:**

1. **CommunityFeed.tsx - ZERO dark mode classes**
   - Completely unusable in dark mode
   - Hard-coded colors: `text-gray-900`, `bg-gradient-to-br from-green-50`

2. **CarePagePro.tsx - ZERO dark mode classes**
   - Care plan tab broken in dark mode

3. **PaywallScreen.tsx - Still shows "Starter" tier**
   - Starter deprecated but still displayed (lines 61-68)

---

### D. Retention Systems: 6/10

**What Works:**
- ✅ Streaks persist to Supabase
- ✅ Push notification infrastructure ready
- ✅ Email digest template exists
- ✅ Referral program configured

**CRITICAL ISSUES:**

1. **Push Notifications May Not Fire:**
   - Edge function endpoint wired but untested
   - No verification of actual delivery
   - Daily check-ins not auto-triggered

2. **Email Sequences Not Wired:**
   - Weekly digest exists but no UI to enable
   - No onboarding confirmation email
   - No re-engagement campaigns

3. **Referral Not Integrated:**
   - Program exists but not in paywall
   - No post-purchase thank you with referral
   - No referral progress in dashboard

---

## PART 3: PRIORITIZED IMPLEMENTATION PLAN

### PHASE 1: CRITICAL FIXES (Must Fix for Pilot) - 3-5 Days

| # | Task | File | Priority | Est. Time |
|---|------|------|----------|-----------|
| 1 | **Fix CommunityFeed dark mode** | CommunityFeed.tsx | CRITICAL | 2 hours |
| 2 | **Fix CarePagePro dark mode** | CarePagePro.tsx | CRITICAL | 2 hours |
| 3 | **Remove Starter from PaywallScreen** | PaywallScreen.tsx | HIGH | 30 min |
| 4 | **Unify memory systems** | memory-system.ts, conversation-memory.ts | CRITICAL | 4 hours |
| 5 | **Add "Aminy remembers" indicator** | PersistentAskAminy.tsx | HIGH | 1 hour |
| 6 | **Set DAILY_API_KEY in Supabase** | Supabase Dashboard | CRITICAL | 10 min |
| 7 | **Set VITE_USE_MOCK_DATA=false** | .env.production | CRITICAL | 5 min |
| 8 | **Wire telehealth to Supabase** | telehealth-api.ts | CRITICAL | 4 hours |
| 9 | **Test push notifications end-to-end** | push-notifications.ts | HIGH | 2 hours |
| 10 | **Wire email digest to Settings** | SettingsPage.tsx | HIGH | 1 hour |

---

### PHASE 2: ADMIN & ANALYTICS (For Pilot Visibility) - 5-7 Days

| # | Task | File | Priority | Est. Time |
|---|------|------|----------|-----------|
| 11 | **Replace hardcoded top intents** | AdminPortal.tsx:333-338 | HIGH | 4 hours |
| 12 | **Calculate real peak usage hours** | AdminPortal.tsx:340 | HIGH | 2 hours |
| 13 | **Wire marketplace metrics** | AdminPortal.tsx:356-368 | HIGH | 4 hours |
| 14 | **Add feedback table for satisfaction** | Supabase + AdminPortal.tsx | MEDIUM | 3 hours |
| 15 | **Wire B2B metrics** | AdminPortal.tsx:369-374 | MEDIUM | 4 hours |
| 16 | **Add Stripe revenue tracking** | Analytics integration | HIGH | 4 hours |
| 17 | **Build cohort retention view** | New AdminCohorts.tsx | HIGH | 8 hours |
| 18 | **Add A/B test results dashboard** | ab-testing.ts integration | MEDIUM | 4 hours |

---

### PHASE 3: CLINICAL ENHANCEMENTS (For BCBA/Therapist) - 1-2 Weeks

| # | Task | File | Priority | Est. Time |
|---|------|------|----------|-----------|
| 19 | **Add BIP template** | New BehaviorInterventionPlan.tsx | HIGH | 8 hours |
| 20 | **ABC trend visualization** | ABCDataCollection.tsx | HIGH | 6 hours |
| 21 | **Since Last Session AI digest** | New SessionPrep.tsx | HIGH | 6 hours |
| 22 | **Discipline-specific goal banks** | treatment-goals.ts | MEDIUM | 4 hours |
| 23 | **Add ASQ-3 screener** | ScreeningTools.tsx | MEDIUM | 4 hours |
| 24 | **Homework assignment tracker** | New HomeworkTracker.tsx | MEDIUM | 4 hours |
| 25 | **Trial-by-trial DTT tracker** | New DiscreteTrialData.tsx | LOW | 8 hours |

---

### PHASE 4: RETENTION & VIRALITY (For Growth) - 1-2 Weeks

| # | Task | File | Priority | Est. Time |
|---|------|------|----------|-----------|
| 26 | **Daily morning mission briefing** | Dashboard10.tsx | HIGH | 4 hours |
| 27 | **Referral progress in dashboard** | ReferralDashboard.tsx | HIGH | 2 hours |
| 28 | **Referral in post-onboarding** | OnboardingEnhanced.tsx | HIGH | 2 hours |
| 29 | **Referral in paywall** | PaywallScreen.tsx | MEDIUM | 2 hours |
| 30 | **Thank you page with share** | New ThankYouPage.tsx | MEDIUM | 4 hours |
| 31 | **Streak milestone celebrations** | Dashboard celebration | MEDIUM | 2 hours |
| 32 | **Re-engagement email campaign** | emailDigest.ts expansion | MEDIUM | 4 hours |
| 33 | **Daily check-in auto-trigger** | push-notifications.ts | HIGH | 2 hours |

---

### PHASE 5: PAYOR/FISCAL AGENT (For Revenue) - 2-3 Weeks

| # | Task | File | Priority | Est. Time |
|---|------|------|----------|-----------|
| 34 | **Wire Availity eligibility API** | insurance-verification.ts | HIGH | 8 hours |
| 35 | **Claims submission workflow** | New ClaimsSubmission.tsx | HIGH | 16 hours |
| 36 | **CPT code assignment to sessions** | SessionNotes.tsx | MEDIUM | 4 hours |
| 37 | **Authorization tracking** | New AuthorizationManager.tsx | MEDIUM | 8 hours |
| 38 | **Budget remaining calculator** | FiscalAgentExport.tsx | MEDIUM | 4 hours |
| 39 | **Outcomes report for payors** | New PayorOutcomes.tsx | LOW | 8 hours |

---

## PART 4: COMPLETE ISSUE LIST BY SEVERITY

### CRITICAL (Blocks Production)

| # | Issue | File:Line | Action |
|---|-------|-----------|--------|
| 1 | CommunityFeed ZERO dark mode | CommunityFeed.tsx:* | Add dark: classes throughout |
| 2 | CarePagePro ZERO dark mode | CarePagePro.tsx:* | Add dark: classes throughout |
| 3 | Memory systems don't sync | memory-system.ts vs conversation-memory.ts | Unify to single Supabase system |
| 4 | Daily.co API key not set | Supabase secrets | Set DAILY_API_KEY |
| 5 | Telehealth uses mock data | telehealth-api.ts:32-34 | Set VITE_USE_MOCK_DATA=false |
| 6 | Video appointments in localStorage only | telehealth-api.ts:502-532 | Wire to Supabase |

### HIGH (Degrades Experience)

| # | Issue | File:Line | Action |
|---|-------|-----------|--------|
| 7 | No "Aminy remembers" indicator | PersistentAskAminy.tsx | Add memory callout UI |
| 8 | Admin intents hardcoded | AdminPortal.tsx:333-338 | Query real message content |
| 9 | Admin peak hours hardcoded | AdminPortal.tsx:340 | Calculate from timestamps |
| 10 | Admin satisfaction hardcoded | AdminPortal.tsx:332 | Add feedback table |
| 11 | Admin marketplace all zeros | AdminPortal.tsx:356-368 | Wire booking queries |
| 12 | Push notifications untested | push-notifications.ts | End-to-end test |
| 13 | Email digest not wirable | SettingsPage.tsx | Add toggle UI |
| 14 | Starter tier still in paywall | PaywallScreen.tsx:61-68 | Remove Starter option |
| 15 | Rate limit uses UTC only | rate-limiter.ts:227-237 | Support user timezone |

### MEDIUM (Should Fix)

| # | Issue | File:Line | Action |
|---|-------|-----------|--------|
| 16 | Referral not in paywall | PaywallScreen.tsx | Add referral link |
| 17 | No referral progress display | Dashboard10.tsx | Add referral widget |
| 18 | Admin B2B metrics zeros | AdminPortal.tsx:369-374 | Create partnership tables |
| 19 | No cohort retention view | AdminPortal.tsx | Build cohort component |
| 20 | No morning briefing | Dashboard10.tsx | Add daily mission |
| 21 | No BIP template | Missing | Create BIP component |
| 22 | No ABC trend visualization | ABCDataCollection.tsx | Add chart component |
| 23 | Small touch targets | ABCDataCollection.tsx | Increase to 44px |
| 24 | Horizontal scroll issues | CommunityFeed.tsx:157 | Add touch-pan-y |

### LOW (Nice to Have)

| # | Issue | File:Line | Action |
|---|-------|-----------|--------|
| 25 | No ASQ-3 screener | ScreeningTools.tsx | Add validated instrument |
| 26 | No therapy goal banks | treatment-goals.ts | Add discipline templates |
| 27 | No homework tracker | Missing | Create component |
| 28 | No session prep AI digest | Missing | Create component |
| 29 | Onboarding lacks celebration | OnboardingEnhanced.tsx | Add confetti |
| 30 | Tone selector preview | OnboardingEnhanced.tsx | Show message examples |

---

## PART 5: VERIFICATION CHECKLIST

### Pre-Launch Verification

- [ ] Dark mode: Navigate ALL screens with dark theme enabled
- [ ] Telehealth: Complete a real video call end-to-end
- [ ] AI Memory: Have multi-day conversation, verify context retained
- [ ] Push: Receive actual push notification on mobile device
- [ ] Email: Receive actual email from Aminy
- [ ] Payments: Complete Stripe checkout flow
- [ ] Community: Post visible to other users
- [ ] Referral: Generate and share link, verify signup attribution

### Pilot Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Onboarding completion | 85%+ | profiles.onboarding_completed |
| D7 retention | 60%+ | daily_active_users/signups |
| D30 retention | 45%+ | daily_active_users/signups |
| AI satisfaction | 4.5/5 | feedback table average |
| NPS | 55+ | survey responses |
| Trial → Paid | 30%+ | Stripe conversions |
| Messages/user/day | 5+ | messages table count |
| Referral rate | 20%+ | referrals/active_users |

---

## PART 6: FILE PATH REFERENCE

### Critical Files to Fix

```
/src/components/CommunityFeed.tsx - NEEDS DARK MODE
/src/components/CarePagePro.tsx - NEEDS DARK MODE
/src/components/PaywallScreen.tsx - REMOVE STARTER
/src/components/AdminPortal.tsx - FIX HARDCODED DATA
/src/components/PersistentAskAminy.tsx - ADD MEMORY INDICATOR
/src/lib/memory-system.ts - UNIFY WITH SUPABASE
/src/lib/telehealth-api.ts - WIRE TO SUPABASE
/src/lib/push-notifications.ts - VERIFY SENDING
```

### Already Working Files (No Changes Needed)

```
/src/components/ProviderPortal.tsx - ✅ FULLY WIRED
/src/components/ABCDataCollection.tsx - ✅ SAVES TO SUPABASE
/src/components/TreatmentPlanEditor.tsx - ✅ FULL CRUD
/src/components/SessionNotes.tsx - ✅ PERSISTS
/src/components/ScreeningTools.tsx - ✅ M-CHAT WORKING
/src/lib/claude-client.ts - ✅ REAL API CALLS
/src/lib/community.ts - ✅ SUPABASE PERSISTENCE
```

---

## CONCLUSION

**Current State: 7.5/10**

The architecture and vision are excellent. The gaps are primarily:
1. Dark mode not applied everywhere
2. Admin metrics hardcoded
3. Telehealth not properly configured
4. Memory systems split
5. Retention features not fully wired

**Estimated Time to 10/10: 4-6 weeks of focused development**

Priority order:
1. **Week 1**: Critical fixes (dark mode, telehealth, memory)
2. **Week 2**: Admin analytics and metrics
3. **Week 3**: Clinical enhancements
4. **Week 4**: Retention and virality
5. **Week 5-6**: Payor/fiscal agent features

With these fixes, Aminy will be a **world-class autism support platform** ready for pilot and scale.
