# Design Excellence Plan — Every Screen an A

**Goal:** all 112 screens, every button, every feature at Apple/Calm-grade polish (grade A).
**Baseline:** full visual audit of 2026-07-15 (112 screens @ 390×844, seeded parent + provider accounts, three independent design reviews). Distribution at audit time: ~40 A · ~45 B · ~24 C · 3 F.
**Already banked (PR #341–#344):** all three F's, all P0s, the five systemic root causes (H1 focus-outline box, broken/untappable toasts, invisible `bg-emerald-600` CTAs, `contain:strict` clamping steppers/toasts, touch-target rule crushing chips), pilot-banner collapse, jargon sweep of EVV/timesheet/gates, dev-stub restyle, 15+ layout fixes.
**Post-#344 estimated distribution:** ~55 A · ~50 B · ~7 C · 0 F. This plan closes the rest.

**Definition of A (the rubric every screen/button/feature is graded against):**
1. Mist background; white for elevated cards only; **one** teal primary element per view; accent colors only when earned (wins/growth/clinical/urgent).
2. Zero layout defects at 390×844: no overlap, no mid-word truncation, no clipped/flush-to-edge elements, no dead zones > 25% of viewport without intent.
3. Copy in brand voice: parent surfaces warm + short ("validate first"); provider surfaces precise, non-punitive; **zero** internal/ops/compliance jargon; zero placeholder text.
4. Every visible control does something real, has a visible pressed/disabled/loading state, ≥44px tap target, and an accessible label. No fake affordances.
5. Empty/zero/error states: icon + one warm sentence + one real action. Errors name what happened and the next move.
6. Icons: Lucide only (parent/provider), emoji only in Ease; consistent stroke; no blank icon circles.
7. Type: ≥12px absolute floor (16px body on inputs), consistent capitalization, no orphaned words in headings.

---

## Phase 1 — Palette & Chrome Consolidation (systemic; lifts ~20 screens)

The largest residual defect class is **accent drift**: green/emerald/mint/sage/periwinkle/link-blue competing with brand teal.

| # | Work item | Screens lifted | Notes |
|---|---|---|---|
| 1.1 | Replace emerald CTA system in CaregiverEnrollmentWizard with brand teal `#2A7D99` (the #344 fix made buttons visible; they're still off-palette) | caregiver-enrollment | Utilities already exist |
| 1.2 | Link-blue long paragraphs → navy body text; blue reserved for actual links | telehealth, on-demand-telehealth | 2 components |
| 1.3 | Off-palette one-offs → teal: redeem-gift mint CTA, parent-calm-mode periwinkle ratings, parent-approval green Accept, medications/treatment-plan green icons, memory-settings purple shield, benefits blue pin | 6 screens | Mechanical |
| 1.4 | Sage/muddy gradients → brand mist/teal: marketplace header, insight-report header | 2 screens | Keep hero feel, fix hue |
| 1.5 | Background consistency: account-settings + developmental-screener warm-gray → mist; grant-navigator full-dark rebuild to mist + Lucide hero (kill 💰 emoji); aact-ops-dashboard dark header → mist + labeled tabs | 4 screens | grant-navigator is a mini-redesign |
| 1.6 | Compliance chrome wording: "HIPAA-Conscious"/"PHI encrypted" chips → "Private & encrypted" (legal pages keep formal terms) | waiting-room, vault, on-demand-telehealth | Copy only |
| 1.7 | Star-currency color unified (yellow vs green) in token-rewards | token-rewards | Pick one (yellow) |

**Owner decisions needed (blocking 1.x completion):**
- **D1:** Gift/sponsor screens use green throughout — intentional "giving" identity or converge to teal? (Recommend: keep one green family for gift surfaces, document it as an earned accent.)
- **D2:** Ease/Junior rainbow tiles — design system permits pastel set for kids; confirm current tiles are within intent.

## Phase 2 — Remaining Layout Punch List (per-screen; ~15 screens)

| Screen | Defect | Fix |
|---|---|---|
| p-profile | "My Profile" tab wraps to 2 lines; email row shows explainer instead of address; 3 competing badge colors | Shorten tab labels; show address + lock icon; single badge style |
| p-provider-landing | Checklist items run together ("Free to join✓Competitive rates") | Add gaps/line breaks |
| p-community-hub | "+ New Post" flush to right edge; duplicate teal chip row | Padding; demote secondary chips |
| p-conversational-booking + p-dashboard card | Blank icon circles (asset not rendering) | Root-cause the icon (likely failed image/lazy Lucide); fix render |
| p-medications | Refresh button collides with subtitle wrap; "Today's Schedule" tab wraps | Header row flex fix; shorter labels |
| p-forgot-password | Unanchored dead zone above title | Top-align like login |
| p-telehealth | Back arrow misaligned beside wrapped title | Header alignment |
| p-on-demand-telehealth | Availability chip flush to right edge | Padding |
| b-treatment-plan-editor | Title squeezes to 3-line stack | Truncate title + move actions |
| b-provider-portal | Checklist descriptions ellipsis-truncate; 0% progress bar reads filled | line-clamp-2; visible track styling at 0% |
| b-provider-reviews | Header cramped at top edge | Safe-area padding |
| b-caregiver-credentialing | Stray teal dot artifact; 40% dead space | Remove artifact; pull content up |
| b-credentialing-support | Tab chips truncate off-screen; CAQH state has no button | shrink-0 + scroll; add Connect button |
| b-clinical-reports | No header/title bar at all | Add ScreenHeader |
| b-session-payout | Empty state missing icon | Add icon |
| b-aact-partner-setup | Roster sentence clipped at fold | Card padding |

## Phase 3 — Copy & Content to A (voice pass; ~10 screens)

| Screen | Item |
|---|---|
| p-store | "Curated affiliate recommendations" → parent-voice ("Tools other Aminy families love") |
| p-analytics | Gate copy "Business analytics remain internal…" → friendly not-yet copy (use the #344 gate pattern) |
| b-bcba-portal | Route resolves to org gate copy — give clinicians a clinician-voiced gate or route to provider-portal |
| b-impact-metrics | "Internal sample metrics" + fabricated 847-families numbers + Q1-2025/2026 mismatch → either real zeros with honest empty states or clearly-watermarked SAMPLE mode; fix period labels |
| p-insight-report | "Living Intake Document" pill → parent words ("Liam's story — always up to date") |
| p-outcomes-story | Redundant heading/body ("story is just beginning" ×2) | 
| p-outcome-measures | "Track Your Child's progress" capitalization |
| b-provider-onboarding | "cash-pay or layered insurance rails" → plain; label the two duplicate FileText step icons distinctly |
| p-benefits | "Prior Auth" quick-action → "Approvals" (keep term inside flow where context explains it) |
| p-group-sessions | Emoji filter chips → Lucide; add back affordance |

## Phase 4 — Zero-State & Feature Completion ("every feature an A")

The audit's remaining C-class problems are screens that are *structurally fine but empty/fake without data*. Buttons/features count here.

| # | Item | Type |
|---|---|---|
| 4.1 | p-outcomes / p-analytics-charts / b-access-requests empty states need real actions — requires small features: "Set first goal" deep-link into care-plan goal creation; "Log a win" quick action; provider invite-family link (InviteFamiliesPanel exists — wire it) | small features |
| 4.2 | p-share-viewer invalid-link error: add "Ask for a new link" (mailto/share) beside the trial CTA | small feature |
| 4.3 | p-marketplace contradiction: "Live in AZ…" pill vs "no verified providers yet" empty state — gate the pill on actual supply, or reword empty state ("Providers are onboarding in your state now") | logic+copy |
| 4.4 | Demo-data seeding kit: a `?demo=family` seeded account with 3 weeks of routines/wins/goals/sessions so stat tiles, charts, streaks, and briefings render populated (kills the all-dash/all-zero C-grades in demos AND is the J-demo account) | tooling |
| 4.5 | Button sweep (all 112 screens, scripted): enumerate every `<button>`/link → assert ≥44px, visible focus-visible, disabled style ≠ invisible, has accessible name, onClick real (no bare `toast.success` fakes — grep sweep) | audit harness |
| 4.6 | Wire or remove the remaining flagged fake affordance backlog from grep sweep in 4.5 | follow-up |

## Phase 5 — Interaction Feel (the "gentle like Claude" bar)

1. Press states: global audit that every tappable surface has the brand press behavior (scale 0.98 parent / 0.95 Ease) — currently inconsistent.
2. Screen-transition consistency: same enter animation everywhere (breath-timed, `--ease-calm`); kill any jarring instant swaps.
3. Loading: replace remaining frozen skeletons (WAAPI opacity hack neutralizes `animate-pulse` — same root cause as the referral card fix; audit all `animate-pulse` usages and swap to the spinner pattern that works).
4. Back-affordance audit: every non-tab screen reachable from nav must have a working back control top-left (group-sessions currently missing; sweep all).
5. Keyboard/VoiceOver spot-check on the golden path (axe e2e suite re-run + manual pass).

## Phase 6 — Lock It In (A-grade enforcement so it never regresses)

1. **Visual-regression baseline ×112**: extend `visual-regression.spec.ts` from 42 to all 112 screens at 390×844 (seeded accounts). Any pixel drift = CI failure.
2. **Rubric checklist in CI**: the button sweep (4.5) becomes an e2e spec (`design-rubric.spec.ts`): tap targets, accessible names, no mid-word truncation (scan for ellipsis inside chip/button nodes), one-primary-teal heuristic.
3. **Copy linter**: greps CI for banned strings on user surfaces ("shadow mode", "system of record", "payer matrix", "reconciliation", "lorem", "your client", "A friend gets").
4. Re-run the 3-reviewer audit after Phases 1–5; require 112/112 A. Anything below A loops back.

---

## Execution order & effort

| Phase | Scope | Est. effort (focused sessions) | Dependencies |
|---|---|---|---|
| 1 Palette/chrome | ~20 screens | 1 session | D1, D2 owner calls |
| 2 Layout punch list | ~16 screens | 1 session | none |
| 3 Copy pass | ~10 screens | 0.5 session | none |
| 4 Zero-state/features | 6 items | 1–1.5 sessions | 4.4 informs demo |
| 5 Interaction feel | app-wide | 1 session | after 1–3 |
| 6 Enforcement | harness | 1 session | after 1–5 |
| Final re-audit | 112 screens × 3 reviewers | 0.5 session | last |

Total ≈ 6–7 focused working sessions. Phases 1–3 are independent and parallelizable (same 4-crew pattern as the audit-fix round). Every phase lands as its own PR behind the full gate (typecheck / 500 unit / golden-path + provider + screen-smoke e2e / visual verify).

## Owner decision queue (nothing else blocks)

1. **D1** Gift green: keep as earned "giving" accent or converge to teal?
2. **D2** Ease/Junior palette: confirm current pastels are within kids-surface intent.
3. **D3** `outcomes-dashboard` in parent IA: keep (parent-phrased, per #344) or remove from parent nav entirely?
4. **D4** Screens with no feature behind them yet (access-requests invite flow depth, share-viewer recovery): OK to ship the small versions in 4.1–4.2, or defer?
