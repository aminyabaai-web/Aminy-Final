# Aminy — Claude Project Instructions
Updated: 2026-05-30 (see STRATEGY.md + HANDOFF.md for current state)

## What is Aminy?
Behavioral wellness PWA for neurodivergent families. React 19 + TypeScript + Vite + Tailwind CSS v4.

## Critical Architecture Rules

### Navigation — 106 Screens via State (NOT React Router)
- All navigation uses `currentScreen` state in `App.tsx`
- NEVER add React Router — it will break the entire app
- Debug: `window.__navigateToScreen('screen-name')` in browser console

### Tailwind CSS v4 — Custom Colors Need Manual CSS
- Tailwind v4 does NOT auto-generate arbitrary `bg-[#hex]` classes
- Any new hex colors MUST have manual CSS utilities added to `src/index.css`
- Existing custom colors: `#0D1B2A`, `#1a3a5c`, `#466379`, `#4a6478`, `#577590`, `#43AA8B`, `#E07A5F`, `#F8F8F6`
- oklch() colors need RGB hex fallbacks in `:root` overrides

### Gradients — Use v4 Format
- Format: `from-{color}`, `via-{color}`, `to-{color}` (not `from-{color}-500`)
- Direction classes: `bg-gradient-to-b`, `bg-gradient-to-t`, etc.
- 174 gradient stop classes already defined in `src/index.css`

### Animations — motion/react v12 WAAPI Issues
- motion/react may leave `opacity:0` inline style after animations
- Current workaround: CSS `* { opacity: 1 !important; }` in index.css + cleanup interval in App.tsx
- This is a known issue, not a bug you introduced

### Body Scroll — DO NOT Use position:fixed
- `body.mobile-optimized` uses `overflow-x:hidden; overflow-y:auto`
- NEVER change to `position:fixed; overflow:hidden` — it breaks login scroll

### Fixed positioning — NEVER put a containing-block trigger on a layout ancestor
- Per CSS spec, `transform` (incl. `translateZ(0)`), `filter`, `perspective`, `will-change: transform`, and `contain: layout|paint|strict|content` on ANY ancestor make it the containing block for `position:fixed` descendants — re-pinning them to that ancestor instead of the viewport.
- A "GPU/CLS optimization" layer had sprinkled these on `html`, `body`, `#root`, `<main>`, scroll wrappers, `.mobile-polish-wrapper.is-mobile *` (universal!), and the `CLSOptimizer` app wrapper — silently un-pinning the bottom nav, chat FABs, and fixed modal overlays (they fell below the fold on short screens). Fixed + guarded by the EOF reset in `src/index.css` and `e2e/visual-audit` bottom-nav tests. Do NOT reintroduce these on structural containers; use `isolation: isolate` for a stacking context without a containing block.
- Tailwind v4 is **precompiled** here (no JIT): a `bottom-24`/`top-N` offset class only works if it's literally in `src/index.css`. A `position:fixed` element with a missing offset class silently falls to its static-flow position. Add missing offsets to `src/index.css`.

## Key Files
| File | What It Contains |
|------|-----------------|
| `src/App.tsx` | Main app, screen routing, WAAPI cleanup, debug hooks |
| `src/index.css` | ~16k lines: ALL CSS fixes, custom colors, gradients, oklch fallbacks |
| `src/components/LoginScreen.tsx` | Login UI (blue bar fix applied) |
| `src/components/BenefitsStatusPanel.tsx` | Benefits screen (crash fix: default props) |

## Known Fixes (DO NOT REVERT)
1. `BenefitsStatusPanel.tsx` — `{ statuses = [] }` default prevents crash
2. `App.tsx` — Junior props restructured to prevent crash
3. `index.css` — 8 hex color utilities, 174 gradient stops, oklch fallbacks, scroll fix, opacity hack
4. `LoginScreen.tsx` — No `overflow:hidden` or `transform:scale(1.25)` on logo

## Testing (verified 2026-05-30)
- Preview: `aminy-dev` on port 3001 (`~/.claude/launch.json`); viewport 375x812 (mobile-first)
- Unit: `npm run test:run` — **332 passing** (incl. tier-config-consistency drift guard + monetization + economics)
- E2E (`npx playwright install chromium firefox webkit` first): **full chromium suite 877 passed / 2 skipped / 0 failed** (all 28 specs) · **165/165** Mobile Chrome + Mobile Safari + Tablet · WebKit + Firefox core green
- 375px **visual baseline**: `e2e/__snapshots__/visual-regression.spec.ts-snapshots/` — `visual-regression.spec.ts` stable 42/42 (fonts-ready settle + fullPage-dashboard tolerance for motion/react animation-frame variance)
- **Prod AI smoke**: `npm run smoke:ai` — asserts the deployed `chat` fn returns Claude (catches silent OpenAI-fallback). CONFIRMED live: `claude-sonnet-4-6`.
- Screen-smoke/golden-path error filters ignore the benign WebKit `interactive-widget` viewport warning.

