# AMINY: COMPREHENSIVE 10/10 STAKEHOLDER ASSESSMENT
## McKinsey-Level Strategic Analysis & Execution Plan

**Assessment Date:** January 25, 2026
**Deployment:** https://aminyapp.vercel.app
**Repository:** github.com/edgarstaren/Aminy-Final

---

## EXECUTIVE SUMMARY

Aminy is a promising AI-first autism support platform with **beautiful architecture and design** but **critical production gaps** that prevent pilot readiness. The honest assessment: **you're at 45% production readiness** with 10/10 potential.

| Dimension | Current Score | Gap to 10/10 | Priority |
|-----------|--------------|--------------|----------|
| AI Integration | 6.5/10 | Backend unverified, memory localStorage-only | CRITICAL |
| Community | 3/10 | Mock data only, no persistence | CRITICAL |
| Email/Retention | 2/10 | Email service not configured | CRITICAL |
| Admin Analytics | 3/10 | 100% hardcoded mock data | HIGH |
| Provider Portal | 4/10 | UI exists, no backend | HIGH |
| Mobile UX | 7/10 | Minor font size issues | MEDIUM |
| Onboarding | 8/10 | Good flow, needs memory proof | LOW |

**Bottom Line:** The code quality is excellent. The wiring to real systems is incomplete. A customer would experience a beautiful facade with hollow functionality.

---

## PART 1: MULTI-STAKEHOLDER DEEP DIVE

### 1. McKinsey Consultant Perspective — 5.5/10

**What We Found:**

✅ **Strengths:**
- Clear market positioning: "AI-first autism support" vs. waitlist-dependent incumbents
- Compelling TAM story: 5M+ autistic individuals in US, $10B+ ABA market
- Platform economics potential: Low marginal cost per user with AI
- Multi-revenue model design: Consumer tiers + Provider marketplace + B2B

❌ **Critical Gaps:**
- **No unit economics visibility**: AdminPortal shows hardcoded `revenue: 23400` (line 88) — no real CAC/LTV tracking
- **No operational playbook**: How do you handle support tickets? Escalations? Provider disputes?
- **Provider marketplace risk**: Two-sided marketplace with neither side populated
- **Zero signed contracts**: No LOIs, no pilot agreements, no B2B commitments documented

**Evidence from Code:**
```typescript
// AdminPortal.tsx:42-109 - ALL HARDCODED
const PILOT_DATA = {
  totalFamilies: 150,        // Not real
  activeFamilies: 127,       // Not real
  revenue: 23400,            // Not real
  ...
};
```

**To Reach 10/10:**
1. Wire AdminPortal to real Supabase analytics queries
2. Implement CAC/LTV dashboard with real subscription data
3. Document unit economics per tier (COGS, margin, payback period)
4. Sign 3 LOIs with measurable outcome commitments

---

### 2. Venture Capitalist Perspective — 5/10

**What We Found:**

✅ **Strengths:**
- Large addressable market with genuine pain points
- AI moat is real (custom system prompts, memory architecture designed)
- Multiple revenue streams architected
- "Forta killer" positioning if executed properly

❌ **Critical Gaps:**
- **Zero revenue metrics**: No Stripe webhook processing confirmed working
- **No user data**: Can't prove D7, D30, DAU/WAU without real analytics
- **Chicken-and-egg marketplace**: No providers, no families — which comes first?
- **Competitive risk unmitigated**: Forta has $100M+ funding, 900+ BCBAs

**The Hard Truth:**
VCs will ask: "Show me your cohort retention chart." You can't produce one because analytics aren't wired to real data.

**Evidence from Code:**
```typescript
// analytics-engine.ts - Events defined but...
// No supabase.from() calls found
// No database persistence of events
// All tracking goes to console.log in debug mode
```

