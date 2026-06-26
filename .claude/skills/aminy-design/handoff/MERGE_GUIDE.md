# Aminy — Code ⇄ Design Merge Guide (for Claude Code)

**Read this with `CLAUDE_CODE_HANDOFF.md` and `theme.css`.** This file is the bridge: it reconciles what the **live `Aminy-Final` repo** actually has against what **this design system** improved, so the merge lands at "perfection" with minimal pain. Built from a deep read of the repo (App.tsx, provider suite, EVV, marketplace, paywall, AskABCBA, JrKidMode) and the repo's own `AUDIT-FINDINGS.md` (75 items).

> **North star:** this design system wins on *look & feel & interaction*; the code wins on *real data, backend, and business logic*. Merge = code adopts the design's visual/UX layer; design inherits the code's data wiring + the surfaces it already has that we haven't drawn.

---

## 0) The single most important context: real product facts (use these, not guesses)

These are the **authoritative** values pulled from the live code. Where this design system used a placeholder, swap to these:

| Concern | Real value in code | Action |
|---|---|---|
| **Platform fee rails** | `cash_pay 35%` · `insured 10%` · `aact_pilot 5%` (`stripe-connect.ts` `PLATFORM_FEE_RATES`) | Use rail-based fee everywhere. **Never** hardcode "10%" or "15%". |
| **Tiers** | Core $14.99/$129 · Pro $29.99/$279 · Family $49.99/$479 | Our `plans.jsx` matches. Keep. |
| **Trial** | **14-day** (live SplashPage/CreateAccount). Some dead code says 7-day. | Standardize on **14-day**. Fix our `plans.jsx` (currently says 7-day Core trial). |
| **Annual savings** | Only **Core ≈28%**; Pro ≈22.5%; Family ≈20% | Compute per-tier; don't show a global "save 28%". |
| **Supported states** | AZ, MT, TX (FL, NV appear inconsistently) | Drive from `SUPPORTED_PROVIDER_STATES`; reconcile. |
| **HIPAA wording** | Standard is **"HIPAA-conscious"**, never "HIPAA-compliant" | Audit every surface; we already use soft wording — keep it. |
| **Telehealth video** | **Daily.co** (CSP allows `*.daily.co`) | Our `session.jsx` call UI maps to a Daily room. |
| **Backend** | Supabase (data) + Stripe Connect (payments) | All our mock arrays become Supabase reads. |
| **EVV** | SpokChoice primary · DCI transition · Acumen fiscal agent · AZ DDD pilot (shadow) | Our EVV screen already reflects the shadow-pilot model. |
| **SoR integrations** | Rethink · CentralReach · Aminy-native | Display-label the enums (not raw `rethink`). |
| **Practice name** | "Rise Pediatric Therapies" | Updated in our kits. |

### Brand color reconciliation (decide once)
The code currently ships **three different teals/greens** (`#6B9080` sage in index.html, `#43AA8B` in provider screens, raw `blue-600` drift in several). This design system standardizes on **`#2A7D99` teal sampled from the real logo**, navy ink `#0C2230`/`#132F43`, mist surfaces. **Recommendation (north-star):** adopt the design tokens from `theme.css` repo-wide and retire `#6B9080`/`#43AA8B`/`brand-cream`/raw blues. This is the single change that most unifies the app.

---

## 1) What the CODE has that this DESIGN does not (draw these next)

The repo has real surfaces we haven't designed yet. Priority order to bring into the design system:

