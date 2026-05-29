# Aminy — Path to 100% (VC-Ready + McKinsey-Perfect)
**Owner:** Ed Staren · **Updated:** 2026-05-15 · **Target close:** Seed round by Nov 2026

---

## Executive Summary

**Where we are (honest 2026-05-15):**
- Tech: **9/10** — production-grade, 1,170+ tests green, mobile-ready, multi-provider AI failover, multi-modal vision, Family OS positioning, validated clinical outcomes
- Business: **5/10** — $0 MRR, no signed AACT pilot, no recruited BCBAs/therapists, no paying users
- Compliance: **7/10** — HIPAA scaffolding solid (AES-GCM PBKDF2, audit logging, RLS, Sentry PHI-masked) but no formal risk assessment or BAAs
- Polish: **7/10** — works, needs marketing-grade imagery + cold-eye user testing

**Where 100% looks like (Nov 2026):**
- $50K MRR (mix of B2C subs + AACT contract revenue)
- 500+ engaged consumer users + 1 signed B2B pilot
- 8-12 contracted BCBAs/therapists in AskAminy queue
- Formal HIPAA risk assessment + BAAs with Sentry/Twilio/Resend
- Seed round closed: $1.5M @ $7-10M pre

**Timeline:** 6 months of disciplined execution. Plan below in 5 phases, week-by-week.

---

## Phase 1 — Stabilize (Days 1–14)
**Goal:** Aminy is production-deployable end-to-end. Real users could pay today. Demo-mode locks the surface to 12 hero screens.

### Ops setup (Ed — 4 hours total)
- [ ] **Supabase Dashboard** → Edge Function Secrets — add:
  - `TWILIO_ACCOUNT_SID=<set in Supabase Dashboard — value redacted from repo>`
  - `TWILIO_AUTH_TOKEN=<ROTATE the leaked token first, then set in Supabase Dashboard>`
  - `TWILIO_FROM_NUMBER=<your Twilio number>`
- [ ] **Twilio Console** → Messaging → Regulatory Compliance → **Initiate A2P 10DLC** registration
  - Brand: Aminy LLC (use real EIN), Phoenix AZ address
  - Campaign: "Aminy appointment reminders" — Low Volume Mixed type
  - Sample message: "Aminy: Tomorrow you have OT with Dr. Lee at 3pm. Reply STOP to opt out."
  - ~$4 brand fee + ~$10/mo campaign · approval 3-5 days
- [ ] **Resend.com** → sign up (free tier: 3K emails/mo) → verify aminy.ai domain (SPF/DKIM/DMARC records) → set `RESEND_API_KEY`
- [ ] **Sentry.io** → create "Aminy Web" project (React) → set `VITE_SENTRY_DSN` in Netlify
- [ ] **Google Cloud Console** → create OAuth credentials (Calendar API enabled, redirect URI = `https://aminy.ai/auth/google-calendar/callback`) → set `GOOGLE_OAUTH_CLIENT_ID/SECRET/REDIRECT_URI`
- [ ] **Azure entra.microsoft.com** → app registration (Calendars.ReadWrite + offline_access) → set `MS_OAUTH_CLIENT_ID/SECRET/REDIRECT_URI`
- [ ] **Stripe Dashboard** → create products: Core $14.99/mo + $129/yr, Pro $29.99/mo + $279/yr, Pro+ Family $49.99/mo + $479/yr, Org $99/seat/mo · set price IDs in Netlify env vars
- [ ] **GitHub** → branch protection on `main` (require PR + status checks)

### Code work remaining (delegate or do)
- [ ] Apply all pending migrations: `supabase db push` (after `supabase migration repair`)
- [ ] Wire `VITE_DEMO_MODE=true` for investor/partner demo URL
- [ ] Add demo seed data (3 children, 5 appointments, 10 behavior logs, 2 sessions notes) so demos don't feel empty

### Compliance (Ed + legal)
- [ ] Engage HIPAA compliance consultant — $2-5K, 5 business days
  - Recommended: HIPAA One, Compliancy Group, or local Phoenix firm
  - Deliverable: gap analysis + remediation plan
