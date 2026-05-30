# Aminy — Claude Project Instructions
Updated: 2026-05-30 (see STRATEGY.md + HANDOFF.md for current state)

## What is Aminy?
Behavioral wellness PWA for neurodivergent families. React 19 + TypeScript + Vite + Tailwind CSS v4.

## Critical Architecture Rules

### Navigation — 42 Screens via State (NOT React Router)
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
- E2E (`npx playwright install chromium firefox webkit` first): **375 Chromium** screen-coverage + core · **65/65** journeys/acceptance/onboarding/navigation · **165/165** Mobile Chrome + Mobile Safari + Tablet · WebKit + Firefox core green
- 375px **visual baseline** established: `e2e/__snapshots__/visual-regression.spec.ts-snapshots/` (88 PNGs)
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
- **B2B Org SKU**: $99/seat/month, min 10 seats, 10% annual discount. See `src/lib/org-licensing.ts` + `OrgAdminDashboard.tsx`. Stripe Checkout via `/org/checkout` endpoint
- **Platform take rate** (`src/lib/stripe-connect.ts`): rail-parameterized — cash-pay 35%, insured 10%, aact_pilot 5%. Single source of truth: `PLATFORM_FEE_RATES`
- **Telehealth visits** (`src/lib/telehealth-economics.ts`): $79–$229 cash-pay, fully-modeled provider payout cents

### Partner attribution
- `src/lib/partner-org.ts` — detects `?org=aact` URL param, persists to localStorage, applies partner config to profile post-signup
- `PARTNER_CONFIGS.aact` auto-sets: pilot_organization, pilot_payers (AHCCCS + 9), **system_of_record=`rethink`** (AACT/Rise use **Rethink**, NOT CentralReach — the CentralReach lib/`cr-sync` screen are dormant, retire when the Rethink integration goes live), evv_system=sandata
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
- **Pending DB migrations** to apply via `supabase db push`:
  - `20260514010000_audit_log_and_admin_rls.sql`
  - `20260515120000_org_billing.sql`
  - `20260515130000_consolidate_starter_to_core.sql`
  - `20260515140000_ask_bcba.sql`
  - `20260515150000_provider_partner_org.sql`
- **Schema gaps to fix** (causing console warnings on smoke test, not crashes):
  - `audit_log.action_description` column missing in deployed schema (migration not pushed)
  - `denial_records` table missing (claims-dashboard logs error, renders empty state)
  - `provider_profiles.is_active` column not in deployed schema
- **Stripe price IDs** for Org SKU — needs setup in Stripe dashboard then `VITE_STRIPE_PRICE_ORG_MONTHLY` / `_YEARLY` env vars
- **Branch protection on `main`** — GitHub → Settings → Branches
- **Sentry DSN** — VITE_SENTRY_DSN env var needs real DSN
- Debug hooks (`window.__navigateToScreen`) + the `App.tsx` dummy-userId bypass are **already `import.meta.env.DEV`-gated** (not in prod; the hooks are needed by E2E which runs on the dev server). The opacity hack (`* { opacity: 1 !important }`) is **load-bearing** (motion/react WAAPI bug) — do NOT remove until that's fixed.

## Current state & strategy (2026-05-30) — see STRATEGY.md + HANDOFF.md
- Active branch `phase-b-all-component-audit` → **PR #199**. Revenue model v2 live (tiers/discount/fair-use/trial all drift-guarded by `tier-config-consistency.test.ts`); Claude confirmed primary in prod; independent-BCBA practice-in-a-box wedge built (`ProviderPortal` my-practice hub + `provider-practice.ts` practiceMode + honest billing rails); payer-type funnel (insured→coverage tools, cash→full funnel).
- **Blocked on owner:** Rethink sandbox creds (to *prove* EMR sync — today scaffolded), `supabase db push` the pending migrations (incl. `20260530000000_provider_practice_mode.sql`), set the Rethink/remaining secrets, rotate the Twilio token, Stripe Org price IDs, Sentry DSN, branch protection, staff/cold-eye validation.