1. **Provider review inbox + "needs your sign-off" digest** — the provider side of Ask-a-BCBA / AI notes (families' questions + AI drafts awaiting signature). *(agreed build — do next)*
2. **Provider Schedule with "Join session"** → Daily.co room (today it's a no-op stub: `ProviderPortal.tsx` L1338 `onStartSession` TODO).
3. **Add-to-Calendar** (Apple/Google/Outlook) — `AddToCalendarButtons.tsx` exists; wire on booking confirm for family + provider.
4. **Provider↔client Messages** (real threads; today CareTab fakes a coach reply).
5. **Live/advertised provider sessions** families can drop into — `CommunityForYou.tsx` already has a "LIVE Q&A / Join Now" concept (currently a dead button).
6. **Outcomes / analytics dashboards** (family + payer/MCO) — `OutcomesDashboard`, `PayerOutcomesDashboard`, `AnalyticsCharts`.
7. **Medication tracker**, **Records vault** (full), **Org/Admin portals**, **Provider application/onboarding**, **Adaptive reminders**, **Free screening flow**.

## 2) What this DESIGN improved that the CODE should adopt

Bring these from the design system *into* the code:
- **Mist-never-white surfaces**, soft bevel shadows, 16px-floor inputs, the **Nudge** card, tiered **haptics**, screen-transition fades, **Fredoka logo-only** (code uses Manrope — fine for body, but our type scale + crisp headings are the target).
- **De-childified, consistent chrome** via one shared header (the code already has `<ScreenHeader>` — the audit's #1 layout-drift theme is screens NOT using it; mandate it).
- **Every button does something** (toasts/handlers) — directly answers the audit's huge "dead-handler" cluster.
- **Calm, non-punitive copy** + the affirmation voice.

---

## 3) The merge playbook (do in this order)

**Phase A — Tokens & chrome (mechanical, high impact)**
1. Drop in `theme.css` `@theme`; replace `#6B9080`/`#43AA8B`/`#1B2733`/`#FAF7F2`/raw `blue-*` with the scale.
2. Mandate `<ScreenHeader>` on every screen the audit flagged (CareTab, MyAppointments, AskABCBA, CareCoordinationHub, OrgAdmin, AACTPartnerSetup, OutcomesDashboard…). Kills the layout-drift cluster.
3. Swap fonts per `theme.css` (Schibsted body/headings; Fredoka logo only).

**Phase B — Kill the mock-data leaks (the audit's CRITICAL cluster — trust/safety)**
Every fabricated provider / PHI / earnings array must be gated behind `isDemoMode()` and fall back to a real empty state. Hot spots: `CareTab`, `ProviderPortal` (L461, L1460), `MedicationTracker` (fake Rx!), `SettingsScreen` (fake insurance), `OutcomesDashboard`, `ConversationalBooking` (fake provider into Stripe!), `ProviderLanding`. **This is the highest-risk work in the repo — do it before any cosmetic polish ships.**

**Phase C — Wire the dead handlers**
Add-to-Calendar, Reschedule/Cancel, Join Call, bulk Delete/Archive/Share (RecordsVault — currently *fakes* deletion of PHI!), Community "Join Now", notification bell, Export/Share. Use our design's "every tap responds" principle.

**Phase D — Copy/compliance sweep**
"HIPAA-compliant"→"HIPAA-conscious"; remove "guaranteed biweekly pay"; soften "24/7"; fix platform-fee labels to rail-based; per-tier annual savings; AskABCBA "typically within 24 hours"; remove fabricated efficacy/testimonial claims.

**Phase E — Bring in the design upgrades** (mist, Nudge, haptics, fades, calm copy) and **draw the missing surfaces** from §1.

**Phase F — Responsive + dark mode** (see below).

---

## 4) Responsive (honest status)

**This design system is built mobile-first and is NOT yet fully responsive.**
- **Parent app & Ease** are drawn in a **fixed 390px phone frame** — they look great as a phone mockup but don't reflow to tablet/desktop. The *components* use flex/grid and would adapt, but the frame is fixed.
- **Provider OS** is drawn at a **fixed 1240px desktop** width — great on desktop, not yet adapted to tablet/mobile (the real `ProviderPortal` had mobile tab-bar bugs the team already patched with `shrink-0`).
- The **real app is a responsive PWA** that must work on all three. The audit flags real responsive bugs (`grid-cols-2` cramped at 375px, duplicate `gap` utilities, fixed 2-col license fields).

**Recommendation:** treat our kits as the **visual+interaction spec per breakpoint** (phone = parent/Jr, desktop = provider), and in code keep the PWA's responsive container while adopting our styling. If you want, I can produce **explicit tablet + desktop layouts** for the parent app and a **mobile layout** for the provider app as a follow-up — say the word.

**Update — fit-to-viewport added:** all three kit `index.html` files now scale their frame to fit any screen (down-only, capped at 1×) so the phone mockups and the 1240px desktop provider frame are fully visible on laptops, tablets, and small windows without overflow or horizontal scroll. This makes the *mockups* presentable everywhere; it is not the same as the production PWA reflowing its layout per breakpoint (that work stays in code, guided by these specs).

## 5) Dark mode (honest status)

**Not addressed yet — neither this design system nor (from the read) a finished dark theme in the code.** Our tokens are light-only today.
**Recommendation:** add a `@media (prefers-color-scheme: dark)` (or `.dark`) token scope that remaps semantic aliases only — `--color-bg` → deep navy `#0C1620`, `--color-bg-elevated` → `#142430`, text → warm off-whites, and **desaturate teal slightly** so the needle color doesn't vibrate on dark. Because the whole system is built on **semantic CSS variables**, dark mode is a *token-layer* change — components don't need edits. I can build this as a clean addition whenever you want; it's a ~1-file token overlay plus a specimen card.

---

## 6) Tailwind v4 gotcha (will bite the merge)
The repo's `CLAUDE.md` + audit confirm: **Tailwind v4 JIT only emits classes that appear as complete static strings.** `JrKidMode.tsx` builds `bg-${color}-500` at runtime → never generated → unstyled kid screens. When you port our Ease colors, use **static lookup maps** (full class strings) or inline styles/brand hex — exactly how our `ease/app.jsx` uses inline styles. Don't reintroduce dynamic class interpolation.

---

## 7) TL;DR for Claude Code
1. Adopt `theme.css` tokens repo-wide; retire the three legacy teals + raw blues.
2. Force `<ScreenHeader>` everywhere (fixes most layout drift).
3. Gate ALL mock data behind `isDemoMode()` → real empty states. (Trust/safety first.)
4. Wire every dead handler; adopt our "every tap responds" + haptics.
5. Copy/compliance sweep (HIPAA-conscious, rail-based fees, no false guarantees).
6. Pull in design upgrades (mist, Nudge, fades) + draw the missing provider review/messaging/calendar/live-session surfaces.
7. Keep responsive PWA container; plan dark mode as a token overlay.
8. Never interpolate Tailwind classes (v4 JIT).
