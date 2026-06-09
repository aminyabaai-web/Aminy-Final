# Aminy — Revenue & Strategy (living doc)
_Last updated 2026-06-05. Deep-dive audit by Claude Code. Companion to HANDOFF.md (engineering) and CLAUDE.md (architecture)._

## ⚠️ Ground truth
- **There is NO live Aminy/AACT integration or deal yet.** All AACT/practice-in-a-box infrastructure in code (`PARTNER_CONFIGS.aact`, `AACTPartnerSetup`, `?org=aact`) is **aspirational / demo-gated**. The app must NOT present a live AACT partnership as real to users until a deal exists.
- The app does **NOT** diagnose. Screening (M-CHAT, developmental screeners) + refer to real evaluation only. The in-app "$229 Diagnostic" visit is **deferred** (`diagnostic_deep_review.isPublicMenu=false`) — real dx needs scarce diagnosticians (~$1,500+ cash).
- **v2.0.0** as of 2026-06-05 (not beta). Build: ✅ · TypeScript: 0 errors · Tests: 345/345 · npm audit: 0 vulns.

---

## Porter's Five Forces — Honest Assessment

### 1. Threat of New Entrants — MODERATE (18-24 month lead)
**Moats:**
- **AI Memory lock-in**: 5K–15K memory facts per paid tier. Families who use Aminy for 4+ weeks accumulate behavioral history, care plans, screening data. Switching cost = re-entering weeks of context. Not insurmountable, but real.
- **Clinical-grade screening funnel**: Free M-CHAT / developmental screener is organic (panicked parents Google "autism signs") and high-intent. No competitor combines a free validated screener with an AI companion in one flow.
- **Provider relationship infrastructure**: Credentialing, EVV, RBT supervision, session notes, payer rails — all scaffolded. Expensive to replicate. A new entrant needs 12–18 months and $5M+ to rebuild.

**Risks:**
- Screening instruments are public domain. Any well-funded competitor can clone the surface in 6 months.
- AI companion is commoditizing (Claude/GPT wrappers proliferating). Differentiation is clinical context + ABA-specific prompting, which is copyable.
- **Verdict**: Moat is real but not deep. Own the data (behavioral + screening) and provider relationships before competitors arrive with bigger checks.

### 2. Bargaining Power of Suppliers (BCBAs/Providers) — HIGH
- **Supply scarcity is severe**: 115-day average waitlist, 43% ABA utilization, ABA therapist shortage worsening. Providers hold power because demand >> supply.
- **AACT dependency risk**: The insured marketplace rail (AHCCCS + 9 payers, 5% take) requires a live AACT/Rise deal that doesn't exist yet. If AACT builds its own app or contracts with Headway, Aminy's insured strategy is at risk.
- **Mitigation**: Cash-pay marketplace (25% take, no payer contract needed) + B2B SaaS (per-org licensing) reduce AACT dependency. Independent provider onboarding is the path.
- **Verdict**: Close AACT deal fast OR pivot to independent provider network. Don't let the pitch hinge on a deal that isn't signed.

### 3. Bargaining Power of Buyers (Families) — MODERATE
- **Free users**: Very low switching cost. 3 AI messages/day, 1 child, no memory persistence past 50 facts. Easy to churn.
- **Paid users**: Moderate lock-in. Memory facts, care plans, vault documents, progress history all in Aminy. Switching means starting over. But no annual contract enforced, so churn is month-to-month.
- **Emotional moat**: The "exhale test" design philosophy (every element should help the parent breathe easier) creates brand loyalty that's hard to quantify but real. Parents in crisis stick with what works.
- **Verdict**: Invest in features that increase data gravity early: memory, vault documents, progress reports. Each one raises switching cost.

### 4. Threat of Substitutes — HIGH
| Competitor | Strength | Aminy's Counter |
|---|---|---|
| **Headway** ($2.3B, mental health billing rail) | 70 payer contracts, 60K providers, float capital | ABA-specific (Medicaid/waiver), family-first AI, not just billing |
| **Rethink BH** (ABA EMR, AACT/Rise partner) | Owns provider backend, real claims/EVV, AACT relationship | No consumer app; Aminy is family-facing, bidirectional |
| **Bevel** (~$50M Series B, pediatric behavioral AI) | Well-funded, consumer-friendly, broader (ADHD/anxiety) | Aminy: ABA-specific M-CHAT + care plans, marketplace, Jr child app |
| **Brightline / Talkspace for Kids** | Telehealth marketplace for therapy | Not ABA-specific, no screener funnel, no parent AI companion |