- [ ] Execute BAA with Twilio (built-in via console — Settings → BAA)
- [ ] Execute BAA with Sentry (request via support@sentry.io for paid tier)
- [ ] Execute BAA with Supabase (already have via paid plan)
- [ ] Execute BAA with Anthropic (request via support@anthropic.com)

**Phase 1 success:** App is launchable, all integrations live, formal compliance review scheduled.

---

## Phase 2 — Pilot (Days 15–60)
**Goal:** AACT formal contract signed. 50 beta families enrolled. Outcomes dashboard live for both AACT exec team + Aminy.

### AACT contract (Ed — primary, Cori — counterparty)
- [ ] Draft term sheet with Cori (target sign by Day 30):
  - **Exclusivity:** AACT becomes Aminy's exclusive AZ ABA partner for 24 months
  - **Non-compete:** AACT will not partner with Bevel, Answers Now, Brightline, Manatee, Headway-for-ABA during term
  - **Volume commitment:** AACT to onboard min 50 families in first 60 days, 200 in first 6 months
  - **Pricing:** $5/family/mo SaaS to AACT (covers infrastructure) OR per-session take rate of 5% (aact_pilot rail)
  - **Co-marketing:** AACT promotes Aminy in parent welcome packets; Aminy includes AACT in marketing
  - **Data sharing:** Aminy can share aggregate (de-identified) outcomes with AACT exec for partnership ROI
- [ ] Legal review (estimated $2-3K with Phoenix healthtech attorney)
- [ ] Have Karen Hans review provider-side clinical terms

### Provider recruitment (JJ + Ryan — primary)
- [ ] **BCBA pipeline (target 5 signed by Day 60):**
  - Pull list from AACT current roster (Cori provides)
  - Recruit 2 multi-state BCBAs (AZ + CA + TX prioritized) via LinkedIn outreach
  - Compensation model: $40/draft-review (5-10 min each) for AskABCBA queue
- [ ] **Mental health therapist pipeline (target 3 signed by Day 60):**
  - LMFT/LCSW with AZ + CA + NY licenses
  - $50/draft-review compensation
  - Source: BetterHelp/Talkspace alumni who left over rates

### Beta program (Ed + JJ)
- [ ] Launch beta enrollment page at `aminy.ai/aact-pilot`
- [ ] AACT parent welcome packet includes Aminy invite link (`?org=aact`)
- [ ] Weekly Aminy operations review with AACT (every Friday) — 30-min call, dashboard walkthrough
- [ ] Set up the AACT exec weekly email digest (auto-generated from outcomes data)

### Code work for pilot
- [ ] AACT seat-split UI in OrgAdminDashboard (BCBA $99/seat, RBT $39/seat)
- [ ] AACT exec dashboard polish (claim status trends, payer mix breakdown)
- [ ] AACT-branded co-marketing page `/partners/aact`
- [ ] CSV bulk-import of AACT roster (already built in `AACTPartnerSetup.tsx`)
- [ ] Outcomes tracking widget: families using PHQ-9, GAD-7, ABC-I weekly

**Phase 2 success metrics:**
- AACT contract signed (legal binding)
- 50 families enrolled
- 8 contracted clinicians in AskAminy queue
- 200+ outcome-measure submissions in `outcome_measure_submissions`

---

## Phase 3 — Revenue (Days 61–120)
**Goal:** First $10K MRR. First paying B2B contract. Demonstrable unit economics.

### Consumer launch (Ed + marketing contractor)
- [ ] Hire fractional growth marketer ($5-8K/mo, 3-month contract) — sources: GrowthHackers community, MarketerHire
- [ ] **Channels (in priority order):**
  - **Reddit:** r/Autism_Parenting, r/SpecialNeedsParenting — organic content + AMAs
  - **Facebook autism parent groups:** AZ-focused groups first (AACT amplifies)
  - **Pediatric clinic referrals:** physical card with QR code dropped at 20 pediatric practices in Phoenix
  - **TikTok:** short-form "did you know about this" parent tips, drives signups
  - **Google Ads:** branded terms only ("autism parent app", "ABA family app") — $2K/mo budget
