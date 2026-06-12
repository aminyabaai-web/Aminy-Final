# Known Issues — Aminy
_Last updated: 2026-06-11. Every session should read this before starting and update it before closing._

---

## Load-bearing workarounds (do NOT remove without fixing the root cause)

### 1. `[style*="opacity: 0"] { opacity: 1 !important }` in `src/index.css`
**Root cause:** motion/react v12 WAAPI bug leaves `opacity: 0` as an inline style after exit animations complete.
**Workaround:** The CSS attribute selector targets only elements with an inline `style="...opacity: 0..."` — does NOT override Tailwind class-based `opacity-50`/`opacity-75` etc. (those use CSS classes, not inline styles). WAAPI takes precedence over `!important` while animations are running, so active transitions still work correctly.
**Impact:** Lower than originally documented — Tailwind opacity utilities are NOT broken by this hack. The real cost is conceptual overhead (195 files import motion/react) and bundle size.
**Fix path:** Not urgent. If replacing motion/react: convert simple enter/exit patterns to CSS `@keyframes`, keep motion/react for physics-based animations (SensoryFidget, SquishBall).

### 2. `window.__navigateToScreen` debug hook in `App.tsx`
**Root cause:** E2E smoke tests need a programmatic navigation handle. React Router was ruled out (see CLAUDE.md).
**Workaround:** Hook is `import.meta.env.DEV`-gated — not in production builds.
**Fix path:** No urgent fix needed; just don't remove the DEV guard.

---

## Architecture debt