## GitHub
- **Repo:** `aminyabaai-web/Aminy-Final` (private; transfer from `edgarstaren` complete)
- **Branching:** Feature branches off `main`, opened as PRs. `main` is the only long-lived branch.

## Signup Funnel (Noom-style, live as of PR #174)
- Splash "Start free" → `FreeScreeningFlow` (pre-auth value: empathy first, validated screening, "Aminy Insights" interludes, results) → soft signup wall → `AIOnboarding` chat → first AI suggestion → dashboard.
- Pre-signup screening data persists in `localStorage` (`aminy_screening_results`); migration to Supabase happens inside `handleOnboardingComplete` in `App.tsx`.
- `CreateAccountScreen` offers Apple OAuth + Google OAuth + magic-link (`signInWithOtp`) alongside password signup.
- Magic-link delivery requires Supabase Auth → URL Configuration to include `${origin}/auth/callback`.

## Architecture additions (May 2026)

### AI
- **BevelChatOverlay** = bottom-sheet AI chat with hamburger history (≡) on left, ⚙️ settings on right.
- **Header**: "Aminy AI" (renamed from "Aminy Intelligence" — was wrapping to 3 lines at 375px)
- **Model**: Claude `claude-sonnet-4-6` is primary (via Supabase secret `ANTHROPIC_API_KEY`); OpenAI gpt-4o is fallback
- **Vision**: chat accepts image attachments, base64 content blocks sent to Claude. See `BevelChatOverlay.sendMessage` for the image-payload branch
- **Voice**: mic icon records → `POST /ai/transcribe` → Whisper → fills input. OpenAI key required for STT
- **Deep screen-context**: components publish state via `src/ai/screenStateRegistry.ts` → injected into system prompt
- **Custom Instructions**: ChatGPT-style 2-field about-me/response-style block, stored in localStorage `aminy-custom-instructions`
- **Personality**: 4 styles in `src/lib/ai-personality.ts` (Caregiver/Coach/Researcher/Partner) — chosen in settings panel
- **Smart actions**: AI can embed `[ACTION:LOG_BEHAVIOR:{...}]` tokens that auto-execute Supabase mutations

### Revenue
- **Tiers**: Core $14.99/mo, Pro $29.99/mo, Pro+ Family $49.99/mo. "Starter" is a legacy alias that maps to Core
- **B2B Org SKU**: seat LADDER (June 2026) — 1 seat $89 · 2 $79 · 3 $69 · 4 $59 · 5+ $49/seat/mo, MIN_SEATS=1, 15% annual. `SEAT_PRICE_LADDER` in `src/lib/org-licensing.ts` is canonical; `/org/checkout` in make-server mirrors it (redeploy fn after changes)
- **Platform take rate** (`src/lib/stripe-connect.ts`): rail-parameterized — cash-pay 25% (lowered from 35% June 2026 to be competitive for solo BCBAs), insured 10%, aact_pilot 5%. Single source of truth: `PLATFORM_FEE_RATES`
- **Per-tier limits** (`src/lib/tier-utils.ts`): AI 3/day free → 100/day fair-use paid; vault storage 100MB free / 5GB Core / 25GB Pro / unlimited Family; memory inject depth 5/25/100/250 facts (prompt injection per session; stored-fact caps are separate in `getTierLimits()`)
- **Telehealth visits** (`src/lib/telehealth-economics.ts`): $79–$229 cash-pay, fully-modeled provider payout cents
- **Ask-a-Behaviorist** (`src/lib/ask-bcba-economics.ts`): STAFFING model, never per-answer payouts — on-call RBTs ($25/hr) review AI drafts ≈ $2.50/answer. Rails: partner-org ($0 cost), Pro+ 10 q/mo, 7-day post-1:1-telehealth window (CPT 98970-98972 aligned; group sessions do NOT open it). NO pay-per-question (owner decision — gate to book-session/upgrade instead). User-facing copy says "behaviorist", never promises a BCBA
- **Group sessions + cohorts**: `group_sessions.format` single|cohort (`session_count` weeks, program pricing). Cross-surfaced in ResourceLibrary article cards + CommunityHub strip
- **Apple 30% defense** (`src/lib/platform-purchase.ts`): ALL subscription checkouts must use `openSubscriptionCheckout()` — external browser on native iOS, never Stripe inside the WebView