- [ ] Target: 1,000 trial signups by Day 120 → 100 converting at 10% → $1,500 MRR at $14.99 Core

### Marketing imagery procurement (Ed — sign off)
- [ ] **Option A — Photography:** Half-day shoot in Phoenix with 2-3 neurodivergent families (recruit through AACT) + photographer — $3-5K
- [ ] **Option B — Illustration:** Storyset Premium ($30/mo) + freelance illustrator for 20 spot illustrations — $2-4K
- [ ] **Option C — Hybrid (recommended):** 5 hero photos + 15 illustrations from Storyset — $4-6K total
- [ ] Asset usage: splash hero, FreeScreeningFlow interludes, paywall tier illustrations, empty states, success animations

### Provider marketplace launch (JJ + Ryan)
- [ ] Open marketplace publicly with 10+ providers listed (5 AACT + 5 recruited)
- [ ] Stripe Connect verified for all 10
- [ ] First cash-pay session goal: Day 75
- [ ] First insurance-billed session goal: Day 90
- [ ] Provider-side referral program: $200 per provider signup who completes first session

### B2B pilots (Ed — outreach)
- [ ] Target list of 5 ABA orgs for additional pilots (after AACT proves out):
  - Rise Services Inc (JJ has the relationship — start here)
  - Cortica (multi-state ABA + integrated medical)
  - Florida ABA (regional player)
  - Therapeutic Pathways (CA-based)
  - Bluesprig (national player)
- [ ] Pitch deck v1 ready by Day 75 (slides built off this document)

### Async messaging launch
- [ ] Soft-launch AskAminy with 5 contracted BCBAs across 3 states
- [ ] Pricing: $19/mo basic_rbt, $39/mo full_bcba, $79/mo unlimited bundle
- [ ] Track: avg response time, avg review time, parent satisfaction (1-5 stars per response)
- [ ] Target: 80% of responses signed within SLA, 4.5+ avg parent rating

**Phase 3 success metrics:**
- $10K MRR
- 500 active B2C users
- 1 signed B2B contract beyond AACT
- 50+ paid telehealth sessions
- AskAminy NPS > 60

---

## Phase 4 — Raise (Days 121–180)
**Goal:** Close seed round. $1.5M at $7-10M pre.

### Materials (Ed — 3-week sprint)
- [ ] **Pitch deck v2** — 12 slides max:
  1. Problem (parents drowning, providers undercompensated, payers paying for waste)
  2. Solution (Family OS for neurodivergent care)
  3. Why now (AI maturity + autism diagnosis growth)
  4. Product (3 screenshots: AI chat, care coordination, AACT exec view)
  5. Traction (MRR chart, AACT pilot results, outcomes data)
  6. Business model (3 revenue lanes)
  7. Unit economics (LTV/CAC, gross margin by lane)
  8. TAM/SAM/SOM (autism: 1 in 36, 2M+ US kids, $14B+ market)
  9. Competition (Bevel, Answers Now, Headway — 2x2 grid)
  10. Moat (AACT exclusivity, memory data, provider supply lock-in)
  11. Team (Ed MD, JJ Rise, Karen, advisors)
  12. Ask ($1.5M seed → 18-month runway, milestones, use of funds)
- [ ] **Financial model** — Google Sheets, fully linked:
  - 5-year P&L with 3 scenarios (base/bear/bull)
  - Cohort retention curves
  - Cash flow + funding triggers
- [ ] **Data room** — Notion or DocSend:
  - Cap table, articles of incorporation, all contracts (incl. AACT)
  - Compliance audit report
  - Product roadmap
  - Customer references (5+ AACT parent video testimonials)

