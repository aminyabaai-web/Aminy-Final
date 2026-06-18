# Aminy — Investor Pitch
_Seed Round · June 2026_

---

## Slide 1 — The Problem

**1 in 36 children has autism. The system designed to help them is broken.**

- Average time from first parental concern to first ABA therapy session: **3–5 years**
- Average wait for prior authorization from BCBS Arizona: **28 days, two phases**
- A BCBA costs $150–250/hour out of pocket. Most families don't know they're covered.
- The family discovers their child needs ABA. They Google. They get a list of clinics. They call. They wait.

**There is no Headway for ABA. Until now.**

---

## Slide 2 — The Solution

**Aminy: AI-powered navigation from diagnosis to treatment for neurodivergent families**

Three things that don't exist anywhere else, together in one app:

1. **Zero-OOP booking** — Aminy detects Medicaid secondary coverage and shows families their estimated out-of-pocket cost *before* they book. For AHCCCS dual-eligible families: **$0**. That's not a discount — that's the actual math.

2. **AI that knows your child** — Claude (not ChatGPT) with vision, voice, and behavioral context. Aminy knows your child's triggers, goals, and progress. It briefs your BCBA before every session. It answers at 2am.

3. **Prior auth in real time** — Families see exactly where they are in the authorization timeline, which payer they have, and what's expected — without calling anyone.

---

## Slide 3 — Market

**Total Addressable Market: $85B (US behavioral health)**

| Segment | Size |
|---------|------|
| ABA therapy market (US, 2026) | $12B |
| Pediatric behavioral health (broader) | $34B |
| Autism services, all types | $85B |

**Serviceable market (Medicaid ABA, states with strong parity):** $6B
- Medicaid covers ABA in all 50 states since 2021
- AHCCCS (Arizona Medicaid) pays 100% of ABA claims, no copay for most families
- Arizona alone: 18,000+ children receiving ABA services

**Why now:**
- Federal Medicaid parity requirement (2024) expanded coverage nationally
- BCBA shortage means families wait years — a matching platform has real leverage
- No tech-first player owns this space. Headway explicitly does not do ABA.

---

## Slide 4 — Business Model

### B2C: Family Subscriptions
| Tier | Price | What They Get |
|------|-------|---------------|
| Free | $0 | 3 AI chats/day, screening tools |
| Core | $14.99/mo | 100 AI chats, vault, booking |
| Pro | $29.99/mo | Group sessions, priority matching |
| Pro+ Family | $49.99/mo | Ask-a-Behaviorist (10 q/mo), unlimited |

7-day free trial, no credit card.

### B2C: Telehealth Marketplace (Cash-Pay)
| Visit | Family Pays | BCBA Earns | Aminy Keeps |
|-------|-------------|------------|-------------|
| 25-min consult | $79 | $45 | $34 |
| 50-min session | $149 | $95 | $54 |
| 90-min diagnostic | $229 | $155 | $74 |

Pricing principle: BCBAs net the same or more on cash-pay than they do through insurance — so they have no reason to avoid Aminy.

### B2B: ABA Clinic SaaS
| Seats | Monthly | Annual |
|-------|---------|--------|
| 1 (solo BCBA) | $89 | $906 |
| 5+ seats | $49/seat | $499/seat |

### B2B: Insured Rail (AACT/Rise Pilot)
Aminy invoices the partner org a flat fee per completed visit. Families pay $0.

| Event | Fee |
|-------|-----|
| Completed session | $32 |
| Prior auth packet | $45 |
| Claim-ready validation | $12 |

---

## Slide 5 — Why Medicaid Is the Strategy

**Medicaid is not a charity play. It is the moat.**

Most startups avoid Medicaid because it's complex. That complexity IS the defensibility.

- AHCCCS (Arizona) pays **100% of ABA claims** with no copay for dual-eligible families
- A family with both BCBS and AHCCCS pays $0 — AHCCCS is payer of last resort
- Showing a family "$0 out-of-pocket" at booking converts at 3–5x vs. "check your benefits"
- Competitors cannot replicate this without the payer relationships we're building

**Expansion path:** AZ → NM → TX → CO → FL (all strong Medicaid ABA payers)

---

## Slide 6 — AI Differentiation

**This is not an AI wrapper. This is the first AI designed specifically for ABA families.**