### Partner attribution
- `src/lib/partner-org.ts` — detects `?org=aact` URL param, persists to localStorage, applies partner config to profile post-signup
- `PARTNER_CONFIGS.aact` auto-sets: pilot_organization, pilot_payers (AHCCCS + 9), **system_of_record=`rethink`** (AACT/Rise use **Rethink**, NOT CentralReach — the CentralReach lib/`cr-sync` screen are dormant, retire when the Rethink integration goes live), evv_system=`dci` (AACT/Rise use DCI; per-partner configurable)
- `AACTPartnerSetup.tsx` is the partner-admin microsite (one-click invite URL + bulk CSV import)
- `ProviderPortal.tsx` hides Credentialing/Claims tabs for AACT/Rise providers (org handles those)

### HIPAA
- `audit_log` table + `logPHIView()` wired into ProfileScreen, RecordsVault, BevelChatOverlay, App.tsx auth listener
- RLS policies for 6 admin tables (`claim_ready_cases`, `partner_invoices`, etc.) — migration `20260514010000_audit_log_and_admin_rls.sql`
- AES-GCM PBKDF2-derived non-extractable key (no sessionStorage exposure) in `src/lib/security/encrypted-storage.ts`

### New components / screens
- `OrgAdminDashboard.tsx` — B2B seats/billing/members (org-admin screen)
- `AskABCBA.tsx` — async parent→BCBA messaging w/ AI draft (ask-bcba screen) — competes with Answers Now
- `AACTPartnerSetup.tsx` — partner-admin onboarding microsite (aact-partner-setup screen)

## What Still Needs Work
- ✅ **DB migrations: ALL APPLIED** (verified via Supabase MCP June 9, 2026) — audit_log+RLS, org_billing, starter→core, ask_bcba, provider_partner_org, provider_practice_mode, plus schema-gap fixes (audit_log columns 20260607, denial_records 20260606/0608, security hardening 20260606). Do NOT re-apply.
- **Stripe: ONE deploy command activates everything** — `supabase functions deploy make-server-8a022548`. Done June 9 2026: live price IDs baked into `stripe-routes.ts` PRICE_IDS fallbacks (all 4 tiers incl. proplus, monthly + annual matching ADVERTISED totals $129/$279/$479 — the old Stripe annual prices were 10%-off derivations that overcharged vs the advertised price), org checkout uses dynamic price_data with DB `price_per_seat_cents` (default + rows set to 4900 = $49), 15% org annual, 7-day trial all tiers. `VITE_STRIPE_PRICE_ORG_*` env vars are referenced nowhere — stale idea, ignore.
- **Branch protection on `main`** — GitHub → Settings → Branches
- **Sentry DSN** — VITE_SENTRY_DSN env var needs real DSN
- **A11y**: re-run the axe-core e2e suite to confirm zero WCAG criticals (an old report flagged Privacy Policy, but current `PrivacyPolicy.tsx` has no images — likely stale)
- **Design polish (non-blocking)**: 8 screens have 11px min font (target 12px): telehealth, junior, provider-portal, provider-onboarding, claims-dashboard, payer-dashboard, evv-dashboard, cr-sync; cr-sync + telehealth lack a clear primary CTA
- Debug hooks (`window.__navigateToScreen`) + the `App.tsx` dummy-userId bypass are **already `import.meta.env.DEV`-gated** (not in prod; the hooks are needed by E2E which runs on the dev server). The opacity hack (`* { opacity: 1 !important }`) is **load-bearing** (motion/react WAAPI bug) — do NOT remove until that's fixed.

## Current state & strategy (2026-06-09) — see STRATEGY.md + INVESTOR-READINESS.md
- Revenue model v2 live and drift-guarded; June 2026 pricing: cash-pay take 25%, B2B $49/seat min 5 seats 15% annual; per-tier storage quotas (100MB/5GB/25GB/∞) + AI memory inject depth (5/25/100/250) enforced.
- AI context fully wired: vault docs + BCBA session-note content + persistent memories all injected into chat system prompt; AI calls carry session JWT (paid users get paid limits).
- **Blocked on owner:** Rethink sandbox creds (EMR sync scaffolded, unproven), remaining secrets, rotate the Twilio token, Stripe Org price IDs, Sentry DSN, branch protection, executed BAAs (Anthropic/Twilio/Sentry), clinical advisor, staff/cold-eye validation. See INVESTOR-READINESS.md "Pre-Investor Priority Stack".