### VC target list (Ed — outreach starts Day 121)
**Tier 1 — healthtech specialists:**
- General Catalyst (Hemant Taneja's healthtech thesis)
- Andreessen Horowitz Bio (Vijay Pande)
- 7wireVentures (Glen Tullman)
- Optum Ventures
- Define Ventures

**Tier 2 — consumer healthtech:**
- Forerunner Ventures (Kirsten Green)
- Founders Fund (consumer health team)
- Sequoia (consumer team)
- Lerer Hippeau

**Tier 3 — autism/disability specific:**
- Autism Impact Fund (Chris Male)
- Disability:IN affiliated funds

**Warm intros to source:**
- JJ's Rise board members
- Cori's AACT advisors
- Ed's MCR investor relationships
- LinkedIn warm path mapping

### Process (Ed — manage)
- [ ] 25-30 first meetings (top of funnel)
- [ ] 10 second meetings
- [ ] 4-5 termsheet conversations
- [ ] 2-3 termsheets received
- [ ] Choose lead, close round

**Phase 4 success metrics:**
- Termsheet signed
- $1.5M wired to Aminy account
- $20K MRR

---

## Phase 5 — Scale (Days 181+)
**Goal:** Series-A readiness within 18 months. Multi-state expansion.

### Expansion (post-raise)
- [ ] Hire VP Eng ($180-220K + equity) to scale beyond Ed's solo build
- [ ] Hire Head of Provider Partnerships ($120-150K + commission)
- [ ] State expansion: 2nd state by month 9 (CA, TX, or FL), 5 states by month 18
- [ ] Multi-state BCBA + therapist recruitment to support async messaging at scale
- [ ] Apple Health + Google Health Connect integrations
- [ ] Apple Watch / Fitbit data → AI context for behavioral patterns

### Defensible moat building
- [ ] **AACT exclusive AZ extension** — renegotiate to 36-month term with first-look on other ABA orgs
- [ ] **Memory data moat** — public studies showing Aminy memory improves clinical outcomes (peer-reviewed white paper, ~$30K)
- [ ] **Provider supply moat** — exclusive Aminy badge program for top 5% of BCBAs (network effect)

### Series-A criteria (~Month 18)
- $1M+ ARR
- 5+ B2B contracts
- 3-state operation
- 60%+ gross margin on B2C lane
- LTV/CAC > 4x

---

## Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| AACT pulls out / delays | Medium | High | Diversify: pursue Rise Services + 1 other AZ ABA org in parallel |
| BCBA recruitment fails | Medium | High | Lower bar to RBT-supervised model; partner with BCBA staffing agencies |
| Anthropic rate-limits at scale | Low | High | OpenAI fallback already wired; multi-provider config tested |
| HIPAA breach | Low | Catastrophic | Formal audit + cyber liability insurance ($1M coverage, ~$3K/year) |
| Bevel/AnswersNow undercut us | Medium | Medium | AACT exclusive + lower pricing + multi-service positioning |
| Insurance reimbursement complications | High | Medium | Cash-pay lane is primary; insurance billing via Stedi is supplement |
| Ed-as-bottleneck risk | High | High | Hire VP Eng after raise; document everything in repo + CLAUDE.md |
| Apple/Google app store policy changes | Low | Medium | PWA already deployed; native apps optional, not load-bearing |
| Marketing imagery looks generic | Medium | Low | Photography option (real Phoenix families) instead of stock |
| Async messaging legal/licensing | High | High | Multi-state license tracking in schema; strict patient-state-matching |

---

## Hiring + contracting plan

| Role | Type | Timing | Budget | Status |
|---|---|---|---|---|
| HIPAA compliance consultant | Contract | Phase 1 | $2-5K one-time | TBD |
| Marketing/photography | Contract | Phase 3 | $4-6K one-time | TBD |
| Fractional growth marketer | Contract | Phase 3-4 | $5-8K/mo × 3mo | TBD |
| BCBA reviewers (8x) | 1099 contract | Phase 2-3 | $40/review × est. 50/mo per BCBA = $16K/mo | TBD |
| MH therapists (3x) | 1099 contract | Phase 2-3 | $50/review × est. 30/mo per therapist = $4.5K/mo | TBD |
| Phoenix healthtech attorney | Contract | Phase 2 | $2-3K (AACT term sheet review) | TBD |
| Cyber liability insurance | Annual | Phase 4 | $3K/year | TBD |
| VP Engineering | Full-time | Phase 5 (post-raise) | $200K + 1.5% equity | Post-raise |
| Head of Provider Partnerships | Full-time | Phase 5 (post-raise) | $130K + 0.5% equity | Post-raise |

**Pre-raise burn:** ~$30K/mo by Phase 3 end (Ed + contractors + infra). 6 months runway from Ed's MCR investment.

**Post-raise burn:** ~$140K/mo (2 senior hires + ops + marketing scale). 12-14 months to Series A.

---

## Code work still to do (tracked separately)

These are code items deferred until dependencies clear:

| Task | Blocker | ETA |
|---|---|---|
| Bidirectional Google/Outlook → Aminy availability sync | Need Google + Microsoft OAuth credentials set | 3 hours once Phase 1 ops done |
| AACT seat-split UI (BCBA vs RBT) | Need Stripe product/price IDs created | 2 hours |
| "Import from Headway" therapist onboarding | Strategic decision: manual form OR CSV | 2 hours |
| Outcome measure trends chart | Need 30+ submissions to look real | Auto-unlocks |
| Apple Health / Google Health Connect | Phase 5 (post-raise) | 12-16 hours |
| Real-time provider availability sync from Rethink | Needs Rethink API access | 2 days |
| Investor demo seed data | Phase 1 ops | 1 hour |

---

## What success looks like (concrete metrics)

| Metric | Now (May 2026) | Phase 2 end (Jul) | Phase 3 end (Sep) | Phase 4 end (Nov) | Phase 5 end (May 2027) |
|---|---:|---:|---:|---:|---:|
| MRR | $0 | $1K | $10K | $20K | $100K |
| B2C active users | 0 | 50 | 500 | 1,000 | 5,000 |
| B2B contracts signed | 0 | 1 (AACT) | 2 | 3 | 8 |
| Contracted BCBAs/therapists | 0 | 8 | 12 | 18 | 40+ |
| States operating in | 1 (AZ) | 1 | 1 | 1 | 3 |
| Outcome-measure submissions | 0 | 200 | 1,500 | 4,000 | 25,000 |
| AskAminy NPS | n/a | 60+ | 65+ | 70+ | 75+ |

---

## Decision points (when to pivot)

- **Day 30:** If AACT term sheet not signed → pursue Rise as primary pilot
- **Day 60:** If <30 beta families enrolled → re-examine AACT funnel (likely a UX or messaging problem)
- **Day 90:** If <$5K MRR → strengthen consumer marketing OR pivot to B2B-first GTM
- **Day 120:** If no termsheet conversations → reduce ask to $750K bridge from Ed's network, extend runway
- **Day 150:** If termsheets <$5M pre → take strategic angel money instead, wait 6 months for Series A directly

---

## What I (Claude / agent) can help with at each phase

| Phase | I can do | You have to do |
|---|---|---|
| 1 — Stabilize | Code fixes, additional tests, copy updates, migration writing | Sign up for services, click through OAuth setups, sign BAAs |
| 2 — Pilot | AACT seat UI, exec dashboard polish, outcomes widgets, demo seed data | Sign contract, recruit clinicians, run weekly AACT review |
| 3 — Revenue | A/B test variants, paywall optimizations, NPS instrumentation, marketing site copy | Hire contractors, run channels, close pilot deals |
| 4 — Raise | Deck design (in code or markdown), financial model templates, data-room organization | Outreach, take meetings, negotiate terms |
| 5 — Scale | Architecture for multi-tenant, performance audits, infrastructure-as-code | Hire team, manage exec functions |

---

## Update cadence

- **Weekly Friday:** Ed reviews this doc, updates checkboxes, adds new items
- **Monthly:** JJ + Karen + Cori join the review (15 min)
- **Quarterly:** Full strategic review with whoever's advising on the cap table

Last full review: 2026-05-15
Next scheduled: 2026-05-22
