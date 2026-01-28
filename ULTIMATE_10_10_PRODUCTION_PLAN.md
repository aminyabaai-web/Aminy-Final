# AMINY ULTIMATE 10/10 PRODUCTION READINESS PLAN

**Date:** January 28, 2026
**Assessment By:** Multi-Stakeholder Deep Dive
**Current Overall Score:** 8.2/10 (Significant Progress, Critical Gaps Remain)
**Target:** 10/10 Production-Ready for Real Pilot with Clinical Outcomes

---

## EXECUTIVE SUMMARY

Aminy has made **significant progress** with 25+ screens, real AI integration, comprehensive feature set, and thoughtful architecture. However, to achieve **true 10/10 quality** that would earn investment, clinical validation, and viral growth, specific gaps must be addressed.

**Key Finding:** The architecture and vision are excellent. The remaining work is primarily:
1. **Visual polish & consistency** (dark mode, mobile optimization)
2. **Real data wiring** (admin metrics, marketplace, B2B)
3. **AI memory verification** (persistence across sessions)
4. **Viral/retention mechanics** (referral integration, engagement loops)
5. **Pixel-perfect elegance** (Calm/Headspace/Apple level)

---

## PART 1: MULTI-STAKEHOLDER ASSESSMENT (Fresh Deep Dive)

### 1. McKINSEY CONSULTANT VIEW: 7.5/10

**What Works:**
- Clear tier monetization strategy ($14.99 → $29.99 → $49.99)
- Well-defined value proposition vs Forta ($14.99 vs $99)
- B2B tier definitions exist (School, Clinic, Agency)
- HSA/FSA eligibility highlighted

**Critical Gaps:**
- **Admin metrics partially hardcoded** - `topIntents` are calculated from conversation count ratios (lines 333-339), `peakUsageHours` hardcoded [9, 19, 21], `avgResponseSatisfaction` hardcoded 4.5
- **NPS data is mock** - score 72, promoters/passives/detractors calculated from family count, not real surveys
- **Marketplace metrics all zeros** - no actual booking data
- **B2B metrics all zeros** - no clinic/provider tracking
- **No A/B testing execution** despite infrastructure existing

**Path to 10/10:**
```
1. Wire NPS survey collection (modal after 7 days, store in Supabase)
2. Build intent classification from actual message content (use Claude to classify)
3. Calculate peak hours from actual message timestamps
4. Create marketplace booking flow that stores real data
5. Build B2B onboarding with organization/seat tracking
```

---

### 2. VENTURE CAPITALIST VIEW: 7.0/10

**What Works:**
- Strong TAM ($15B+ autism services market)
- Clear differentiation from Forta (price, self-directed, waiver support)
- Memory/personalization as technical moat
- Real AI integration with Claude (not fake responses)

**Critical Gaps:**
- **Viral coefficient not tracked** (k-factor unknown)
- **Referral not integrated into key flows** (not in paywall, not post-onboarding prominently)
- **Retention data approximated** (weekly/monthly retention calculated from profile updates, not actual logins)
- **Revenue tracking not wired** (Stripe connected but no dashboard reporting)
- **CAC unknown** - no acquisition channel tracking

**Path to 10/10:**
```
1. Add viral k-factor calculation: k = invites_sent × conversion_rate
2. Integrate referral prominently: post-onboarding, paywall footer, share wins
3. Build proper retention tracking: D1, D7, D30 cohort analysis
4. Wire Stripe webhook for real-time revenue dashboard
5. Add UTM parameter tracking for acquisition channels
```

---

### 3. DEVELOPMENTAL PEDIATRICIAN VIEW: 8.5/10

**What Works:**
- Comprehensive child profile structure (diagnoses, conditions, IEP goals)
- M-CHAT-R/F screening tool implemented
- Care plan documentation exists
- AI knows child context deeply (age, diagnoses, communication level, sensory profile)
- Developmental milestone awareness in AI prompts

**Critical Gaps:**
- **No ASQ-3/ASQ:SE-2** validated instruments
- **No GAD-7** anxiety screening (mentioned in plan but not implemented)
- **Clinical notes don't auto-generate** from AI conversations
- **No referral packet export** for specialists
- **EHR integration** not present (Athena, Epic)

