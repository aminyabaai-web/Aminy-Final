# AMINY 10/10 IMPLEMENTATION ROADMAP

> **Goal**: Transform Aminy from production-ready (current) to industry-leading (10/10) across all dimensions
>
> **Timeline**: 12 weeks
> **Start Date**: [TBD]
> **Owner**: Engineering + Product

---

## PHASE 1: CRITICAL BLOCKERS (Week 1-2)
*These MUST be fixed before any marketing/scaling*

### Week 1: Security & Infrastructure

#### 1.1 Enable Email Sending [CRITICAL - Day 1-2]
**Current State**: Email disabled, users receive no transactional emails
**Impact**: Password reset, welcome emails, payment receipts all broken

```
Tasks:
□ Choose email provider (Resend recommended for dev experience)
□ Set up domain verification (SPF, DKIM, DMARC)
□ Configure environment variables
□ Enable email-service.ts sending
□ Test all transactional email templates:
  - Welcome email
  - Password reset
  - Payment confirmation
  - Subscription change
  - Report sharing
□ Add email delivery monitoring
```

**Files to modify**:
- `src/supabase/functions/server/email-service.ts` (enable sending)
- `.env.production` (add RESEND_API_KEY)
- Supabase secrets (add email credentials)

**Success Criteria**: All transactional emails deliver within 30 seconds

---

#### 1.2 Fix Rate Limiter Security [CRITICAL - Day 2]
**Current State**: Fails OPEN on errors (allows unlimited requests if Redis fails)
**Impact**: DDoS vulnerability, cost exposure on AI API

```
Tasks:
□ Change default behavior to DENY on error
□ Add circuit breaker for rate limit service
□ Add alerting for rate limit failures
□ Test with simulated Redis failure
□ Document degraded mode behavior
```

**Files to modify**:
- `src/supabase/functions/server/rate-limiter.ts`

**Code Change**:
```typescript
// BEFORE (vulnerable):
} catch (error) {
  console.error('Rate limit check failed:', error);
  return { allowed: true, ... }; // FAILS OPEN
}

// AFTER (secure):
} catch (error) {
  console.error('Rate limit check failed:', error);
  // Fail closed - deny request if rate limiting unavailable
  return {
    allowed: false,
    reason: 'rate_limit_unavailable',
    retryAfter: 60
  };
}
```

**Success Criteria**: Rate limiter denies requests when backend unavailable

---

#### 1.3 Lock CORS for Production [Day 2]
**Current State**: Any localhost origin allowed
**Impact**: Security risk in production

```
Tasks:
□ Remove localhost exception for production
□ Whitelist only production domains
□ Add CORS violation logging
```

**Files to modify**:
- `src/supabase/functions/server/index.tsx` (line 60-80)

---

#### 1.4 Add Moderation API Endpoints [Day 3-4]
**Current State**: Database tables exist, no API to use them
**Impact**: Can't moderate content, required for COPPA/safety

```
Tasks:
□ Create GET /moderation/queue endpoint
□ Create POST /moderation/review endpoint
□ Create GET /moderation/history endpoint
□ Add admin-only authorization
□ Connect to existing database tables
□ Add moderation action audit logging
□ Test full moderation workflow
```

**Files to create**:
- `src/supabase/functions/server/moderation-routes.ts`

**Database tables already exist**:
- `content_moderation_queue`
- `user_moderation_status`
- `user_moderation_history`

---

### Week 2: Accessibility & Testing

#### 1.5 Add ARIA Labels [CRITICAL - Day 5-6]
**Current State**: 0 aria-label implementations
**Impact**: Screen reader users completely blocked

```
Tasks:
□ Audit all interactive elements (buttons, links, inputs)
□ Add aria-label to icon-only buttons
□ Add aria-describedby for form fields
□ Add aria-live regions for dynamic content
□ Add role attributes where missing
□ Run axe-core automated audit
□ Fix all WCAG AA violations
```

**Priority Components** (most used):
1. `BottomNavigation.tsx` - navigation labels
2. `AIIntakeChat.tsx` - chat input, send button
3. `MobileHeader.tsx` - menu buttons
4. All form components - validation messages

**Success Criteria**: axe-core reports 0 critical/serious violations

---

#### 1.6 Define Form Validation UI [Day 6-7]
**Current State**: Validation runs but users see nothing
**Impact**: Users don't know why forms fail

```
Tasks:
□ Create FormError component with consistent styling
□ Add inline validation messages under fields
□ Add form-level error summary
□ Style invalid state for inputs (red border)
□ Add aria-invalid and aria-describedby
□ Test with screen reader
```

**Files to create**:
- `src/components/ui/FormError.tsx`
- `src/components/ui/FormField.tsx` (wrapper with validation)

---

