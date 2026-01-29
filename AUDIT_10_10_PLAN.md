# Aminy 10/10 Audit & Execution Plan

**Current Score: 7.5/10**
**Target: 10/10**

---

## CRITICAL ISSUES (Must Fix Immediately)

### 1. ❌ MEMORY CONTINUITY BUG
**Impact**: Users share vulnerable info during onboarding, AI forgets it. Destroys trust.

**Problem**:
- `OnboardingStreamlined` saves to `profiles.onboarding_data`:
  - `initialConcern` (what's hardest)
  - `conversationSummary` (first 4 messages)
- `buildAIContext()` in `aminy-ai-brain.ts` does NOT read this data
- AI has no memory of onboarding conversation

**Fix**:
```typescript
// In buildAIContext(), add:
const { data: profile } = await supabase
  .from('profiles')
  .select('onboarding_data')
  .eq('id', userId)
  .single();

// Extract into memory facts or direct context
if (profile?.onboarding_data) {
  const onboarding = profile.onboarding_data;
  context.parentProfile.primaryConcerns = [onboarding.initialConcern];
  context.memory.onboardingConversation = onboarding.conversationSummary;
}
```

**Files to modify**:
- `src/lib/aminy-ai-brain.ts` - Read onboarding_data in buildAIContext
- `src/lib/memory-system.ts` - Extract onboarding facts into memory

**Effort**: 2 hours

---

### 2. ❌ FREE TIER MEMORY = 0 DAYS
**Impact**: Free users get NO memory retention. AI forgets everything next session.

**Current**: `TIER_LIMITS.free.memoryDays = 0`
**Fix**: Change to `memoryDays = 14` (2 weeks)

**Why**: Users need to feel the AI "knows them" before paying. Zero memory = zero stickiness.

**File**: `src/lib/memory-system.ts` line 80

**Effort**: 5 minutes

---

## STAKEHOLDER GAPS

### PARENTS (Primary User) - Score: 8/10

| Gap | Impact | Fix | Effort |
|-----|--------|-----|--------|
| ❌ No push notifications | Low retention | Implement with Supabase + FCM | 4 hours |
| ❌ No offline mode | Can't use during crisis | Service worker + IndexedDB cache | 8 hours |
| ⚠️ Accessibility incomplete | Excludes users | ARIA labels, keyboard nav, screen reader testing | 4 hours |
| ⚠️ No dark mode completion | Poor UX at night | Complete Tailwind dark: classes | 2 hours |
| ⚠️ Slow initial load | Bad first impression | Code splitting already done, add skeleton states | 2 hours |

### CHILDREN (Aminy Jr) - Score: 6/10

| Gap | Impact | Fix | Effort |
|-----|--------|-----|--------|
| ❌ No age-appropriate responses | Confusing for kids | Adjust AI prompts based on child age | 2 hours |
| ❌ No gamification | No engagement | Add points, badges, streaks for kids | 6 hours |
| ❌ No parent-controlled limits | Safety concern | Add screen time limits, content filters | 4 hours |
| ⚠️ No progress rewards | Low motivation | Add achievement system | 4 hours |

### PROVIDERS (BCBAs, Therapists) - Score: 7/10

| Gap | Impact | Fix | Effort |
|-----|--------|-----|--------|
| ❌ No session notes → AI sync | Wasted data | Provider notes should feed AI context | 4 hours |
| ❌ No care plan collaboration | Siloed care | Shared care plan with comments | 6 hours |
| ⚠️ Basic messaging | Poor communication | Add rich messaging, attachments, read receipts | 4 hours |
| ⚠️ No outcome reporting | Can't prove value | Export PDF reports for providers | 4 hours |

### PAYERS (Insurance, Employers) - Score: 4/10

| Gap | Impact | Fix | Effort |
|-----|--------|-----|--------|
| ❌ No outcomes dashboard | Can't sell B2B | Build payer dashboard with HEDIS metrics | 16 hours |
| ❌ No ROI calculator | Can't justify spend | Calculator showing ER visits avoided, etc. | 4 hours |
| ❌ No enterprise features | Can't sell to orgs | Multi-user admin, bulk provisioning | 12 hours |
| ❌ No white-labeling | Can't partner | Themeable UI, custom domains | 8 hours |

---

## TECHNICAL GAPS

### AI Quality - Score: 7/10

| Gap | Impact | Fix | Effort |
|-----|--------|-----|--------|
| ❌ Regex-based fact extraction | Misses nuance | Implement AI-powered extraction | 6 hours |
| ❌ No vector embeddings | Can't semantic search | Add pgvector + embeddings | 8 hours |
| ❌ No conversation summarization | Context too long | Summarize old conversations | 4 hours |
| ⚠️ Fixed temperature | Wrong tone sometimes | Dynamic temp based on query type | 2 hours |

### Infrastructure - Score: 7/10

| Gap | Impact | Fix | Effort |
|-----|--------|-----|--------|
| ❌ No real health integration | Manual sleep data | Implement HealthKit/Google Fit bridges | 16 hours |
| ❌ No A/B testing | Can't optimize | Add PostHog or similar | 4 hours |
| ❌ No error monitoring | Blind to issues | Add Sentry | 2 hours |
| ⚠️ No load testing | Unknown limits | Run k6 load tests | 4 hours |

### Security - Score: 8/10

| Gap | Impact | Fix | Effort |
|-----|--------|-----|--------|
| ⚠️ No audit logging | Compliance risk | Log all data access | 4 hours |
| ⚠️ No data export | GDPR risk | Add user data export | 2 hours |
| ⚠️ No data deletion | GDPR risk | Add account deletion flow | 2 hours |

---

## BUSINESS GAPS

### Conversion - Score: 6/10

| Gap | Impact | Fix | Effort |
|-----|--------|-----|--------|
| ❌ No cohort tracking | Blind to conversion | Add Mixpanel/Amplitude | 4 hours |
| ❌ Referral not prominent | Low virality | Add referral prompts in app | 2 hours |
| ❌ No win-back emails | Churn stays churned | Automated email sequences | 4 hours |
| ⚠️ No churn prediction | Reactive not proactive | ML model on usage patterns | 8 hours |

### Retention - Score: 7/10

| Gap | Impact | Fix | Effort |
|-----|--------|-----|--------|
| ❌ No daily habit hooks | Easy to forget | Daily push + morning mission | 4 hours |
| ❌ No progress milestones | No celebration | Weekly/monthly summaries | 4 hours |
| ⚠️ No re-engagement | Users drift | "We miss you" campaigns | 4 hours |

---

## EXECUTION PLAN (Prioritized)

### Phase 1: CRITICAL FIXES (This Week) - 8 hours
1. **Memory continuity** - Feed onboarding data to AI (2h)
2. **Free tier memory** - Change to 14 days (5min)
3. **Trial conversation tracking** - Actually count and limit (2h)
4. **Referral prominence** - Add referral CTA in dashboard (2h)
5. **Error monitoring** - Add Sentry (2h)

### Phase 2: PARENT EXPERIENCE (Week 2) - 16 hours
1. Push notifications with personalized content (4h)
2. Offline mode with crisis resources (8h)
3. Complete dark mode (2h)
4. Accessibility audit + fixes (2h)

### Phase 3: AI QUALITY (Week 3) - 18 hours
1. AI-powered fact extraction (6h)
2. Vector embeddings for semantic memory (8h)
3. Conversation summarization (4h)

### Phase 4: PROVIDER VALUE (Week 4) - 14 hours
1. Provider notes → AI sync (4h)
2. Care plan collaboration (6h)
3. Outcome PDF reports (4h)

### Phase 5: PAYER VALUE (Week 5-6) - 40 hours
1. Outcomes dashboard with HEDIS metrics (16h)
2. ROI calculator (4h)
3. Enterprise admin features (12h)
4. White-labeling (8h)

### Phase 6: GROWTH (Week 7) - 20 hours
1. Cohort analytics (4h)
2. A/B testing infrastructure (4h)
3. Win-back email sequences (4h)
4. Churn prediction model (8h)

---

## TOTAL EFFORT TO 10/10

| Phase | Hours | Weeks |
|-------|-------|-------|
| Critical Fixes | 8 | 1 |
| Parent Experience | 16 | 1 |
| AI Quality | 18 | 1 |
| Provider Value | 14 | 1 |
| Payer Value | 40 | 2 |
| Growth | 20 | 1 |
| **TOTAL** | **116 hours** | **7 weeks** |

---

## IMMEDIATE ACTIONS (Do Right Now)

1. Fix memory continuity bug
2. Change free tier memory to 14 days
3. Add onboarding data to AI context
4. Make referral link prominent
5. Add Sentry for error monitoring

Want me to execute Phase 1 now?