**Path to 10/10:**
```
1. Add ASQ-3 screener (validated developmental assessment)
2. Add GAD-7 anxiety screening
3. Build "Session Summary" export from AI conversations
4. Create referral packet generator (PDF with history, goals, progress)
5. Document EHR integration roadmap (Epic FHIR API)
```

---

### 4. BCBA VIEW: 8.0/10

**What Works:**
- ABC Data Collection component with Supabase persistence
- Treatment Plan Editor fully functional
- Session Notes with SOAP format
- Goal tracking with baseline/mastery criteria
- Provider portal with patient roster

**Critical Gaps:**
- **No BIP (Behavior Intervention Plan)** template
- **No interval recording** (partial, fixed in recent update)
- **ABC trend visualization** limited (no frequency-over-time graphs)
- **No skill acquisition programs** with targets
- **No IOA (Interobserver Agreement)** calculation

**Path to 10/10:**
```
1. Add BIP template with replacement behaviors
2. Build ABC frequency chart (line graph over days/weeks)
3. Add skill acquisition tracker with discrete trial data
4. Implement IOA calculation tool
5. Add parent fidelity checklists
```

---

### 5. THERAPIST (SLP/OT/PT) VIEW: 7.5/10

**What Works:**
- Session notes template supports therapy disciplines
- Provider portal allows patient viewing
- Secure HIPAA-compliant messaging
- Living intake document (Insight Navigator)

**Critical Gaps:**
- **No "Since Last Session" AI summary** for providers
- **No discipline-specific goal banks** (articulation, sensory, motor)
- **No homework assignment tracker**
- **No parent training video library**
- **Progress notes don't differentiate** by discipline

**Path to 10/10:**
```
1. Build "Session Prep" with AI summary of parent interactions since last visit
2. Add discipline-specific goal templates
3. Create homework tracker with completion status
4. Curate video demo library for home exercises
5. Add discipline-specific note templates (SLP, OT, PT, BCBA)
```

---

### 6. PARENT/CAREGIVER (MOM) VIEW: 8.5/10

**What Works:**
- Onboarding feels personalized and warm (tone selection, quick win)
- Morning Mission feature for daily guidance
- Streaks provide gamification
- Community exists for peer support
- Dark/light/system theme support
- Pull-to-refresh and swipe navigation

**Critical Gaps:**
- **Some screens lack full dark mode** (9 dark: classes in CommunityFeed, but not comprehensive)
- **No morning briefing push notification** (feature exists but push may not fire)
- **No meal/sleep/mood integration** with external apps
- **Referral rewards not visible** in app
- **Empty states missing** in some areas

**Path to 10/10:**
```
1. Full dark mode audit - ensure every component has dark: variants
2. Test push notifications end-to-end (send real notification to device)
3. Add "Today's Focus" morning push with personalized content
4. Add referral progress tracker to dashboard
5. Implement empty state component system-wide
```

---

### 7. PAYOR/INSURANCE VIEW: 6.5/10

**What Works:**
- Availity integration research documented
- Insurance verification UI exists
- Fiscal agent export templates (Acumen, DCI, PPL)
- CPT codes properly mapped (97151-97158)
- Provider NPI tracking

**Critical Gaps:**
- **No actual claims submission**
- **No authorization management**
- **No outcomes data for value-based contracts**
- **No cost-savings evidence** generation
- **Availity API not wired** (mock responses)

**Path to 10/10:**
```
1. Wire Availity API for real eligibility checks
2. Build claims submission workflow
3. Add authorization tracking (hours approved vs used)
4. Create outcomes report for payors (stress reduction, adherence)
5. Build cost-savings calculator (AI hours vs BCBA hours)
```

---

### 8. ACUMEN/DCI/SPOKCHOICE (Fiscal Agent) VIEW: 8.0/10

**What Works:**
- Fiscal Agent Export component exists
- PDF timesheet generation with service codes
- ABA billing codes properly mapped
- Provider NPI and credential tracking
- State-specific waiver configurations