#### 1.7 Achieve Critical Path Test Coverage [Day 7-10]
**Current State**: ~15% coverage
**Target**: 80% on critical paths

```
Priority test files to create:
□ src/test/email-sending.test.ts
□ src/test/rate-limiter.test.ts
□ src/test/stripe-webhook.test.ts
□ src/test/ai-chat-flow.test.ts
□ src/test/provider-access.test.ts
□ src/test/crisis-detection.test.ts
□ src/test/subscription-flow.test.ts
```

**Success Criteria**: 80% coverage on auth, payments, AI, crisis detection

---

## PHASE 2: CORE IMPROVEMENTS (Week 3-4)
*Upgrade core systems for quality and reliability*

### Week 3: AI & Memory System

#### 2.1 Upgrade to AI Embeddings [HIGH - Day 11-14]
**Current State**: TF-IDF keyword matching
**Impact**: Can't semantically understand "overwhelmed" = "sensory overload"

```
Tasks:
□ Add OpenAI embeddings API integration
□ Create embedding generation function
□ Migrate memory storage to include embeddings
□ Implement cosine similarity search
□ Add embedding cache layer
□ Benchmark: TF-IDF vs embeddings accuracy
□ A/B test response quality
```

**Files to modify**:
- `src/lib/memory-system.ts`
- `src/supabase/functions/server/index.tsx` (AI routes)

**New dependencies**:
```bash
npm install openai  # for embeddings API
```

**Database migration**:
```sql
ALTER TABLE user_memories ADD COLUMN embedding vector(1536);
CREATE INDEX ON user_memories USING ivfflat (embedding vector_cosine_ops);
```

---

#### 2.2 Add AI Response Validation [Day 14-16]
**Current State**: No fact-checking against memory
**Impact**: AI could contradict known facts about child

```
Tasks:
□ Extract claims from AI response
□ Cross-reference with user memory
□ Flag contradictions before sending
□ Add confidence scoring
□ Log validation failures for review
□ Create fallback for low-confidence responses
```

**Architecture**:
```
User Message → AI Response → Validator →
  ├─ High confidence → Send
  ├─ Medium confidence → Add caveat
  └─ Low confidence/contradiction → Regenerate or flag
```

---

#### 2.3 Implement AI Fact Extraction [Day 16-17]
**Current State**: Regex-only extraction
**Impact**: Misses 40%+ of useful context

```
Tasks:
□ Create structured extraction prompt
□ Call AI for fact extraction (not regex)
□ Validate extracted facts
□ Store with confidence scores
□ Add deduplication logic
□ Test extraction accuracy
```

**Prompt Template**:
```
Extract key facts from this conversation about a child with special needs.
Return JSON with: fact, category, confidence, source_message_id

Categories: diagnosis, behavior, trigger, preference, routine, medication,
           therapy, school, family, milestone, strength, challenge
```

---

### Week 4: Frontend Architecture

#### 2.4 Split Giant Components [Day 18-20]
**Current State**: PlanTabEnhanced.tsx is 134K lines
**Impact**: Unmaintainable, slow builds

```
Components to split:
□ PlanTabEnhanced.tsx → 10+ sub-components
□ App.tsx (1740 lines) → Route components
□ AIIntakeChat.tsx → ChatMessage, ChatInput, ChatHeader
□ ProviderPortal.tsx → Tabs as separate components
```

**Pattern to follow**:
```typescript
// Before: One massive file
export function PlanTabEnhanced() { /* 3000 lines */ }

// After: Composed components
export function PlanTabEnhanced() {
  return (
    <PlanHeader />
    <PlanTabs>
      <RoutineBuilder />
      <GoalTracker />
      <ProgressCharts />
    </PlanTabs>
    <PlanActions />
  );
}
```

---

#### 2.5 Consolidate State Management [Day 20-22]
**Current State**: Mix of Zustand + Context + localStorage (409 usages)
**Impact**: No single source of truth, bugs from stale state

```
Tasks:
□ Audit all state locations
□ Choose primary pattern (recommend Zustand)
□ Create migration plan
□ Move auth state to Zustand
□ Move user preferences to Zustand
□ Remove localStorage for sensitive data
□ Add persistence middleware for Zustand
```

**Target Architecture**:
```
Zustand Stores:
├── useAuthStore (user, session, MFA)
├── useSubscriptionStore (tier, features)
├── usePreferencesStore (settings, child profiles)
├── useAIStore (memories, conversation)
└── useUIStore (modals, navigation)
```

---

#### 2.6 Extract Reusable Hooks [Day 22-24]
**Current State**: useState(false) 413 times for modals
**Impact**: Duplicated logic, inconsistent patterns