### 2b. Rate limiter fail-open — alerting improved 2026-06-11
`checkRateLimit`, `checkGlobalRateLimit`, `checkDailyUsage` in `make-server-8a022548/rate-limiter.ts` all fail open (correct for UX — don't deny service when rate-limit infra is down).
**Fixed:** All three now log `[RATE_LIMIT_FAIL_OPEN]` as structured JSON with userId/endpoint/tier. Filter on this tag in Supabase dashboard → Functions → Logs to detect abuse.
**Still open:** No push alert — would require Supabase log-based alerting or a webhook call from the catch block.

### 3. `make-server-8a022548` edge function — 4,000-line monolith
All AI, billing, and provider routes are in one function. A deploy for any route redeploys all ~322KB.
**Impact:** Slow deploys; one broken route blocks all.
**Fix path:** Split into `supabase/functions/ai/`, `billing/`, `provider/`. Shared auth/DB helpers in a `_shared/` dir.

### 4. Key-value store used for relational queries
Some provider/session data is stored in a KV table instead of the real Postgres tables.
**Impact:** Can't efficiently query "providers in AZ accepting patients."
**Fix path:** Migrate provider-routes to query `provider_profiles`, `children`, `session_notes` directly.

### 5. `src/index.css` at ~16k lines
All CSS utilities, custom colors, gradients, oklch fallbacks, and dark-mode overrides in one file.
**Impact:** Dark mode gaps keep appearing because reviewers miss things in a 16k-line file.
**Fix path:** No urgent refactor, but: when adding new components, add dark variants in the component file (Tailwind `dark:` classes) rather than in index.css.

### 6. `App.tsx` — 42-screen state machine (lazy loading ALREADY DONE)
All screen routing lives in one file. **All 42 screen components are already lazy-loaded** with `React.lazy()` + `Suspense` — first paint is not blocked.
**Remaining impact:** Every new screen still requires an App.tsx edit → merge conflicts.
**Fix path:** No urgency on splitting further; the bundle cost is already solved.

---

## Features that are scaffolded / not fully wired

### 7. CentralReach integration — DORMANT but already gated
`src/lib/cr-sync.ts` and the `cr-sync` screen exist. Gated by `crSyncEnabled` feature flag — unreachable from regular user navigation. AACT/Rise uses **Rethink**, not CentralReach.
**Status:** No urgency — gate works. Remove when a dedicated cleanup session won't introduce risk.

### 8. Daily.co video — needs credentials, API key security fixed 2026-06-11
When `VITE_DAILY_DOMAIN` is missing, `OnDemandTelehealth` shows "Video calling is being set up."
**Fixed:** Removed `VITE_DAILY_API_KEY` from `src/lib/daily-config.ts` — API key must be a Supabase secret (`DAILY_API_KEY`), never a `VITE_` var (would expose it in the browser bundle).
**Owner action:** Sign up at daily.co, add `VITE_DAILY_DOMAIN=<subdomain>` to Netlify env vars, add `DAILY_API_KEY=<key>` to Supabase secrets. Use the prebuilt iframe — don't build custom video UI.

### 9. Payer / EVV / Claims dashboards — already gated, not a nav problem
`payer-dashboard` (`b2gEnabled`), `evv-dashboard` (pilot state), `claims-dashboard` (`b2gEnabled`) are all feature-gated — unreachable by regular users. They render empty states only in E2E smoke tests (via debug `window.__navigateToScreen`).
**Status:** No action needed for regular users. Data pipeline wiring needed if/when AACT pilot enables b2g.

### 10. Rethink integration — mock data only
`src/lib/rethink-integration.ts` webhook handlers are stubs. Edge function returns mock data.
**Blocked on:** Rethink sandbox credentials (`RETHINK_CLIENT_ID`, `RETHINK_CLIENT_SECRET`) → set in Supabase secrets.

---

## Pending owner actions (cannot be done in code)

### 11. Supabase Pro upgrade
Free plan pauses projects after 7 days inactivity → data loss risk before AACT pilot.
**Action:** supabase.com/dashboard → your org → Billing → Upgrade to Pro ($25/mo).

### 12. Rotate Supabase access token
A token was exposed in a session transcript.
**Action:** https://supabase.com/dashboard/account/tokens → revoke old token → create new one.

### 13. ~~Stripe price IDs for Org SKU~~ — NOT NEEDED (RESOLVED)
The live `make-server-8a022548` org checkout uses **dynamic `price_data`** computed per-seat from the volume ladder and DB `price_per_seat_cents`. No static Stripe price IDs are needed.
`VITE_STRIPE_PRICE_ORG_*` env vars are referenced in the legacy `src/supabase/functions/server/index.tsx` only — that file is NOT the deployed function. Those vars are stale; ignore.

### 14. Rethink sandbox credentials
See item 10.
**Action:** Request sandbox from Rethink → add `RETHINK_CLIENT_ID` + `RETHINK_CLIENT_SECRET` to Supabase secrets.

---

## AI / product gaps

### 15. AI is reactive, not proactive
The AI waits for the parent to open chat. The data for proactive nudges exists (behavior logs, streak data).
**Example feature:** "3 meltdowns logged this week, all ~5pm — want to talk about the dinner transition?"
**Fix path:** A Supabase cron (pg_cron) or edge function scheduled trigger that queries behavior patterns and sends push notifications via `src/lib/notifications.ts`.

### 16. Memory is session summaries only
`conversation-memory.ts` stores summaries. No structured child model (sensory profile, known triggers, what's worked).
**Fix path:** `child_profile` table with structured fields, updated by AI after each session that contains new behavioral data.

### 17. `sanitizeForAI` was over-filtering legitimate messages
**Fixed 2026-06-11:** Removed stripping of `<>{}[]` chars and code blocks, removed role-prefix regex that fired on "the school system:". Now only strips LLaMA/Alpaca control tokens. Claude is the real injection defense.

---

## Testing

### 18. E2E uses `domcontentloaded` not `networkidle`
`e2e/screen-smoke.spec.ts` uses `waitForLoadState('domcontentloaded')` + 1200ms wait.
**Reason:** Background API polling in Dashboard prevents network from ever going quiet. `networkidle` caused systematic CI timeouts.
**Do not change back to `networkidle`.**

---

## Duplicate builds to watch for

### 19. BCBASessionBriefing was built twice
Two parallel sessions independently built BCBA briefing → merge conflict in PR #249.
**Lesson:** Check this file before building anything provider/BCBA related.