**Critical Gaps:**
- **No direct EDI submission**
- **No budget tracking** (remaining hours per child)
- **No authorization hour tracking**
- **No electronic timesheet approval workflow**

**Path to 10/10:**
```
1. Add authorization hours tracking (approved vs used)
2. Build budget remaining calculator
3. Create approval workflow (parent → supervisor)
4. Add EVV GPS verification
5. Document direct submission API integration roadmap
```

---

### 9. IMPACT INVESTOR (Acumen-style) VIEW: 7.5/10

**What Works:**
- Clear social mission (serving underserved autism families)
- Medicaid waiver support (reaching low-income families)
- Caregiver wellbeing tracking (stress levels)
- Outcomes measurement framework started

**Critical Gaps:**
- **No IRIS+ metrics** tracking
- **No Theory of Change** documented
- **No impact measurement dashboard**
- **No SDG alignment** documentation
- **No beneficiary feedback system**

**Path to 10/10:**
```
1. Document Theory of Change
2. Map to IRIS+ metrics (lives improved, services accessed)
3. Build impact dashboard (families served, outcomes achieved)
4. Add beneficiary satisfaction surveys
5. Create impact report generator for stakeholders
```

---

## PART 2: SCREEN-BY-SCREEN REVIEW

### Critical Customer-Facing Screens

| Screen | Current | Issues | Action |
|--------|---------|--------|--------|
| Splash/Landing | 9/10 | - | - |
| Login | 9/10 | - | - |
| Create Account | 9/10 | - | - |
| Onboarding | 9/10 | Minor copy tweaks | - |
| Dashboard | 8.5/10 | Chat-first good, needs empty states | Add empty states |
| Paywall | 8/10 | **Still shows "Starter" tier** (line 61-68) | Remove Starter |
| Ask Aminy Chat | 9/10 | Memory indicator could be more prominent | Add "I remember..." UI |
| Care Plan | 8/10 | Dark mode incomplete | Fix dark mode |
| Community | 7.5/10 | Dark mode partial, share button needs handler | Fix share + dark mode |
| Calm Tools | 9/10 | - | - |
| Telehealth | 8/10 | Uses mock data, Daily.co not configured | Wire real API |
| Provider Marketplace | 7/10 | Mock providers, no booking flow | Wire to Supabase |
| Settings | 9/10 | - | - |
| Admin Portal | 7.5/10 | Hardcoded metrics | Wire real queries |

### Mobile Optimization Check

| Aspect | Status | Score |
|--------|--------|-------|
| Viewport meta | ✅ Correct | 10/10 |
| Safe area insets | ✅ Implemented | 9/10 |
| Touch targets (44px+) | ⚠️ 77 instances, some gaps | 8/10 |
| Dark mode | ⚠️ Partial coverage | 7/10 |
| Pull-to-refresh | ✅ Implemented | 10/10 |
| Swipe navigation | ✅ Implemented | 10/10 |
| Keyboard avoiding | ✅ Implemented | 9/10 |
| iOS notch handling | ✅ Implemented | 9/10 |

### Pixel-Perfect Elegance Check (vs Calm/Headspace/Apple)

| Aspect | Current | Target | Gap |
|--------|---------|--------|-----|
| Loading states | Basic pulse | Shimmer effect | Medium |
| Empty states | ⚠️ Missing in places | Consistent system | High |
| Transitions | Good | Great | Low |
| Micro-interactions | Basic | Delight-inducing | Medium |
| Typography | Good | Perfect hierarchy | Low |
| Color consistency | Good | Brand-perfect | Low |
| Iconography | Lucide (good) | Consistent | Low |
| Shadows/Depth | Basic | Layered, intentional | Medium |

---

## PART 3: AI INTEGRATION ASSESSMENT

### What's Implemented ✅
- **Real Claude API** via Supabase Edge Function
- **Streaming responses** working
- **Context-aware system prompt** with child/parent details
- **Crisis detection** with 988 referral
- **Rate limiting** (5/day free, unlimited paid)
- **Conversation history** (last 20 messages in context)

