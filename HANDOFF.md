# Aminy — Production-Perfection Handoff

**Read this first in any new session, alongside `CLAUDE.md` and `AUDIT-FINDINGS.md`.**

## The Mission (verbatim, still in force)
> Finish this app. Make it perfect. Production-level ready. Every screen pixel-perfect — everything in the right place. Parents, providers, VCs, strategists should think it's flawless. Set to drive massive revenue and be a true unicorn.
> **ALL screens and ALL components perfect — not just high-visibility ones.** Significant testing + simulated test-user testing. PERFECT / FLAWLESS.

Honest framing for the next session: do **not** claim "perfect" until the verification gate below is fully green AND every component (not a sample) has been audited. Lead with the grade, name gaps with specifics.

---

## The dominant defect class + the fix recipe
The #1 production blocker is **fabricated clinical / PHI / financial / provider / testimonial / analytics data shown to REAL (non-demo) users.** The canonical fix everywhere:

```ts
import { isDemoMode } from '../lib/demo-seed';   // ../../ from nested dirs
// state init:  useState(isDemoMode() ? SAMPLE : [] /* or null/0 */)
// fetch fallback:  if (rows.length === 0 && isDemoMode()) setX(SAMPLE); else setX([]);
// render:  data.length ? <list/> : <EmptyState/>   // friendly, on-brand
```
Demo mode (`?demo=true|investor|aact` or `VITE_DEMO_MODE`) must still show rich sample data so prospect/VC walkthroughs look complete. Real users see real data or a proper empty state. **Never** let a fake provider id / fake amount reach Stripe or a "binding" terms checkbox.