**To Reach 10/10:**
1. Deploy with 100+ paying users, prove 60%+ M1 retention
2. Implement real analytics pipeline to Supabase/Mixpanel
3. Show DAU/WAU of 35%+ with real data
4. Close at least one clinic partnership with revenue commitment
5. Demonstrate clinical outcome delta (pre/post VABS-II scores)

---

### 3. Developmental Pediatrician Perspective — 6.5/10

**What We Found:**

✅ **Strengths:**
- System prompts capture clinical nuance (crisis detection, safety boundaries)
- Appropriately positioned as support, not medical advice
- Goal tracking aligned with developmental milestones conceptually
- Referral language is clinically appropriate

❌ **Critical Gaps:**
- **No validated instruments**: No M-CHAT-R/F, ASQ-3, or ADOS references integrated
- **No EHR integration**: Can't share data with the child's actual care team
- **No outcome benchmarking**: Progress shown without clinical norms comparison
- **No collaboration workflow**: Pediatricians can't receive or review data

**Evidence from Code:**
```typescript
// claude-client.ts:68-126 - Good system prompts
// BUT no integration with clinical systems
// No FHIR endpoints
// No standardized export formats
```

**To Reach 10/10:**
1. Add validated screening questionnaires (M-CHAT-R/F at minimum)
2. Implement "Share with Provider" PDF export with clinical formatting
3. Include developmental milestone tracking against CDC guidelines
4. Create structured data export for care team collaboration

---

### 4. BCBA Perspective — 5/10

**What We Found:**

✅ **Strengths:**
- ABA principles embedded in AI responses (First/Then, Visual Schedules, etc.)
- Data collection mindset referenced in UI
- Behavior support strategies mentioned are evidence-based
- Parent training focus aligns with RBT supervision requirements

❌ **Critical Gaps:**
- **No ABC data collection**: Core of ABA practice, completely absent
- **No behavior graphs**: Can't visualize frequency, duration, or interval data
- **Session notes not compliant**: No insurance-ready documentation
- **No treatment plan generation**: BIPs can't be created or stored

**The Hard Truth:**
A BCBA couldn't use this professionally. It's consumer-facing only.

**Evidence from Code:**
```typescript
// No ABC form component found
// No behavior frequency chart
// No session note template
// No treatment plan editor
```

**To Reach 10/10:**
1. Add ABC (Antecedent-Behavior-Consequence) data entry forms
2. Create behavior frequency/duration visualization charts
3. Enable insurance-ready session note exports (CPT code compatible)
4. Add BIP (Behavior Intervention Plan) template editor
5. Implement skill acquisition tracking with mastery criteria

---

### 5. Therapist (SLP/OT) Perspective — 5.5/10

**What We Found:**

✅ **Strengths:**
- Multidisciplinary approach acknowledged in content
- Sensory tools section exists
- Parent coaching framework could support carryover

❌ **Critical Gaps:**
- **No session prep workflow**: Therapists can't see what happened since last visit
- **No parent engagement tracking**: Was home practice completed?
- **No goal sharing**: IEP/IFSP goals can't be imported or tracked
- **No therapy integration**: OT sensory diets, SLP carryover activities not structured

**To Reach 10/10:**
1. Add "Since Last Session" summary for therapists
2. Implement home program tracking with completion verification
3. Create goal import from IEP/IFSP documents
4. Add therapy-specific activity libraries (SLP, OT, PT)

---

### 6. Parent/Caregiver Perspective — 7/10

**What We Found:**

✅ **Strengths:**
- Calming, warm design aesthetic — genuinely feels like a hug
- "I'm not alone" emotional resonance is strong
- Mobile-first design works well
- Onboarding flow is thoughtful and low-friction
- No judgment in AI responses — supportive tone

❌ **Critical Gaps:**
- **Memory doesn't feel "sticky"**: No "Aminy remembers..." callouts visible
- **Community is dead**: Can post but nothing persists, feels empty
- **No spouse/family sharing**: Single-user only despite multi-child mention
- **Unclear value post-trial**: What happens when trial ends?