### What Needs Verification 🔍
- **Memory persistence across sessions** - Supabase `conversations` table exists but sync verification needed
- **Memory recall in responses** - AI should say "I remember when..." naturally
- **Push notification delivery** - Infrastructure exists but end-to-end unverified
- **Fallback to OpenAI** - Documented but not verified working

### AI Experience Quality

| Aspect | Current | 10/10 Target |
|--------|---------|--------------|
| Response relevance | 9/10 | 10/10 |
| Child personalization | 9/10 | 10/10 |
| Parent tone matching | 8/10 | 10/10 (use selected tone) |
| Memory continuity | 7/10 | 10/10 (visible "I remember") |
| Actionable advice | 9/10 | 10/10 |
| Emotional support | 9/10 | 10/10 |
| Crisis handling | 10/10 | 10/10 |

---

## PART 4: ONBOARDING CHAT ASSESSMENT

**Current Flow:**
1. What to Expect preview
2. Parent name
3. Child name + age
4. Primary concern
5. Tone selection (supportive/direct/playful)
6. Diagnoses + communication level
7. Focus areas
8. **QUICK WIN** (personalized tip based on concern)
9. Parent capacity check
10. Child mental health (ages 4+)
11. Account (email) if not already captured
12. Plan generation with progress visualization
13. Completion with referral prompt

**Does it feel like the best developmental pediatrician/BCBA/therapist/best friend/sales closer?**

| Aspect | Score | Notes |
|--------|-------|-------|
| Warmth | 9/10 | Tone options are excellent |
| Expertise feel | 8/10 | Quick Win shows knowledge, could add more "wow" |
| Personalization | 9/10 | Uses child name throughout |
| Reduces mental load | 8/10 | Progressive disclosure good, but still many steps |
| Sales conversion | 8/10 | Post-onboarding paywall with friction modal |
| Referral integration | 7/10 | Mentioned but not prominent |

**Improvements for 10/10:**
```
1. Add "I'm already seeing patterns" moment after diagnosis collection
2. More visible "Aminy remembers everything" indicator
3. Streamline to 7-8 steps max (combine some screens)
4. Add "Here's what we'll work on together" summary before paywall
5. Make referral CTA more prominent with "Give a friend 1 month free"
```

---

## PART 5: PRICING/TIERS ASSESSMENT

### Current Structure

| Tier | Price | Key Features |
|------|-------|--------------|
| Free | $0 | 5 AI msgs/day, basic calm tools, community read-only |
| ~~Starter~~ | ~~$9.99~~ | **DEPRECATED but still in PaywallScreen** |
| Core | $14.99/mo | Unlimited AI, vault, 3 children, marketplace access |
| Pro | $29.99/mo | Core + 1 BCBA consult/mo, clinical reports, 20% off marketplace |
| Pro+ | $49.99/mo | Pro + unlimited children, unlimited video, 30% off marketplace |

### Is the value clear and incentive to upgrade?

| Aspect | Score | Notes |
|--------|-------|-------|
| Free → Core value prop | 9/10 | Unlimited AI is compelling |
| Core → Pro value prop | 7/10 | BCBA consult valuable but marketplace not live |
| Pro → Pro+ value prop | 6/10 | "Unlimited children" narrow audience |
| Price anchoring | 8/10 | $14.99 vs Forta $99 is strong |
| HSA/FSA highlight | 9/10 | Prominently displayed |
| Trial friction | 9/10 | 7-day free, no CC required |

**Improvements for 10/10:**
```
1. Remove "Starter" completely from PaywallScreen
2. Add "Most families choose Core" social proof
3. Show "What you'll unlock" preview before paywall
4. Add testimonials/outcomes on pricing page
5. Make Pro+ about "peace of mind" not "unlimited children"
```

---

## PART 6: VIRAL/RETENTION MECHANICS

### Current State

| Mechanic | Implemented | Working | Score |
|----------|-------------|---------|-------|
| Streaks | ✅ | ✅ | 9/10 |
| Push notifications | ✅ | ⚠️ Unverified | 6/10 |
| Email sequences | ✅ | ⚠️ Unverified | 6/10 |
| Referral program | ✅ | ⚠️ Not in key flows | 6/10 |
| Share wins | ✅ | ⚠️ Share handler empty | 5/10 |
| Morning Mission | ✅ | ✅ | 9/10 |
| Outcomes dashboard | ✅ | ✅ | 8/10 |

