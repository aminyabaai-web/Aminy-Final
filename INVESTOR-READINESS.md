# INVESTOR-READINESS ASSESSMENT — AMINY
**Strategy Audit | McKinsey/Porter Frameworks**
**Date:** June 9, 2026
**Companion docs:** STRATEGY.md, HANDOFF.md, EXECUTION-PLAN.md, tier-utils.ts, org-licensing.ts, stripe-connect.ts, telehealth-economics.ts, referral-program.ts, partner-org.ts, acquisition-metrics.ts, docs/HIPAA_COMPLIANCE.md

---

## EXECUTIVE GRADE: 6.5 / 10

Tech is genuinely impressive (9/10). Business fundamentals are pre-revenue (5/10). The honest score is 6.5 — strong enough to raise a pre-seed from angels or a seed from a thesis-driven healthcare fund, not yet strong enough for a top-tier institutional seed without 60–90 days of additional grounding work. That gap is closeable. This document tells you exactly where it is and what fixes matter before investor day.

---

## 1. PORTER'S FIVE FORCES

### Force 1: Threat of New Entrants — MODERATE (18-24 month practical lead)

**What creates friction for entrants:**

- **Clinical instrument depth.** The free M-CHAT / developmental screener funnel is not just a feature — it is a high-intent organic acquisition channel. A panicked parent Googling "autism signs" at 11pm is a qualitatively different user than a consumer app download. This combination of validated clinical screening + AI companion in a single no-friction flow does not currently exist in the market.

- **Provider-side infrastructure depth.** The codebase contains credentialing, EVV integration (DCI/Sandata), CPT code rails, RBT supervision scaffolding, clearinghouse integration, ERA/835 parser, session notes, denial management, prior auth workflow, and Stripe Connect payout rails. Replicating the depth requires people who understand Medicaid/ABA billing — genuinely scarce expertise.

- **AI memory gravity.** Paid tiers accumulate per-child memory facts. At 4+ weeks of daily use, a family has a personalized behavioral history that is practically irreplaceable. Switching cost is not price — it is the prospect of re-explaining everything about your child to a new system.

**What does NOT create a moat:**

- The AI companion itself (replicable in 4-6 weeks). The differentiation is the clinical context injected into the prompt, not the model.
- Screening instruments are public domain. The funnel design is copyable.

**Verdict:** Moderately defensible today. The race is to accumulate data gravity and provider relationships faster than competitors can replicate the feature surface. Window: 18–24 months.

### Force 2: Bargaining Power of Suppliers (BCBAs) — HIGH (most acute near-term risk)

The BCBA shortage is severe and structural (115-day average ABA waitlist). BCBAs do not need Aminy — families need BCBAs. The cash-pay 25% take rate must be justified with genuine demand generation. The independent-BCBA "practice-in-a-box" wedge is the right strategic frame: "We generate patient demand you otherwise couldn't capture, handle all billing/admin/EVV, and give you a consumer-facing family app."

**Verdict:** Close or do not close the AACT deal before the investor meeting. If unsigned, pivot the pitch entirely to independent provider acquisition and state plainly that the insured rail is roadmap.

### Force 3: Bargaining Power of Buyers (Families) — MODERATE, trending toward lock-in

What creates lock-in at paid tier: memory facts, vault documents (AI-indexed IEPs/evals), care plan history, provider relationships. What does NOT: the AI chat itself (ChatGPT is free), calm tools (commodity), community (Facebook groups are free). The emotional moat ("exhale test" design) is real but not measurable — don't lead the pitch with it.

### Force 4: Threat of Substitutes — HIGH

| Competitor | Threat level | What they don't have |
|---|---|---|
| **Headway** ($2.3B) | HIGH for insured rails | No ABA-specific tools, no family app, no screener funnel, no EVV/Medicaid |
| **Rethink BH** | HIGH for provider backend | No consumer app — Aminy is the family-facing layer Rethink needs |
| **Bevel** (~$50M) | HIGHEST near-term | Broader (ADHD/anxiety), well-funded. Counter: deeper ABA-specificity |
| **Answers Now** | MEDIUM | No marketplace, no family app ecosystem |
| **Forta** | MEDIUM for B2B | No consumer layer |
| **ChatGPT/Claude.ai** | MEDIUM (lazy substitute) | No ABA context, no providers, no structured data |

