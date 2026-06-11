# Known Issues — Aminy
_Last updated: 2026-06-11. Every session should read this before starting and update it before closing._

---

## Load-bearing workarounds (do NOT remove without fixing the root cause)

### 1. `* { opacity: 1 !important }` in `src/index.css`
**Root cause:** motion/react v12 WAAPI bug leaves `opacity: 0` as an inline style after animations complete.
**Workaround:** The CSS override + a cleanup interval in `App.tsx` (`clearOpacityHack`).
**Fix path:** Replace framer-motion `motion.*` with CSS transitions for simple enter/exit animations. Only keep motion/react for complex sequenced animations. Remove the hack after confirming opacity is clean.

### 2. `window.__navigateToScreen` debug hook in `App.tsx`
**Root cause:** E2E smoke tests need a programmatic navigation handle. React Router was ruled out (see CLAUDE.md).
**Workaround:** Hook is `import.meta.env.DEV`-gated — not in production builds.
**Fix path:** No urgent fix needed; just don't remove the DEV guard.

---

## Architecture debt

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

### 6. `App.tsx` — 42-screen state machine
All screen routing lives in one file.
**Impact:** Every screen change touches App.tsx; merge conflicts are frequent.
**Fix path:** Extract screen groups into lazy-loaded chunks (React.lazy + Suspense). Group by user type: parent-screens, provider-screens, admin-screens.

---

## Features that are scaffolded / not fully wired

### 7. CentralReach integration — DORMANT
`src/lib/cr-sync.ts` and the `cr-sync` screen exist but are not used. AACT/Rise uses **Rethink**, not CentralReach.
**Action needed:** Remove from nav entirely until/unless a CentralReach customer is signed. Wire is clean to remove.

### 8. Daily.co video — falls back to mocks
Telehealth video falls back to mock/stub when Daily.co isn't configured.
**Action needed:** Either get Daily.co credentials + wire them, or remove the feature card from the UI until ready.

### 9. Payer / EVV / Claims dashboards — render empty state
`payer-dashboard`, `evv-dashboard`, `claims-dashboard` render empty states because the backing tables aren't populated.
**Action needed:** Hide from nav for non-AACT users until the real data pipeline is wired.

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

### 13. Stripe price IDs for Org SKU
Org checkout flow needs `VITE_STRIPE_PRICE_ORG_MONTHLY` and `VITE_STRIPE_PRICE_ORG_YEARLY` env vars.
**Action:** Create prices in Stripe dashboard → add to Netlify env vars.

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