```
Hooks to create:
□ useModal(initialState) - open/close/toggle
□ useAsync(asyncFn) - loading/error/data
□ useForm(schema) - validation, submission
□ useDebounce(value, delay)
□ usePagination(items, pageSize)
□ useLocalStorage(key, defaultValue) - typed wrapper
```

**Files to create**:
- `src/hooks/useModal.ts`
- `src/hooks/useAsync.ts`
- `src/hooks/useForm.ts`
- `src/hooks/index.ts` (barrel export)

---

## PHASE 3: STAKEHOLDER ALIGNMENT (Week 5-8)
*Build features critical for each stakeholder to reach 9/10*

### Week 5-6: Fiscal Agents & Payors (HIGHEST ROI)

#### 3.1 Build EVV System for Acumen/DCI [CRITICAL - Day 25-32]
**Current State**: Promised but not built (6.5/10)
**Impact**: Partnership at risk, major revenue blocker

```
Features to build:
□ Service clock in/out UI
□ GPS location capture (with consent)
□ Service code selection
□ Duration auto-calculation
□ Supervisor approval workflow
□ Export to EVV-compatible format
□ Waiver-specific templates (by state)
□ Audit trail for compliance
```

**Files to create**:
- `src/components/evv/EVVTimeEntry.tsx`
- `src/components/evv/EVVDashboard.tsx`
- `src/components/evv/ServiceCodeSelector.tsx`
- `src/lib/evv-export.ts`
- `supabase/migrations/020_evv_system.sql`

**Database Schema**:
```sql
CREATE TABLE evv_time_entries (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  provider_id UUID REFERENCES providers,
  child_id UUID REFERENCES children,
  service_code VARCHAR(20),
  clock_in TIMESTAMPTZ,
  clock_out TIMESTAMPTZ,
  location_in GEOGRAPHY(POINT),
  location_out GEOGRAPHY(POINT),
  notes TEXT,
  supervisor_approved BOOLEAN DEFAULT FALSE,
  supervisor_id UUID,
  approved_at TIMESTAMPTZ,
  waiver_type VARCHAR(50),
  status VARCHAR(20) DEFAULT 'pending'
);
```

---

#### 3.2 Build Payor Utilization Dashboard [Day 32-38]
**Current State**: Can't verify claims, no outcomes data (5.5/10)
**Impact**: Insurance companies can't use product

```
Features to build:
□ Member utilization reports
□ Claims verification lookup
□ Outcomes by provider
□ Cost-effectiveness metrics
□ Network adequacy reporting
□ Authorization management
□ Denial tracking
□ ROI calculator
```

**Files to create**:
- `src/pages/PayorPortal.tsx`
- `src/components/payor/UtilizationReport.tsx`
- `src/components/payor/ClaimsLookup.tsx`
- `src/components/payor/OutcomesDashboard.tsx`
- `src/supabase/functions/server/payor-routes.ts`

---

### Week 7-8: Healthcare Providers

#### 3.3 Add Provider Credential Verification [Day 39-42]
**Current State**: Placeholder only, "pending" forever (7.5/10)
**Impact**: Can't trust provider claims

```
Tasks:
□ Integrate NPI Registry API
□ Integrate state license verification (NPDB)
□ Add credential upload and review workflow
□ Auto-verify NPI numbers
□ Manual review queue for edge cases
□ Credential expiration tracking
□ Re-verification reminders
```

**API Integration**:
```typescript
// NPI Registry (free, public)
const NPI_API = 'https://npiregistry.cms.hhs.gov/api/';

async function verifyNPI(npi: string): Promise<{
  valid: boolean;
  name: string;
  credential: string;
  specialty: string;
}> {
  const response = await fetch(`${NPI_API}?number=${npi}&version=2.1`);
  // Parse and validate response
}
```

---

#### 3.4 Add Developmental Milestone Tracking [Day 42-46]
**Current State**: Nothing for pediatricians (5/10)
**Impact**: Can't support medical workflow

```
Features to build:
□ Age-appropriate milestone checklists
□ Red flag alerts for delays
□ Developmental age calculator
□ Progress visualization
□ Pediatrician report export
□ Evidence citations
```

**Milestones to track** (CDC-based):
- Gross motor (rolling, sitting, walking)
- Fine motor (grasping, drawing)
- Language (babbling, words, sentences)
- Social/emotional (smiling, sharing)
- Cognitive (object permanence, problem-solving)

**Files to create**:
- `src/components/milestones/MilestoneTracker.tsx`
- `src/components/milestones/RedFlagAlerts.tsx`
- `src/lib/milestone-data.ts` (CDC milestone database)

---

#### 3.5 Add Therapy-Specific Templates [Day 46-50]
**Current State**: Generic templates only (7/10)
**Impact**: OT/Speech therapists need specific tools