**What Aminy has that none of them do**: ABA-specific screening → AI companion → marketplace → child app (Aminy Jr) → provider portal — all in one product.

### 5. Competitive Rivalry — FRAGMENTED (not winner-take-all)
- ~10,000 ABA clinics in the US. No single dominant family app. Market is NOT consolidating on the consumer side.
- **Regional dominance is achievable** without needing to beat Rethink/CentralReach nationally. Win AZ + CA first (AHCCCS/Medi-Cal concentration), then expand.
- **Winner-take-all does NOT apply** because supply scarcity (waitlist) matters more than platform switching for most families. A parent who can't get an appointment with a Rethink-affiliated provider will gladly book through Aminy's cash-pay marketplace.

---

## McKinsey 3-Horizon Framework

### Horizon 1: Now → 6 months (Core Revenue Engine)
**Goal: $100K–300K MRR, 1,000–5,000 families**

| Revenue lane | Status | Action needed |
|---|---|---|
| **B2C subs** ($14.99/$29.99/$49.99/mo) | ✅ Live, Stripe configured | Drive trial → paid conversion via push notifications + email |
| **Cash-pay marketplace** (25% take) | ✅ Code live | Onboard 10–20 independent BCBAs; no payer contract needed |
| **Free screening funnel** → trial conversion | ✅ M-CHAT + developmental screener | Optimize: A/B test CTA copy, add social proof ("3,847 families screened this month") |
| **Referral program** (14-day Pro trial reward) | ✅ Scaffolded | Launch with 5 beta families; measure K-factor |

**Critical blockers for H1:**
1. Stripe price IDs in production (env vars `VITE_STRIPE_PRICE_*`) — zero subscriptions possible without this
2. At least 5 real independent BCBAs onboarded to marketplace (supply before demand ads)
3. Push `supabase functions deploy` for all pending edge functions

### Horizon 2: 6–18 months (Scale & Defend)
**Goal: $1M–3M ARR, 10K+ families, 5–10 clinic B2B contracts**

| Initiative | Why it matters | Blocked on |
|---|---|---|
| **B2B SaaS** ($49/seat/mo, orgs 5–100 seats) | 75%+ gross margin, longer retention, ACV $2.9K–$59K/org | Sales outreach to AZ/CA clinic networks |
| **Rethink EMR sync** (bidirectional family ↔ provider) | Removes AACT dependency; any Rethink-using clinic is a target | Rethink sandbox creds + API agreement |
| **AACT deal** (insured rail, 5% take, AHCCCS + 9 payers) | Unlocks insured families at low take rate → volume | Legal negotiation; close before Rethink builds it |
| **Payer-type funnel** (insured → coverage tools, cash → upgrade) | Highest near-term ARPU lever; insured users routed wrong today | 2-week eng sprint (funnel already scaffolded) |
| **EVV integration** (Sandata/HHAeXchange for DCI) | Required for AHCCCS sessions; blocks any AACT deal | Provider ops hire |

### Horizon 3: 18–36 months (Big Bet)
**Goal: $10M+ ARR, Series A/B, payer network leasing**

- **Payer network leasing** (float provider payouts like Headway): Requires $50M+ capital + 70-payer negotiation. Do NOT claim as live. Roadmap only.
- **B2G / school district contracts**: IDEA/IEP compliance tools → annual district contracts ($50K–$500K/yr). Aminy Jr + care coordinator + IEP report export positions this.
- **International** (UK/Canada): Aminy Jr + AI companion are geography-agnostic; regulation-heavy but replicable.
- **AI care coordinator** (async Family Plan feature at $49.99/mo): BCBA-supervised AI drafts responses, parents ask questions, licensed BCBA approves. Scales human oversight.

---