### Viral Coefficient Estimate
- **Current k:** ~0.15-0.25 (low)
- **Target k:** >0.5 for sustainable growth
- **Path:** Integrate referral into more touchpoints, make sharing frictionless

**Improvements for 10/10:**
```
1. Test push notifications end-to-end (real device)
2. Add referral to: paywall footer, post-onboarding, share wins, settings
3. Fix CommunityFeed share button onClick handler
4. Add "Invite & both get 1 month free" prominent CTA
5. Create shareable win cards with branding
```

---

## PART 7: PRIORITIZED IMPLEMENTATION PLAN

### PHASE 1: CRITICAL FIXES (Must Do Before Pilot) - 3-5 Days

| # | Task | File | Priority | Time |
|---|------|------|----------|------|
| 1 | **Remove Starter from PaywallScreen** | PaywallScreen.tsx:61-68 | CRITICAL | 30m |
| 2 | **Fix CommunityFeed share button** | CommunityFeed.tsx | CRITICAL | 1h |
| 3 | **Full dark mode audit** | Multiple components | HIGH | 4h |
| 4 | **Test push notifications E2E** | push-notifications.ts | HIGH | 2h |
| 5 | **Add "Aminy remembers" indicator** | PersistentAskAminyFAB.tsx | HIGH | 2h |
| 6 | **Verify AI memory persistence** | conversation-store.ts | HIGH | 2h |
| 7 | **Add empty states system** | New empty-state.tsx | MEDIUM | 4h |
| 8 | **Wire marketplace to Supabase** | ProviderMarketplace.tsx | HIGH | 6h |

### PHASE 2: ADMIN & ANALYTICS (For Pilot Visibility) - 1 Week

| # | Task | File | Priority | Time |
|---|------|------|----------|------|
| 9 | **Wire real intent classification** | AdminPortal.tsx | HIGH | 4h |
| 10 | **Calculate real peak hours** | AdminPortal.tsx | MEDIUM | 2h |
| 11 | **Add NPS survey modal** | New NPSSurvey.tsx | HIGH | 4h |
| 12 | **Wire Stripe revenue dashboard** | AdminPortal.tsx | HIGH | 4h |
| 13 | **Build cohort retention view** | New CohortAnalysis.tsx | HIGH | 8h |
| 14 | **Add viral k-factor tracking** | New viral-analytics.ts | MEDIUM | 4h |

### PHASE 3: CLINICAL ENHANCEMENTS (For Provider Value) - 1 Week

| # | Task | File | Priority | Time |
|---|------|------|----------|------|
| 15 | **Add BIP template** | New BehaviorInterventionPlan.tsx | HIGH | 8h |
| 16 | **ABC trend visualization** | ABCDataCollection.tsx | HIGH | 6h |
| 17 | **Add GAD-7 screener** | ScreeningTools.tsx | MEDIUM | 4h |
| 18 | **Session prep AI digest** | New SessionPrep.tsx | HIGH | 6h |
| 19 | **Discipline-specific goal banks** | treatment-goals.ts | MEDIUM | 4h |

### PHASE 4: RETENTION & VIRALITY (For Growth) - 1 Week

| # | Task | File | Priority | Time |
|---|------|------|----------|------|
| 20 | **Referral in paywall footer** | PaywallScreen.tsx | HIGH | 2h |
| 21 | **Referral in post-onboarding** | OnboardingEnhanced.tsx | HIGH | 2h |
| 22 | **Shareable win cards** | ShareWinFlow.tsx | MEDIUM | 4h |
| 23 | **Email sequence verification** | emailDigest.ts | HIGH | 2h |
| 24 | **Re-engagement push campaign** | push-notifications.ts | MEDIUM | 4h |

### PHASE 5: POLISH & ELEGANCE (For Apple-Level Quality) - 1-2 Weeks

