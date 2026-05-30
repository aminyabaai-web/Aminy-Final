# Aminy — Production-Perfection Handoff
_Read with `STRATEGY.md` (revenue/strategy) and `CLAUDE.md` (architecture). Updated 2026-05-29._

## Where things are
Active branch: **`phase-b-all-component-audit`** → **PR #199** (open against `main`). PR #198 already merged (the first hardening pass + first fabrication sweep).
Gate is green on the branch: `npm run build` ✓ · `npx tsc --noEmit` **0 errors** · `npm run test:run` **332 unit** ✓ · plus drift-guard + economics + monetization tests.

## The mission (still in force)
Production-perfect, ALL screens/components, revenue-optimized, flawless. Lead with an honest grade; never claim "perfect" until the full gate (build+tsc+unit+multi-browser E2E) is green AND every component is covered.

## The dominant defect class + fix recipe
Fabricated clinical/PHI/financial/provider/analytics data shown to REAL (non-demo) users. Recipe:
```ts
import { isDemoMode } from '../lib/demo-seed';      // ../../ from nested dirs
useState(isDemoMode() ? SAMPLE : [] /* or null/0 */)
data.length ? <list/> : <EmptyState/>
```
Demo (`?demo=…`) shows rich samples; real users see real data or an empty state. Never let fake ids/amounts reach Stripe or a binding terms checkbox.

### Hard rules (do not violate)
- State-nav via `currentScreen` in App.tsx — **NEVER add react-router**.
- **Tailwind v4 is PRECOMPILED (`src/index.css`, no JIT)** — any class/variant not literally present (arbitrary `bg-[#hex]`, `/90` opacity, `h-4.5`, interpolated `bg-${x}`) does NOT render. Use defined classes or inline style.
- Brand: teal `#43AA8B`, slate `#577590`, cream `#FAF7F2`, peach `#E07A5F`.
- Shared `<ScreenHeader>` (`src/components/ui/ScreenHeader.tsx`, chrome px-4 pt-3 pb-4).
- Copy: "HIPAA-conscious" (never assert Aminy is "HIPAA-compliant"; vendor/infra HIPAA statements w/ BAA are OK). No unconditional payment guarantees.
- **Tier/price/trial facts come from ONE source: `src/lib/tier-utils.ts`.** Do not hardcode prices/limits/trial elsewhere — `src/lib/tier-config-consistency.test.ts` fails CI on drift.
- **No live AACT deal** — never present a live AACT partnership as real (`PARTNER_CONFIGS.aact` etc. are aspirational/demo).

## DONE this session (on the branch / PR #199)
- **Component hardening:** Wave 1 (48 routed screens, 54 fixes, fully adversarially verified) + Wave 2 (37 routed screens, fix pass — re-verify in progress) + WeeklyAISummary −346 lines dead code.
- **Revenue model v2** (see STRATEGY.md): Free=funnel (3 AI/day, 1 child, can book telehealth); kids 1/2/3/∞; memory 50/5k/15k/∞; **discount 0/10/20/30 cash-pay-only, platform-absorbed, margin-clamped**; AI **fair-use 100/day** (displays Unlimited); **trial truthfully 7 days** (fixed 14-day/"1-month" false claims); fixed live stale prices ($19/$69/$229→real); **$229 diagnostic visit deferred**.
- **Payer-type funnel:** insured users → soft wall + "check coverage" (existing tools; no fake covered-booking); cash → full funnel. Live on `PricingTiers`.
- **Tier config consolidated** to tier-utils + 24-test drift guard (Task #13). 
- **`STRATEGY.md`** created (Headway research + recommendation, B2B lanes, economics).

## REMAINING to truly "done"
1. **Wave 2 re-verify** (running, read-only, task `w3n2p1e6w`) — fix any regressions it confirms in the 37 files.
2. **Unrouted components** — triaged (357 candidates → 52 marker-hits → almost all noise/false-positive/already-judged; the real ones fixed: ReferralCard, InlinePaywallPromo, email-service). Considered substantially clean; a deeper per-file pass is optional.
3. **Multi-browser E2E** — install all 3 browsers (`npx playwright install chromium firefox webkit`), run full 831-test suite + simulated parent/provider/AACT/VC journeys. Only Chromium has been run (64/64 core green).
4. **Task #11** (reframed) — demand/engagement/utilization layer for ABA orgs; gated on a real AACT deal + capital. Roadmap.
5. Optional cleanup: 2 orphaned paywall components (PaywallScreen, AIPaywallMessage — unmounted; harmless funnel code added; decide delete vs keep).

## NON-CODE / infra (owner — I'm blocked from prod)
- `supabase functions deploy` for the **free-booking gate** (auth-middleware) + the AACT/edge changes.
- Push 5 pending DB migrations (`denial_records`, org-billing, etc.).
- **Rotate the Twilio token** pasted in chat earlier.
- Stripe Org price IDs; branch protection on main; real Sentry DSN.

## Resume prompt (paste first in a new session)
> Read HANDOFF.md, STRATEGY.md, CLAUDE.md. Continue Aminy on branch `phase-b-all-component-audit` (PR #199). Finish: (1) act on the Wave 2 re-verify regressions, (2) full multi-browser E2E + simulated test-user journeys, (3) optional deeper unrouted-component pass. Run the full gate after each step, report an honest grade. Use orphan-safe (short) workflows. Keep everything committed.