## Consumer Tier Model (v2 — implemented)
| | Free | Core $14.99 | Pro $29.99 | Family $49.99 |
|---|---|---|---|---|
| AI msgs/day | 3 (hard) | Unlimited* | Unlimited* | Unlimited* |
| Children | 1 | 2 | 3 | Unlimited |
| Telehealth booking | ✅ | ✅ | ✅ | ✅ |
| Session discount (cash-pay only) | 0% | 10% | 20% | 30% |
| Memory facts | 50 | 5,000 | 15,000 | Unlimited |
| Vault + AI doc analysis | ❌ | ✅ | ✅ | ✅ |
| Clinical/IEP reports + provider sharing | ❌ | ❌ | ✅ | ✅ |

\*Marketed "Unlimited" but **enforced fair-use ceiling = 100 msgs/day** (`FAIR_USE_AI_DAILY_CAP`, anti-abuse/COGS). Display stays "Unlimited".

- **Trial: 7 days**, no credit card required. Annual: Core $129 / Pro $279 / Family $479.
- **Referral reward: 14-day Pro trial** — separate from the standard trial; internally consistent.
- **Session discounts: platform-absorbed, cash-pay only, margin-clamped** (platform keeps ≥ max($5, 8% of base)).

---

## Marketplace Economics
- `PLATFORM_FEE_RATES`: cash_pay 25% / insured 10% / aact_pilot 5% (cash-pay lowered from 35% June 2026 — competitive for solo BCBAs, still strong margin). Provider payout is fixed; platform take = remainder.
- **Session discounts are PLATFORM-ABSORBED** (provider always paid full) and **cash-pay ONLY**.
- Worked example: Standard $149 session, provider payout $95. Family Plan 30% discount → family pays $106.92, platform keeps $11.92 (≥ $5 floor), provider gets $95.

---

## B2B — Two Distinct Lanes
- **Org seat-licensing** (`org-licensing.ts`): $49/seat/mo, min 5 seats, 15% annual (lowered June 2026 — accessible to small ABA clinics, PLG-friendly entry); target = clinics/schools/agencies. `OrgAdminDashboard`.
- **Provider marketplace / practice-in-a-box** (take-rate rails): target = independent BCBAs. For clinics, choose ONE model (seat vs. take-rate) to avoid cannibalization.
- **AACT/Rise pilot** (`aact_pilot` rail): 5% take, pre-contracted with 10 payers. Aspirational — gated on a signed deal.

---

## VC Pitch Narrative (3 fixes needed)

### Fix 1: Lead with utilization, not billing
**Wrong**: "We're building a billing rail for ABA like Headway for mental health."
**Right**: "We solve the real ABA bottleneck — 115-day waitlist, 43% utilization — by owning family engagement and demand generation. Every session we fill is revenue providers couldn't capture alone."

### Fix 2: Separate the three revenue lanes clearly
For investors, state each lane's CAC, ARPU, gross margin, and stage:
- **Lane 1 (B2C)**: CAC ~$15–50 (organic/screening funnel), ARPU $180/yr (Core avg), GM 85%+ (SaaS), **Stage: launched, pre-revenue**
- **Lane 2 (B2B SaaS)**: CAC ~$500–2K (sales-assisted), ACV $12K–$60K/org, GM 75%+, **Stage: scaffolded, pre-revenue**
- **Lane 3 (Marketplace)**: CAC = provider onboarding cost, take 25%, GM ~25%, **Stage: code live, 0 providers**

### Fix 3: Be honest about AACT
Say: *"We have a working prototype partnership framework and active conversations with AACT/Rise. The deal is not signed. Our go-to-market does NOT depend on it — we have a path to $300K MRR with independent providers and direct B2C before any partner deal closes."*

---

## Open decisions / tasks
- (#11) Practice-in-a-box → reframed to demand/engagement/utilization layer; gated on a real AACT deal.
- (#13) Tier config consolidated (single source of truth in `tier-utils.ts`; 24-test drift guard).
- Insured spread-economics: AACT actuals — ABA 45-60% gross at 43% util; HCBS 28-35%; Speech ~50% at 51% util; CAC ~$3.5-6K; assessment→active 65-72%; 115-day waitlist = cash-flow lag.
- **Pending owner actions**: Stripe price IDs, `supabase functions deploy`, rotate Twilio token, Sentry DSN, branch protection on `main`.