**Evidence from Code:**
```typescript
// community.ts - CRUD functions NOW exist (just added)
// BUT storage is localStorage only
// Will lose data on browser clear
// No cross-device sync
```

**What Parents Will Experience:**
Day 1: "Wow, this is beautiful and helpful!"
Day 3: "Wait, why doesn't the community have any posts?"
Day 7: "Did it forget what I told it last week?"
Day 14: *churn*

**To Reach 10/10:**
1. Add explicit "Aminy remembers..." UI callouts after AI responses
2. Seed community with 50+ real-feeling posts
3. Migrate community storage to Supabase for persistence
4. Add "Invite Partner" flow for family sharing
5. Create clear trial-to-paid transition messaging

---

### 7. Payor/Insurance Company Perspective — 3/10

**What We Found:**

✅ **Strengths:**
- HSA/FSA compliance mentioned (shows regulatory awareness)
- Potential for claims cost reduction narrative
- Parent engagement could reduce ER utilization

❌ **Critical Gaps:**
- **No outcomes data**: Can't justify value-based contracts
- **No claims integration**: Can't submit to payers
- **No CPT code mapping**: Can't bill for eligible services
- **No clinical evidence base**: No RCT, no quasi-experimental data
- **No HIPAA BAA visibility**: Compliance unclear

**The Hard Truth:**
A health plan would ask: "Show me your outcomes whitepaper." You have none. No payer will contract with you.

**To Reach 10/10:**
1. Design quasi-experimental outcomes study (pre/post with waitlist control)
2. Publish outcomes whitepaper after 90-day pilot
3. Partner with 1-2 health plans for pilot contract
4. Add CPT code mapping for eligible services
5. Document HIPAA compliance posture

---

### 8. Fiscal Agent (Acumen/PPL/DCI/SpokChoice) Perspective — 4/10

**What We Found:**

✅ **Strengths:**
- EVV framework conceptually exists
- PDF timesheet generation mentioned
- State-specific waiver knowledge referenced in AI prompts

❌ **Critical Gaps:**
- **No direct API submission**: All manual upload required
- **GPS verification incomplete**: Framework exists but not enforced
- **No signature capture**: Digital signatures not implemented
- **No rejection handling**: What happens when fiscal agent rejects timesheet?

**Evidence from Code:**
```typescript
// fiscal-agent-integration conceptually exists
// BUT no actual API calls to Acumen/DCI
// No signed partnership agreements
// No OAuth or credential storage for submission
```

**Realistic Path to Revenue:**
- **Phase 1 (Now):** PDF export only — parent manually uploads
- **Phase 2 (3 months):** Portal guides with step-by-step instructions
- **Phase 3 (6-12 months):** Direct API requires SOC2 ($15-50K) and state approval

**To Reach 10/10:**
1. Partner with one fiscal agent for pilot API access
2. Implement digital signature capture
3. Add EVV GPS enforcement at clock-in/out
4. Create rejection notification and correction workflow

---

## PART 2: THE HARD QUESTIONS ANSWERED

### Q: What if Forta just adds an AI component — am I hosed?

**Short Answer:** No, but you need to move FAST.

**Why You're Not Hosed:**
| Factor | Forta | Aminy |
|--------|-------|-------|
| Business Model | BCBA placement (AI threatens their revenue) | AI-first (10x more efficient cost structure) |
| Current "AI" | Scheduling/matching only | Conversational companion |
| Time to Value | 2-4 week waitlist | Instant |
| Price | $99/mo | $14.99/mo |

**Your Moat:**
1. **Conversational memory**: Forta can't easily replicate months of learning your child
2. **Personalized system prompts**: Your AI "knows" the family deeply
3. **Community + AI compound**: Network effects amplify AI value
4. **Price advantage**: 85% cheaper for daily support

**Defensive Moves:**
1. Get to 1,000 active users before Forta notices
2. Build memory depth that creates switching costs
3. Partner with clinics Forta doesn't serve (rural, Medicaid-focused)

