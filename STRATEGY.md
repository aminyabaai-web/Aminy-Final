# Aminy — Revenue & Strategy (living doc)
_Last updated 2026-05-29. Decisions made with Ed across the production-hardening session. Companion to HANDOFF.md (engineering) and CLAUDE.md._

## ⚠️ Ground truth
- **There is NO live Aminy/AACT integration or deal yet.** All AACT/practice-in-a-box infrastructure in code (`PARTNER_CONFIGS.aact`, `AACTPartnerSetup`, `?org=aact`) is **aspirational / demo-gated**. The app must NOT present a live AACT partnership as real to users until a deal exists.
- The app does **NOT** diagnose. Screening (M-CHAT, developmental screeners) + refer to real evaluation only. The in-app "$229 Diagnostic" visit is **deferred** (`diagnostic_deep_review.isPublicMenu=false`) — real dx needs scarce diagnosticians (~$1,500+ cash).

## Consumer tier model (v2 — implemented)
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

- **Trial: 7 days** everywhere (matches Stripe `trial_period_days`; was falsely advertised as 14 — fixed). Annual: Core $129 / Pro $279 / Family $479.
- **Referral reward: 14-day Pro trial** — kept (separate, internally-consistent, richer hook; not a false claim).
- **Free is a real funnel** (was a hard paywall): 3 AI/day + 1 child + can book telehealth (transactional revenue, Headway-style — no sub needed to access care).

## Marketplace / take-rate economics
- `PLATFORM_FEE_RATES`: cash_pay 35% / insured 10% / aact_pilot 5%. Provider payout is a **fixed** cents amount per visit; platform take = remainder.
- **Session discounts are PLATFORM-ABSORBED** (provider always paid full) and **cash-pay ONLY** (a % discount on insured/AACT's 5-10% take = guaranteed loss). **Margin-clamped**: platform always keeps ≥ max($5, 8% of base). Worked: Standard $149/payout $95, Family 30% → family pays $106.92, platform $11.92 (floor), provider $95.

## Headway research → what Aminy should do (the big strategic call)
**Headway** (mental health; 60k providers, 600k appts/mo, ~$2.3B val): a two-sided **billing rail** — free CAQH credentialing in ~30 days, handles claims, **pays providers biweekly even before reimbursed** (floats the capital), monetizes a **small variable % of the insurer reimbursement** (providers pay $0; sometimes Headway earns $0 on weak-rate plans).

**Why NOT to clone it (corrects earlier "make insured take-rate the centerpiece" advice):**
1. Floating provider pay + negotiating 70 payer contracts = $300M-funded posture; Aminy lacks the capital/payer muscle.
2. ABA ≠ mental health — Medicaid/AHCCCS-heavy, EVV-encumbered, thinner (AACT HCBS spread 28-35%).
3. The real ABA bottleneck is **utilization (43% ABA, 51% Speech) + 115-day waitlist**, which a billing rail does nothing for.

**Recommendation — own the layer Headway doesn't:**
- **Near-term (no payer deal/capital needed):** consumer subs + cash-pay 35% marketplace + **B2B SaaS/per-active-client to orgs for DEMAND + family-engagement + intake-conversion + utilization-fill.** For a clinic at 43% utilization, demand >> shaved billing cost. Sell *revenue*, not a billing switch. Leave billing to their Rethink stack.
- **Posture, not economics, from Headway:** free + fast credentialing, provider keeps full payout → supply magnet (scaffolding exists: CAQH/credentialing/claims/EVV).
- **Long-term (gate behind a real deal + capital):** the "lease payer contracts + float payouts" play. Roadmap, not a claim.

## B2B — two distinct lanes (clarify buyer per lane)
- **Org seat-licensing** (`org-licensing.ts`): $99/seat/mo, min 10 seats, 10% annual; clinic/school/agency/enterprise; `OrgAdminDashboard`. Best fit: **schools & agencies** giving Aminy to families.
- **Provider marketplace / practice-in-a-box** (take-rate rails): best fit **clinics/providers**. For clinics, per-seat may conflict with take-rate — pick one per buyer so they don't cannibalize.

## Payer-type-aware funnel (AGREED — next build)
Branch monetization on payer type (the rail/`hasInsurance`/`pilot_payers` on profile):
- **Cash families** → full sub + upgrade pressure + tier session-discount funnel.
- **Insured families** → do NOT hard-paywall; route to **booking covered care** (margin lives in the session, not the $15 sub). The sub is a retention wrapper.
This is the highest near-term ARPU lever and currently the funnel does NOT branch on rail.

## Open decisions / tasks
- (#11) practice-in-a-box → reframed to the demand/engagement/utilization layer above; gated on a real AACT deal.
- (#13) consolidate tier config to one source of truth (root cause of the price/trial drift bugs).
- Insured spread-economics model — pending the 3 numbers (trial→paid %, CAC, reimbursement-vs-payout spread); Ed supplied AACT's actuals (ABA 45-60% gross but 43% util; HCBS 28-35%; Speech ~50% at 51% util; CAC ~$3.5-6K; assessment→active 65-72%; 115-day waitlist = cash-flow lag).