| # | Task | File | Priority | Time |
|---|------|------|----------|------|
| 25 | **Premium loading shimmer** | skeleton.tsx | MEDIUM | 3h |
| 26 | **Button micro-interactions** | button.tsx | LOW | 2h |
| 27 | **Consistent typography weights** | globals.css | LOW | 2h |
| 28 | **Glass morphism effects** | Various | LOW | 8h |
| 29 | **Sound design (haptics)** | haptics.ts | LOW | 4h |

---

## PART 8: SUCCESS METRICS FOR 10/10

### User Experience
- [ ] NPS > 70 from pilot users
- [ ] Task completion rate > 95%
- [ ] Session duration > 7 minutes average
- [ ] DAU/MAU ratio > 50%

### Clinical Outcomes
- [ ] 80% of families report reduced stress (self-reported)
- [ ] 85% complete daily activities 5+ days/week
- [ ] 70% see behavioral improvement within 30 days
- [ ] Provider satisfaction > 4.5/5

### Business Metrics
- [ ] Trial → Paid conversion > 20%
- [ ] Viral coefficient k > 0.4
- [ ] Month 2 retention > 75%
- [ ] Referral rate > 25% of active users

### Technical Quality
- [ ] LCP < 2.0s
- [ ] CLS < 0.05
- [ ] FID < 100ms
- [ ] Zero critical accessibility violations

---

## PART 9: VERIFICATION CHECKLIST

### Before Pilot Launch

**Visual Quality:**
- [ ] Every screen reviewed on iPhone 15 Pro
- [ ] Every screen reviewed on iPhone SE (small)
- [ ] Every screen reviewed on Pixel 7
- [ ] Dark mode works on ALL screens
- [ ] No horizontal scroll on any screen
- [ ] All touch targets are 44px+
- [ ] Empty states exist where data could be empty

**AI Quality:**
- [ ] AI memory persists across sessions (test: close app, return, reference past)
- [ ] AI uses child's name naturally
- [ ] AI tone matches selection (supportive/direct/playful)
- [ ] Crisis detection works (test with safe simulated input)
- [ ] Rate limiting works (free: 5/day, paid: unlimited)

**Retention Mechanics:**
- [ ] Push notification received on real device
- [ ] Email received from Aminy
- [ ] Referral link works (generates, tracks)
- [ ] Streak updates correctly

**Payments:**
- [ ] Stripe checkout completes
- [ ] Subscription status updates in app
- [ ] HSA/FSA payment method works

**Community:**
- [ ] Post creation works
- [ ] Like/comment works
- [ ] Share generates shareable content
- [ ] Delete own post works

**Provider:**
- [ ] Provider can see patient list
- [ ] Provider can access Insight Navigator (with permission)
- [ ] Session notes save correctly
- [ ] Secure messaging works

---

## PART 10: GITHUB STATUS

**Current State:**
- Branch: `claude/production-readiness-review-KMnBB`
- Status: Clean working tree
- Last commit: `8ad5f5f Complete Phase 4: Excellence features for competitive moat`

**All progress IS pushed to GitHub** on the current branch.

To merge to main when ready:
```bash
git checkout main
git merge claude/production-readiness-review-KMnBB
git push origin main
```

---

## CONCLUSION

**Current State: 8.2/10**

Aminy has excellent bones. The remaining 1.8 points come from:

1. **Visual consistency gaps** (dark mode, empty states) - 0.4 points
2. **Admin/analytics mock data** - 0.3 points
3. **Viral mechanics not integrated** - 0.4 points
4. **AI memory visibility** - 0.2 points
5. **Pixel-perfect polish** - 0.3 points
6. **Paywall cleanup** (Starter tier) - 0.1 points
7. **Push/email verification** - 0.1 points

**Estimated Time to 10/10: 4-5 weeks of focused development**

**Phase 1 alone (Critical Fixes) gets you to 9.0/10** and ready for a limited pilot.

With this plan executed, Aminy will be a **world-class, Apple-level quality** autism support platform that:
- Makes parents breathe easier
- Tracks real clinical outcomes
- Drives viral growth
- Earns investor confidence
- Achieves regulatory/payor acceptance

**The foundation is strong. Now it's about polish and wiring.**