---

### Q: Why pay cash vs use insurance?

| Insurance | Aminy |
|-----------|-------|
| 90-day waitlist | Instant access |
| 2-4 hours/week max | Unlimited 24/7 |
| Location dependent | Mobile anywhere |
| Requires diagnosis | No diagnosis needed |
| Rigid treatment plans | Adaptive daily support |
| $3,000+ deductible first | $14.99/month |

**The Psychology:**
Parents are desperate NOW, not in 90 days. ABA hours are limited; daily support isn't covered. Aminy fills the gaps between therapy sessions. HSA/FSA makes it tax-advantaged anyway.

---

### Q: Why not just have a BCBA deal with it?

**Reality Check:**
- Only ~45,000 BCBAs in US for 5M+ autistic individuals
- Average waitlist: 6-18 months in most states
- BCBAs cost $100-$200/hour for private pay
- BCBAs work business hours; meltdowns happen at 8pm

**Aminy's Value Proposition:**
- **Supplement, not replace**: "Your BCBA at 2am"
- **Continuous vs episodic**: Daily support, not weekly sessions
- **Empowers parents**: Parents do 99% of the work anyway; give them tools

---

### Q: Is pricing right? Is there upgrade incentive?

**Current Tiers:**
| Tier | Price | Key Feature | Assessment |
|------|-------|-------------|------------|
| Free | $0 | 5 messages/day | Good hook |
| Starter | $6.99 | 20 messages | Weak middle |
| Core | $14.99 | Unlimited AI | Sweet spot |
| Pro | $29.99 | Expert access | Good upsell |
| Pro+ | $49.99 | Family plan | Premium tier |

**What's Working:**
- 7-day trial converts curious → committed
- $14.99 is "Netflix price" for daily support
- Pro for serious users wanting human expertise

**What's Missing:**
1. **No usage-based nudges**: "You've used 5/5 messages — upgrade for unlimited"
2. **No visible feature gates**: Free users should hit walls MORE obviously
3. **No social proof**: "87% of parents like you chose Core"

---

### Q: Is it viral enough?

**Current Viral Mechanics:** None explicitly built.

**What's Needed:**
1. **Referral program**: "Give a friend 1 month free, get 1 month free"
2. **Share wins**: "My child said their first sentence!" → Share to Facebook
3. **Provider invites**: Parent invites therapist → therapist joins marketplace
4. **Community posts**: Shareable content that links back to app

---

### Q: Will customers sign up and not use it, then cancel?

**This is your #1 risk.**

**Current Retention Mechanisms:**
- ✅ Morning Mission (just implemented)
- ✅ Streak warning UI (just implemented)
- ✅ Email sequence templates (designed)
- ❌ Email actually sending (NOT CONFIGURED)
- ❌ Push notifications firing (NOT VERIFIED)
- ❌ Re-engagement triggers (NOT WIRED)

**Evidence from Code:**
```typescript
// email-service.ts:20-124
// ALL EMAIL SENDING IS COMMENTED OUT
// Line 123-124: return true; // Simulates success without sending
```

**What Will Happen:**
- User signs up → beautiful onboarding → uses app Day 1
- Day 3: No email reminder sent (code not configured)
- Day 7: No "you're about to lose your streak" push (not wired)
- Day 14: User forgot app exists → churns

---

## PART 3: WHAT'S ACTUALLY WORKING VS BROKEN

### ✅ Confirmed Working:
1. **Supabase authentication** — Users can sign up/login
2. **Rate limiting** — Backend properly throttles requests
3. **Daily usage tracking** — Persists to database
4. **Web Push API infrastructure** — Registration works
5. **Stripe webhook framework** — Endpoints exist
6. **UI/UX design** — Beautiful, calming, mobile-optimized

### ❌ Confirmed Broken/Not Wired:
1. **Email sending** — Returns `true` without sending
2. **Community persistence** — localStorage only, will lose data
3. **Admin analytics** — 100% hardcoded mock data
4. **AI memory persistence** — localStorage only, not database
5. **Provider portal backend** — UI exists, no real data
6. **Push notification delivery** — Infrastructure only, not scheduled