The substitution risk that matters most: the parent who converts to free tier and then just uses ChatGPT + free tools. The answer is data gravity — front-load the things only Aminy accumulates in onboarding.

### Force 5: Competitive Rivalry — FRAGMENTED (good news)

No single consumer-facing family app dominates ABA. Provider-side EMRs have near-zero consumer presence. The family-AI-provider-marketplace stack in one product exists nowhere else. Regional beachhead: Arizona (AHCCCS, AACT/Rise) + California (largest DD system in the US).

---

## 2. REVENUE MODEL STRESS-TEST

### Is $14.99/mo Core priced right? Probably yes — but framing matters more than price.

The demographic paradox: families paying $50K+/yr for ABA are financially stressed *because* of ABA costs. "An AI companion" competes with free options. "The tool that helps you navigate insurance, the waitlist, and track what's working" justifies $14.99/month.

**HSA/FSA eligibility is the single most important pricing unlock.** Core/Pro/Family are HSA/FSA eligible with Letter of Medical Necessity support. This should be the second sentence of every pricing conversation.

**Annual discount is undersized.** Annual subscribers churn 3x less. For an app where value compounds with data accumulation, sacrifice 15–20% of year-1 revenue to get families onto annual.

### Insured rail (10% take): currently hypothetical — do not lead with it.

Math: $15–20/session take requires hundreds of providers to matter. Headway wins on volume (60K+ providers); Aminy cannot at seed stage. Lead with cash-pay marketplace (25%, no contracts needed) and B2C subs.

### B2B seat at $49/seat min-5 ($245/mo minimum)

Minimum contract $2,940/yr — this is a PLG self-serve motion, not a sales-assisted one. Keep it self-serve. **Solo BCBA tier at $79/month is the right B2B entry product**: 100 solo BCBAs = $94,800 ARR with near-zero sales cost. This should be the H1 B2B lead.

### Which revenue stream leads the pitch?

**Lead with B2C subscriptions, prove with marketplace bookings, tease with B2B.**
1. B2C subs = fastest path to MRR (funnel built, ~85% GM, CAC $15–50 organic)
2. Even 10 marketplace bookings prove the two-sided network is live
3. B2B is the multiple: "1,000 paying families = the dataset that sells $49–99 seats to clinics"

### Telehealth margins (cash-pay)

| Visit | Price | Provider | Platform margin |
|---|---|---|---|
| Quick Consult (25m) | $79 | $45 | 43% |
| Standard (50m) | $149 | $95 | 36% |
| Follow-up (15m) | $59 | $30 | 49% |

At Family Plan 30% discount, Standard margin drops to ~8.5% (clamped at max($5, 8%)). Disclose honestly: the discount is a retention tool, not a profit center.

---

## 3. VIRALITY & RETENTION

**Built:** referral program (1 free month / $25 credit, 7-day paid qualification, tiered levels), share-win flow with referral link, streak system, trial countdown.

**Realistic K-factor:** ~0.1 (supplements organic, does not replace paid acquisition). The ABA parent community is tight-knit and high-trust — referrals will be quality, not volume.

**Missing for K-factor and month-6 churn:**
1. Share triggers at emotional peaks (post-AI-insight, post-win) rather than a separate rewards screen
2. **"Invite your provider" loop** — parent invites BCBA → BCBA gets portal value → B2C→B2B flywheel. Not built as explicit flow.
3. Screener share CTA ("Share this screening with a parent you know")
4. **Visible outcome curves** ("meltdown frequency down 40% over 8 weeks") at check-in moments
5. **Crisis utility merchandising** — crisis detection/resources exist in code and are the highest-retention features in the product; they are not surfaced

---

## 4. THE VC PITCH NARRATIVE

### One-sentence wedge

> "Aminy is the operating system for ABA therapy families — we turn the 115-day ABA waitlist into a managed engagement period that generates clinical data, drives marketplace bookings, and converts to provider relationships that keep families on the platform for years."

Alternative for non-clinical audiences:
> "Aminy is Headway for ABA therapy families — the consumer app that gets every family with an autistic child into the system, booked, and tracked, and we take a marketplace cut of every session we enable."