### Hard rules (from CLAUDE.md — do not violate)
- Navigation is `currentScreen` state in `App.tsx`. **NEVER add react-router.**
- **Tailwind v4 JIT emits only COMPLETE STATIC class strings.** No `bg-${x}-500` interpolation — use a lookup object whose values are full literal classes (see `JrKidMode.tsx` `moduleColors` for the pattern). No invalid shades (`-150` doesn't exist).
- Brand: teal `#43AA8B`, slate `#577590`, cream `#FAF7F2`, peach `#E07A5F`.
- Shared header: `<ScreenHeader>` (`src/components/ui/ScreenHeader.tsx`; props `title/subtitle/icon/actions/onBack/variant/sticky`). Chrome = `px-4 pt-3 pb-4`.
- Copy: "HIPAA-conscious" (never absolute "HIPAA-compliant"). No unconditional payment "guarantees".
- Platform fees: `PLATFORM_FEE_RATES` in `src/lib/stripe-connect.ts` = cash_pay 0.35 / insured 0.10 / aact_pilot 0.05. **No 15% rail exists.** Use `getPlatformFeeRate(rail)`.
- Cori is NOT involved at AACT. AACT/Rise use **Rethink** (not CentralReach) as system-of-record.

---

## Verification gate (run after every batch; all must be green before "done")
```bash
npm run build          # vite/esbuild — expect "✓ built"
npx tsc --noEmit       # MUST be 0 errors (ignore the 1 'baseUrl deprecated' warning)
npm run test:run       # unit — currently 322 passing
npx playwright install chromium firefox webkit   # browsers are NOT preinstalled here
npx playwright test e2e/golden-path.spec.ts e2e/screen-smoke.spec.ts e2e/mobile-viewports.spec.ts --project=chromium
# full suite (831): npx playwright test   (needs all 3 browsers installed)
```
Current status (this session): build ✓, tsc ✓ 0 errors, unit ✓ **322**, E2E core ✓ **64/64 chromium**. WebKit/Firefox NOT yet run (binaries were absent; I installed chromium only).

---

## DONE this session (committed)
1. **Critical PHI/clinical gating:** ProviderPortal (7 findings), OutcomesDashboard (mock KPI/providers/charts → real-or-empty), MedicationTracker (+ bonus ungated logs path), SettingsScreen insurance PHI, ConversationalBooking fallback providers.
2. **Money/legal:** SessionPayoutTrigger `(10%)`→rail %; ProviderApplication `15%`→35/10/5 + real legal links + drop unreachable `'pt'`; ProviderPayoutSetup `provider_id`→`id` (billing fields now save) + blue→teal.
3. **Dead/empty flows:** MyAppointments self-loads real bookings (`userId` prop) + wired join/cancel(confirm)/reschedule/review/questionnaire; App.tsx `session-payout` demo-gated.
4. **Workflow 1 (9 clusters, fix→adversarial-verify, all passed):** CareTab, RecordsVault (NaN/key/bulk bugs), JrKidMode (dynamic-Tailwind→lookup), ProviderLanding, PayerOutcomesDashboard, ProviderOnboarding/PricingTiers/SplashPage/FreeScreeningFlow, CommunityForYou/AskABCBA, ProviderMarketplace (deleted `generateMockProviders`) + AnalyticsCharts (mock→demo-gated + empty state).
5. **Consistency:** ScreenHeader adopted on AACTPartnerSetup (+ `rethink`→`Rethink` label), CareCoordinationHub, OrgAdminDashboard, OutcomesDashboard, MyAppointments. Deleted orphan `SplashScreen.tsx` + its test (removed from `package.json` test:run list).

## FABRICATION SWEEP — COMPLETED (workflow 2, re-run to completion + adversarially verified)
**Result: 27 components had real ungated fabrication → fixed & verified; 7 confirmed false-positives (no change); 2 intentional demo/dev screens left as-is (InvestorDemoMode, DeveloperModePanel).** Build clean. 9 of 11 clusters fully passed.
Two RESIDUAL follow-ups (NOT user-facing leaks — safe to defer, but finish for "perfect"):
- **`admin/UnitEconomicsView.tsx`** — the `!isDemoMode() && !hasRealData` empty-state is gated, but the `hasRealData===true` branch still renders `MOCK_CHANNELS`, `TIER_BREAKDOWN`, the Investor Summary block (lines ~562-589), and `computedMetrics` (spreads `MOCK_METRICS`, only patches churn) WITHOUT a gate or demo banner. **Component is currently orphaned (zero imports in src/) → no user sees it today.** Before wiring it, gate those 4 sections behind `isDemoMode()` (or derive from real data). 
- **`InvestorDemoMode.tsx`** — uses arbitrary-hex Tailwind classes (`to-[#577590]`, `from-[#43AA8B]/10`, `border-[#43AA8B]/20`) that Tailwind v4 won't emit without manual CSS in `src/index.css`. Demo-only + cosmetic (gradients may render flat). Add the utilities to `index.css` or swap to defined brand classes.

---

## THE REMAINING PLAN to "ALL components perfect + flawless" (do in order)

### Phase A — Finish fabrication gating (re-run workflow 2; ~1 workflow)
Re-launch the sweep, complete the pending files, re-verify. Confirm with:
`grep -rlE "MOCK_[A-Z]|DEMO_[A-Z]|FALLBACK_[A-Z]|Sarah Chen|Emma Thompson" src/components --include=*.tsx | grep -v demo-seed` → every hit must be demo-gated or a verified demo/dev-only screen.

### Phase B — ALL-COMPONENT audit (the user's explicit ask: not just high-vis)
There are **377 components**; only ~110 have been touched. Enumerate the rest and audit every one. Recommended: a workflow that fans out over `src/components/**/*.tsx` in batches of ~6 files/agent, each checking the SAME dimensions used so far:
1. fabricated data ungated to real users
2. dead handlers / `href="#"` / no-onClick buttons / `TODO`/placeholder copy shown to users
3. dynamic-Tailwind classes (won't render) + invalid shades
4. header/padding drift vs ScreenHeader; missing back control
5. a11y: icon-only buttons need `aria-label`; selects need labels
6. risky/false copy (absolute HIPAA, "guaranteed" payments, fabricated %/stats)
7. runtime risks (NaN dates/sizes, array-index keys, stale-closure state, optional props undefined in render)
Adversarially verify each finding before fixing. Track in a regenerated `AUDIT-FINDINGS.md`.
- Generate the full list: `find src/components -name '*.tsx' | sort > /tmp/all-components.txt` (377 files).

### Phase C — Significant testing + simulated test-users
- Install all browsers; run the **full 831-test** Playwright suite across chromium/firefox/webkit + Mobile Chrome/Safari/Tablet.
- Add E2E for every newly-gated screen: assert **real-user mode shows the empty state**, **demo mode shows sample data**. (New screens need entries in `e2e/screen-smoke.spec.ts`.)
- **Simulated test-user journeys** (write as new specs): (a) Parent: splash→screening→signup→onboarding→AI chat→book→pay(test)→appointments; (b) Provider: apply→approve→Stripe Connect→listed→booked→session→payout; (c) AACT exec: `?demo=aact` dashboards; (d) VC: `?demo=investor` walkthrough. Each must complete with **zero console errors** and correct empty/real states.
- Visual: screenshot every screen at 375×812 + tablet; check no overflow/wrap, consistent chrome. Lighthouse mobile (target ≥90 perf, ≥95 a11y).
- Cold-eye pass: have a real person (Amy / a CCV parent) try signup→first AI convo.

### Phase D — Final polish & VC/McKinsey readiness
Reconcile pricing copy, confirm all 3 revenue lanes have working Stripe SKUs + an E2E, update CLAUDE.md "What Still Needs Work", remove dev-only hooks (`window.__navigateToScreen`, the `* {opacity:1!important}` hack) once motion bug is confirmed fixed.

---

## NON-CODE TODOs (owner must do; I'm blocked from prod infra)
- `supabase db push` 5 pending migrations (`denial_records`, `superbills`/expenses, org-billing, ask_bcba, provider_partner_org) — currently cause benign console warnings + empty states.
- Stripe price IDs for Org SKU → `VITE_STRIPE_PRICE_ORG_MONTHLY` / `_YEARLY`.
- **Rotate the Twilio credentials** that were pasted in chat earlier. Set Supabase secrets via the Dashboard (CLI write to prod is blocked).
- GitHub branch protection on `main`; real `VITE_SENTRY_DSN`.

## Key locations
- Audit findings (authoritative, 75): `AUDIT-FINDINGS.md`
- Demo gate + sample data: `src/lib/demo-seed.ts` (`isDemoMode`, `DEMO_PROVIDERS`, `demoAppointments`, …)
- Fees: `src/lib/stripe-connect.ts`. Telehealth economics: `src/lib/telehealth-economics.ts`.
- Workflow scripts (this session): under `.claude/projects/.../workflows/scripts/aminy-audit-fixes-*.js` and `aminy-fabrication-sweep-*.js`.

## How to resume (paste as the first message of the new session)
> Read HANDOFF.md, CLAUDE.md, and AUDIT-FINDINGS.md. Continue the Aminy production-perfection work. **Phase A (fabrication gating) is DONE and merged into branch `production-hardening-audit-fixes` / PR #198.** Start at **Phase B**: audit ALL remaining ~267 components (everything in `src/components/**` not already touched — diff against the branch to find them), not just high-visibility, across the 7 dimensions in HANDOFF. Then Phase C (full multi-browser E2E + simulated parent/provider/AACT/VC test-user journeys) and Phase D (polish). Use multi-agent workflows (read-only audit fan-out → fix fan-out → adversarial verify). Run the full verification gate after each phase and report an honest grade with specific gaps. Keep going until build+tsc+unit+full-E2E are green and every component is audited. Also: gate the orphaned `UnitEconomicsView` hasRealData path + fix `InvestorDemoMode` hex classes (residuals noted above).