---

## PART 4: COMPREHENSIVE 10/10 EXECUTION PLAN

### PHASE 0: CRITICAL FIXES (48 Hours)

| # | Task | Owner | Impact | Effort |
|---|------|-------|--------|--------|
| 1 | **Configure email service (Resend)** | Backend | Retention | 2 hours |
| 2 | **Wire community to Supabase** | Backend | Engagement | 4 hours |
| 3 | **Add AI memory persistence** | Backend | Retention | 4 hours |
| 4 | **Verify Claude API actually responds** | Backend | Core feature | 2 hours |

**Details:**

**1. Configure Email (email-service.ts)**
```typescript
// Uncomment Resend integration (lines 34-68)
// Add RESEND_API_KEY to Supabase secrets
// Test with real email delivery
```

**2. Wire Community to Supabase**
```typescript
// community.ts - Replace localStorage with:
// supabase.from('community_posts').insert()
// supabase.from('community_posts').select()
// supabase.from('community_comments').insert()
```

**3. AI Memory Persistence**
```typescript
// memory-system.ts - Replace localStorage with:
// supabase.from('conversation_memory').upsert()
// supabase.from('child_context').update()
```

---

### PHASE 1: PRODUCTION READY (Week 1)

| # | Task | Impact | Effort |
|---|------|--------|--------|
| 5 | **Wire AdminPortal to real analytics** | Operations | 8 hours |
| 6 | **Add "Aminy remembers..." callouts** | Perceived value | 2 hours |
| 7 | **Implement usage-based upgrade nudges** | Revenue | 4 hours |
| 8 | **Seed community with 50 posts** | Engagement | 2 hours |
| 9 | **Add referral program** | Growth | 4 hours |
| 10 | **Schedule push notifications** | Retention | 4 hours |

**Details:**

**5. Real Admin Analytics**
```typescript
// Replace PILOT_DATA with:
const fetchMetrics = async () => {
  const { data: families } = await supabase
    .from('users')
    .select('*', { count: 'exact' });

  const { data: conversations } = await supabase
    .from('ai_conversations')
    .select('*', { count: 'exact' });

  // ... real queries
};
```

**6. "Aminy Remembers" Callout**
Add after AI responses when memory is used:
```tsx
{usedMemory && (
  <div className="text-sm text-teal-600 bg-teal-50 p-2 rounded">
    💭 Aminy remembers: {memoryUsed}
  </div>
)}
```

---

### PHASE 2: PILOT READY (Week 2-3)

| # | Task | Impact | Effort |
|---|------|--------|--------|
| 11 | **Provider-parent messaging** | Marketplace | 16 hours |
| 12 | **ABC data collection forms** | BCBA value | 8 hours |
| 13 | **Session note templates** | Provider value | 8 hours |
| 14 | **Partner invite flow** | Growth | 4 hours |
| 15 | **Clinical outcome tracking** | Payor value | 12 hours |

---

### PHASE 3: SCALE READY (Month 2)

| # | Task | Impact | Effort |
|---|------|--------|--------|
| 16 | EHR integration exploration | B2B | Research |
| 17 | Fiscal agent direct submission | Revenue | 40 hours |
| 18 | Validated screening instruments | Clinical | 24 hours |
| 19 | A/B testing infrastructure | Optimization | 16 hours |
| 20 | Automated outcome reports | Provider value | 16 hours |

---

## PART 5: PILOT SUCCESS METRICS

**For a 60-day pilot with 100 families:**