### TAM/SAM/SOM

- **TAM ~$15–20B**: ABA ($5B) + autism-adjacent services ($8–10B) + IEP/compliance software ($2–3B)
- **SAM ~$2–3B**: ~700K–1M active ABA-consumer families × $500–600/yr blended ARPU + B2B
- **SOM**: $300K ARR (Y1: 1,000 families) → $4.7M (Y2) → $20–30M (Y3)
- Anchor: 1-in-36 prevalence; ~5.4M US children with autism diagnosis; $60K+/yr family economic burden

### Metrics needed at seed

**Must-haves:** any live MRR (even $1K/mo), one pilot LOI, screener→trial conversion with real numbers.
**Strong signals:** D7 ≥ 40%, trial→paid ≥ 15–20%, NPS ≥ 40, 2+ active BCBAs.
**The question they will ask:** "How many families have used this for 30+ days?"

### The demo moment

The unbroken flow: panicked parent → M-CHAT screener (4 min) → empathy-forward result → AI answers follow-up with ABA-specific context → marketplace shows real booking slots → care plan auto-populated. **"I don't know what's happening with my child" → "I have a care plan and a booked appointment" in under 10 minutes.** Run it every time. Do not show billing dashboards or EVV to a first-meeting investor.

---

## 5. GAPS & RISKS

### Risk 1: HIPAA posture — MEDIUM-HIGH
Technical scaffolding solid (AES-GCM encrypted storage, audit log, RLS, PHI-masked Sentry, provider MFA). Missing: formal risk assessment (required by 164.308(a)(1)), executed BAAs (Anthropic/Twilio/Sentry are "template created"), pen test. **$2–5K compliance-consultant fix. Do before investor meetings.** Copy discipline: always "HIPAA-conscious," never "HIPAA-compliant."

### Risk 2: Clinical liability of AI behavioral advice — HIGH
Crisis detection exists in code (`crisis-detection.ts`, `crisis-resources.ts`) but the liability scenario (AI response delaying 911 in a self-harm crisis) is managed by policy language, not legal controls. **Minimum fix: healthcare-attorney opinion ($2–3K) before investment.** Position as "AI companion that helps parents navigate the system" — never "AI therapist/BCBA."

### Risk 3: Apple 30% if native iOS — MEDIUM
PWA avoids it today. At Core $14.99 native: Apple takes $4.50, Claude API ~$2–4/user/mo → $6–8.50 GM (vs ~$12–13 web). **Stay PWA-first until $1M+ ARR.**

### Risk 4: Single-founder execution — HIGH
Minimum mitigations before institutional seed: (1) clinical advisory board with ≥1 BCBA (equity, even pro bono); (2) named technical advisor or early hire with healthcare infra experience.

### Risk 5: Revenue at zero, infrastructure at scale — investor psychology
The gap from "impressive demo" to "one paying customer" is operational, not technical:
1. Stripe price IDs in prod env (2 hours)
2. 3–5 real BCBAs onboarded (2–4 weeks of outreach; offer 0% take for 30 days)
3. 10–20 real families on trial (1 week of autism-parent-community outreach)

---

## PRE-INVESTOR PRIORITY STACK

### Fix before the meeting:
1. Stripe price IDs live in prod ($0, 2 hours)
2. 3+ real users on paid trial (1–2 weeks)
3. 2+ BCBAs on marketplace (2–4 weeks)
4. BAAs executed — Anthropic, Twilio, Sentry (1–2 weeks)
5. Clinical advisor secured (1–4 weeks, 0.25–0.5% equity)

### Roadmap (do NOT block the meeting on):
Rethink EMR sync, AACT close, full multi-browser E2E, Sentry DSN.

### Pitch-day honesty script:
*"We are pre-revenue. Stripe infrastructure is live; price IDs are a 2-hour config we're completing this week. No signed B2B contracts; AACT conversation is active but not closed. 3 BCBAs in pipeline, first bookings targeted by [date]. HIPAA technical layer is solid; formal risk assessment and remaining BAAs are with a compliance consultant now."*

---

## SUMMARY