```
Templates to create:

Speech-Language:
□ Articulation chart (phonemes by position)
□ Language sample analysis
□ AAC device tracking
□ Oral motor exercises

Occupational Therapy:
□ Sensory profile
□ Fine motor assessment
□ ADL (Activities of Daily Living) checklist
□ Handwriting samples

Mental Health:
□ Safety plan template
□ Coping skills inventory
□ Mood tracking
□ Session SOAP notes
```

**Files to create**:
- `src/components/therapy/SpeechTemplates.tsx`
- `src/components/therapy/OTTemplates.tsx`
- `src/components/therapy/MentalHealthTemplates.tsx`

---

## PHASE 4: POLISH & OPTIMIZATION (Week 9-12)
*Achieve excellence across all dimensions*

### Week 9-10: Performance & Mobile

#### 4.1 Activate Performance Monitoring [Day 51-54]
**Current State**: Utils exist but not connected
**Target**: Real-time performance visibility

```
Tasks:
□ Integrate performance hooks into App.tsx
□ Add Core Web Vitals tracking
□ Connect to analytics dashboard
□ Set performance budgets
□ Add alerting for degradation
□ Create performance dashboard
```

---

#### 4.2 Optimize Mobile Performance [Day 54-58]
**Current State**: 8.5/10
**Target**: 10/10

```
Tasks:
□ Verify all PWA icons exist
□ Test offline functionality
□ Optimize images (WebP, AVIF)
□ Add skeleton loading states
□ Reduce JavaScript bundle size
□ Test on low-end devices
□ Achieve LCP < 2.5s on 3G
```

---

### Week 11-12: UX & Strategy

#### 4.3 Improve Feature Discovery [Day 59-64]
**Current State**: 6.5/10
**Target**: 9/10

```
Tasks:
□ Add post-onboarding feature tour
□ Add "What's New" indicators
□ Reorganize More menu with categories
□ Add command palette (Cmd+K)
□ Add contextual feature suggestions
□ A/B test paywall timing
```

---

#### 4.4 VC Dashboard Enhancements [Day 64-68]
**Current State**: 8/10
**Target**: 10/10

```
Tasks:
□ Add viral coefficient trending over time
□ Add cohort-based unit economics
□ Add churn analysis dashboard
□ Add CAC by channel over time
□ Add payback period curves
□ Add runway projections with scenarios
```

---

#### 4.5 Final QA & Launch Prep [Day 68-72]

```
Tasks:
□ Full regression test
□ Security penetration test
□ Load testing (1000 concurrent users)
□ Accessibility audit (manual)
□ Mobile device lab testing
□ Documentation review
□ Runbook creation
□ On-call rotation setup
```

---

## SUCCESS METRICS

### By End of Phase 1 (Week 2):
- [ ] All transactional emails delivering
- [ ] Rate limiter fails closed
- [ ] axe-core reports 0 critical violations
- [ ] 80% test coverage on critical paths

### By End of Phase 2 (Week 4):
- [ ] AI using semantic embeddings
- [ ] No component > 500 lines
- [ ] Single state management pattern
- [ ] Response validation active

### By End of Phase 3 (Week 8):
- [ ] EVV system live for Acumen pilot
- [ ] Payor dashboard with utilization reports
- [ ] Provider verification working
- [ ] Milestone tracking for pediatricians

### By End of Phase 4 (Week 12):
- [ ] All dimensions 9/10 or higher
- [ ] LCP < 2.5s on mobile
- [ ] Feature discovery score > 8/10
- [ ] Stakeholder NPS > 50

---

## RESOURCE REQUIREMENTS

| Phase | Engineers | Weeks | Total Eng-Weeks |
|-------|-----------|-------|-----------------|
| Phase 1 | 2 | 2 | 4 |
| Phase 2 | 2 | 2 | 4 |
| Phase 3 | 3 | 4 | 12 |
| Phase 4 | 2 | 4 | 8 |
| **Total** | - | 12 | **28 eng-weeks** |

---

## RISK MITIGATION

| Risk | Mitigation |
|------|------------|
| Email provider issues | Have backup (Resend + SendGrid) |
| AI embedding costs | Cache aggressively, batch requests |
| EVV complexity by state | Start with 3 states, expand |
| Test coverage time | Prioritize critical paths only |
| Performance regression | Add performance gates in CI |

---

## DECISION LOG

| Decision | Date | Rationale |
|----------|------|-----------|
| Resend for email | TBD | Best DX, reasonable pricing |
| Zustand for state | TBD | Simpler than Redux, better than Context |
| OpenAI for embeddings | TBD | Best quality, reasonable cost |
| Start EVV with 3 states | TBD | CA, TX, FL highest volume |

---

*Document Version: 1.0*
*Last Updated: 2026-01-29*
*Next Review: Weekly during implementation*