| Feature | Competitor (Headway, SimplePractice) | Aminy |
|---------|--------------------------------------|-------|
| Session context | Notes per session | Persistent memory across 250 facts |
| Vision | None | Parents can send photos of behaviors |
| Voice | None | Voice transcription + smart actions |
| BCBA briefing | None | AI synthesizes child data, briefs provider pre-session |
| Screener billing | Manual | Auto-delivers PHQ-9, bills CPT 96127 on insured visits |
| No-show recovery | None | Auto-apology, priority reschedule, provider reliability tiers |

AI model: Anthropic Claude claude-sonnet-4-6 (primary), OpenAI fallback. Not a generic chatbot — domain-trained system prompt with behavioral health context, family history, and BCBA guidance baked in.

---

## Slide 7 — Traction & Validation

| Metric | Status |
|--------|--------|
| App build | Production-ready PWA + iOS Capacitor |
| Screens | 106 screens, 877/877 E2E tests passing |
| AI | Live on Anthropic Claude, confirmed in production smoke test |
| Stripe | Price IDs live in Stripe account, one deploy from active |
| AACT/Rise | In negotiation (pilot term sheet stage) |
| BCBAs targeted | 0 onboarded (pre-launch constraint) |
| Families | 0 paying (pre-launch) |

**Honest:** This is a seed round. The infrastructure is built. The commercial loop hasn't fired yet. We need 90 days and $500K to light it.

---

## Slide 8 — Unit Economics

**Scenario: Single ABA clinic, 5 BCBAs, 20 sessions/week each**

| Revenue Stream | Monthly |
|---------------|---------|
| B2B seat license (5 × $49) | $245 |
| Per-session fees (400 sessions × $32) | $12,800 |
| Family subscriptions (50 families × $14.99 avg) | $750 |
| **Total from one clinic** | **$13,795/mo** |

**At 10 clinics:** $138K/month = **$1.65M ARR**

Customer acquisition cost (B2B): ~$500 (one sales call, one demo)
Payback period: < 30 days

---

## Slide 9 — Porter Five Forces

| Force | Assessment | Why |
|-------|-----------|-----|
| New entrants | Low threat | Payer relationships + HIPAA + BCBA credentialing = 18-month head start |
| Buyer power (families) | Low | No alternative with $0 OOP + AI + ABA-specific matching |
| Buyer power (clinics) | Medium | Can build their own, but won't for $49/seat |
| Supplier power (BCBAs) | High → dropping | Shortage gives them leverage; pricing principle neutralizes it |
| Substitutes | Medium | Direct clinic calls, insurance portals — all slower and opaquer |
| Rivalry | Very low | No direct competitor targets Medicaid ABA + AI + marketplace |

---

## Slide 10 — Team & Use of Funds

**Seed Ask: $1.5M**

| Category | Amount | Purpose |
|----------|--------|---------|
| Sales (BCBA supply) | $300K | 1 enterprise sales rep, AACT deal closure, 50 BCBAs onboarded |
| Clinical Advisory | $100K | Melmed (behavioral health) + 2 BCBA advisors |
| Legal/IP | $75K | Provisional patent, BAAs, trademark, AACT contract |
| Infrastructure | $50K | Supabase Pro, Twilio, Sentry, Resend at scale |
| Product/Engineering | $500K | PHQ-9 scheduler, Rethink sync, Stripe go-live, iOS App Store |
| Marketing | $200K | Parent Facebook groups, BCBA conferences (ABAI, APBA) |
| Runway | $275K | 18 months |

**Milestones at 18 months:**
- 500 families, 50 BCBAs, 5 clinic contracts
- $2M ARR
- AACT pilot → full partnership
- Series A ready

---

## Slide 11 — Why This Wins

1. **The problem is real.** Every autism parent knows the 3-year wait. Every BCBA knows the prior auth nightmare. Nobody is solving both sides with technology.

2. **Medicaid is the unlock.** Showing "$0 out-of-pocket" is not a feature — it's a conversion event. No other app does this because they don't understand payer architecture.

3. **AI is genuinely differentiated.** Not a chatbot with a behavioral health skin. Session memory, BCBA briefing, vision, voice — no competitor has all four.

4. **The economic structure is fair.** BCBAs net more on cash-pay than insurance despite our higher take rate. That's unusual and it builds supply.

5. **Infrastructure is done.** 106 screens, 877 passing tests, live AI, Stripe architecture, HIPAA logging. The $1.5M is for commercial traction, not building the product.