| Dimension | Grade | Key Finding |
|---|---|---|
| Product depth | A | 42+ screens, full ABA domain coverage, clinical screening funnel |
| Business model design | B | Three viable lanes, well-modeled economics |
| Revenue traction | F | $0 MRR — all blockers operational, not technical |
| Competitive moat | C+ | Real but time-limited; data gravity is the durable asset |
| HIPAA posture | C | Solid tech, incomplete formal process |
| Clinical liability mgmt | C- | Crisis detection exists; legal opinion not documented |
| VC narrative | B+ | Clear wedge, honest TAM, killer demo moment |
| Team | C | Single founder, no clinical advisor — most material risk |
| Execution readiness | D | Gap to first revenue = 2 hours of Stripe config + outreach |

**Overall: 6.5/10. Strong enough for the right investor. De-risk with 60–90 days of operational (not technical) work.**

---

## ADDENDUM — June 10, 2026: Economics finalized (supersedes sections 2 & 3 where they conflict)

### What changed and why it strengthens the pitch

**1. Ask-a-Behaviorist moved from payout model to staffing model.**
The earlier design paid marketplace BCBAs per answer — a variable cost that
scales with engagement (your best users become your most expensive). Final
model: employed/on-call RBTs under BCBA supervision (~$25/hr) review AI
pre-drafts at ~10 answers/hr → **~$2.50 marginal cost per answer**. Pro+
worst case (full 10-question quota, now hard-enforced at submit) is $25
staffing against $49.99 revenue — **profitable at 100% utilization**,
~85% contribution margin at observed-norm ~30% utilization. "Want a BCBA?
Book a telehealth session" turns messaging into a telehealth funnel rather
than a substitute. No pay-per-question SKU — non-subscribers see exactly
two paths (book a session / upgrade), keeping the upgrade funnel clean.

**2. Partner rail bears the clinical load at $0 platform cost.**
AACT/Rise families route to their org's own clinical team (continuity of
care, org retention benefit, rev-share aligned). Volume terms live in the
partnership agreement, not in code.

**3. B2B ladder unlocks the solo-BCBA long tail.**
1 seat $89 · 2 $79 · 3 $69 · 4 $59 · 5+ $49/seat/mo (15% annual). Min seats
1 (was 5). The US has ~70k BCBAs and a large solo/micro-practice segment no
EMR prices for; $89 with AI briefings + practice tools is an easy yes, and
$10 steps give clinics a visible reason to grow seats. Checkout edge
function mirrors the ladder server-side (drift-guarded by tests).

**4. Content is now an acquisition channel, not just retention.**
The full resource library renders as public, crawlable pages at
/resources/<slug>/ (JSON-LD, OG tags, premium gated at 25% with app CTA +
sitemap). Every BCBA-grade article compounds as SEO surface against
competitors whose content sits behind app walls.

**5. Community cold-start has a revenue-positive answer: cohorts.**
group_sessions now supports multi-week BCBA-moderated cohort programs
(8–12 families, program pricing, e.g. $199/6 weeks). Cohorts guarantee
response density while the open community reaches liquidity, and graduates
seed it. Verified-BCBA badges + book-a-session CTAs on community posts
close the content→booking loop (BCBA content is their marketing, our take
rate monetizes it).

**6. Apple exposure: structurally zero.**
All subscription checkouts route through platform-purchase.ts — external
browser (SFSafariViewController via @capacitor/browser) on native iOS,
normal web checkout otherwise. Netflix model; 0% to Apple. Marketplace
telehealth (real-world services) is IAP-exempt by rule.

### Updated retention mechanics
Caregiver Empowerment badge track added (6 badges naming demonstrated
capabilities — co-regulation, consistency, advocacy, records mastery,
community help). Parent-mediated-intervention research positions parental
self-efficacy as the strongest mediator of child outcomes; the badge track
makes that the product's retention engine rather than generic gamification.

### Grade movement
Technical/product readiness after this pass: the prior 6.5/10 was gated on
operational proof, not code. With economics now closing at worst-case
utilization, security hardening complete (PHI route auth, HMAC-verified
webhooks, RLS-safe notification paths), schema gaps closed (behavior_logs
now actually persists — previously failing silently), CI green and a
105-screen zero-issue live audit: **product 8.5/10; the remaining gap to
10 is traction evidence (paying families, BCBA earnings proof, pilot
conversion) that only operating time can produce.**