| Metric | Minimum | Target | "Wow" |
|--------|---------|--------|-------|
| Onboarding completion | 70% | 85% | 95% |
| D7 activation | 50% | 60% | 75% |
| D30 retention | 40% | 50% | 65% |
| DAU/WAU | 25% | 35% | 45% |
| NPS | 40 | 55 | 70+ |
| Trial → Paid conversion | 20% | 30% | 50% |
| Parent satisfaction | 4.0/5 | 4.3/5 | 4.7/5 |
| AI message satisfaction | 4.0/5 | 4.5/5 | 4.8/5 |

---

## PART 6: COMPETITIVE POSITIONING

### Forta's $99/mo "Real AI" — What Is It Actually?

Based on their marketing:
- **Scheduling and care coordination AI** — matches families with BCBAs
- **Insurance authorization handling** — paperwork automation
- **NOT a conversational AI companion** — no memory, no daily support

**Your Differentiation:**
> "Forta finds you a BCBA. Aminy IS your support — 24/7, 365."

### Positioning Matrix

| Feature | Aminy | Forta | Elemy |
|---------|-------|-------|-------|
| Conversational AI | ✅ Real (when configured) | ❌ Matching only | ❌ None |
| Memory/Personalization | ✅ Designed (needs wiring) | ❌ None | ❌ None |
| Price | $14.99/mo | $99-150/mo | $150+/mo |
| Time to Value | Instant | 2-4 weeks | 4-8 weeks |
| Medicaid Focus | ✅ Core | ❌ Afterthought | ❌ Private pay only |
| Community | ✅ Designed | ❌ None | ❌ None |

**Your Advantage:** Price + Memory + Medicaid Focus + 24/7 Availability
**Their Advantage:** They're live with real users and revenue

---

## PART 7: HONEST OVERALL ASSESSMENT

### Current State: 4.5/10 Production Ready

| Component | Score | Blocker |
|-----------|-------|---------|
| Beautiful UI/UX | 8.5/10 | None |
| Solid Architecture | 8/10 | None |
| AI Conversation Quality | 7/10 | Unverified backend |
| Real Data Persistence | 3/10 | localStorage dependency |
| Retention Mechanics | 2/10 | Email not sending |
| Community | 2/10 | No real persistence |
| Admin Operations | 2/10 | 100% mock data |
| Provider Features | 3/10 | UI only |
| Clinical Value | 4/10 | No validated instruments |

### Path to 10/10

**Week 1:** Fix email, community, memory → **6/10**
**Week 2:** Wire admin, add retention → **7.5/10**
**Week 3:** Provider features, clinical tools → **8.5/10**
**Week 4:** Polish, testing, soft launch → **9/10**
**Month 2:** Validated outcomes, partnerships → **10/10**

---

## APPENDIX: SPECIFIC FILE FIXES NEEDED

### email-service.ts (CRITICAL)
- Line 34-68: Uncomment Resend integration
- Add `RESEND_API_KEY` to Supabase secrets
- Test email delivery

### community.ts (CRITICAL)
- Replace localStorage with Supabase queries
- Add real-time subscription for updates
- Create tables: `community_posts`, `community_comments`, `community_likes`

### AdminPortal.tsx (HIGH)
- Remove `PILOT_DATA` constant (lines 42-109)
- Add `useEffect` with Supabase queries
- Create analytics tables in Supabase

### retention-engine.ts (HIGH)
- Wire `triggerOnboardingSequence` to working email
- Add database persistence for streaks
- Schedule push notifications via backend

### memory-system.ts (HIGH)
- Replace localStorage with Supabase
- Add `child_context` table
- Implement memory retrieval for AI prompts

---

## NEXT ACTIONS

**Immediate (Today):**
1. Configure Resend email service
2. Add RESEND_API_KEY to Supabase secrets
3. Deploy and test email delivery

**This Week:**
1. Migrate community to Supabase
2. Wire admin analytics to real data
3. Add memory persistence

**Decision Needed:**
- Do you want me to implement these fixes now?
- Or focus on a specific stakeholder gap first?

---

*This assessment was generated based on comprehensive codebase analysis. The scores reflect production readiness, not code quality. The code is excellent — the wiring to real systems is incomplete.*
