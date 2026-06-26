# PASTE THIS INTO CLAUDE CODE (Aminy session)

> You are finishing the Aminy app (`Aminy-Final` repo). The complete design system is in `.claude/skills/aminy-design/`. Your job: bring the entire codebase up to this design system and ship. Read, in order: `SKILL.md` → `readme.md` → `handoff/MERGE_GUIDE.md` → `handoff/CLAUDE_CODE_HANDOFF.md`. Use `handoff/theme.css` as the single source of design tokens (light + dark). Then execute the phases in MERGE_GUIDE §3 (A→F), in order, shipping each phase.

## DO THIS FIRST — order of operations (don't skip ahead)
1. **Tokens.** Paste `handoff/theme.css`'s `@theme` block into the global stylesheet (after `@import "tailwindcss";`). Confirm `bg-mist`, `text-navy-700`, `bg-teal-600`, dark mode via `[data-theme]` all resolve. This alone re-skins the app — do it before touching any screen.
2. **Fonts + brand.** Swap the font `<link>` to Schibsted Grotesk (UI/display) + Newsreader (serif accents) + Fredoka (logo only). Drop the brand assets into `public/`. Retire Manrope/Inter.
3. **Pick a pricing source of truth NOW** (see warning below) before porting any pricing/email copy.
4. **Port screens one at a time**, in MERGE_GUIDE phase order. For each: open the matching `ui_kits/*/*.jsx` reference, rebuild it with the repo's real components + data layer (these `.jsx` files are the visual+interaction SPEC, not drop-in code). Ship the phase, then move on.
5. **Final sweep** against the pre-ship checklist in `CLAUDE_CODE_HANDOFF.md`.

> ⚠️ **Pricing is inconsistent in the repo** — email templates quote Core at both **$14.99/mo** and **$69/mo**; the design system uses **$129/yr Core**. Choose ONE before porting so it doesn't propagate three numbers. Sweep `tier-utils.ts`, email templates, paywall, and website pricing together.

## What is fully designed (match these 1:1 — they are the spec)
Open each `ui_kits/*/index.html` in a browser; every screen is interactive and uses the real tokens.

**Parent app** (`ui_kits/parent/`): logo splash → "Why Aminy" animated story → conversational AI onboarding (multi-select, time-aware first step, notification priming) → Home (dynamic affirmation, TeleABA push, join-visit, nudge, stats, routine) · My Plan + AI 2-week practice plan · Ask Aminy (attach/voice/BCBA, thinking pulse) · Ask-a-BCBA (AI draft → signed review) · Exhale (breathe, 5-4-3-2-1, haptic bubbles, soundscapes) · TeleABA booking + live session (waiting room → in-call) · Find-your-guide marketplace + live sessions strip · Plans/paywall (14-day trial, cash vs insured) · Settings + "What Aminy knows" · Vault · Coverage · Community · Weekly report · **Ease entry (More → "Ease — hand the phone to Kai")** · **`auth.html`: welcome / create account / sign in / forgot + free M-CHAT-style screening → gentle result** · **`utility.html`: Stripe checkout (trial-aware), notifications center, medication tracker (log/refill/share), family outcomes dashboard**.

**Provider OS** (`ui_kits/provider/`): Dashboard · Clients · Credentialing · AI Notes (SOAP sign-off) · Needs-your-sign-off inbox · Messages (provider↔family) · Billing/claims · EVV (clock/records/budget) · RBT Supervision · Schedule + Join room. Light sidebar, real logo, teal accents, "Rise Pediatric Therapies". **Plus `extras.html`: Org/Admin portal (team seats, locations, compliance), Payer outcomes report (MCO cohort view), the provider application (license/NPI → credentials upload → availability → submit), Denial Workbench, Ask-the-brain clinical assistant, Payer Scorecard, and the Operator dashboard (5 tabs — pilot ops: active families, tier distribution, KPIs-vs-target, activation funnel, top AI intents, condition breakdown, marketplace GMV).**

**Website** (`ui_kits/website/`): the full aminy.ai marketing page — hero with phone mock, how-it-helps, families/providers split, Ease band, 4-tier pricing with real prices & per-tier savings, CTA band, compliant footer (HIPAA-conscious, AZ·MT·TX) — fully responsive. **Plus `legal.html`** (Terms · Privacy · NPP with "short version" TLDRs — final language needs counsel) **and `emails.html`** — full notification layer matched 1:1 to the backend: **11 Resend emails** (welcome, session reminder, BCBA answer, weekly progress, trial ending, receipt, win-back, report-shared, re-engagement, trial-progress day-4, session-notes-ready, + preferences center), **Twilio SMS** (parent 24h with "Reply STOP", parent 1h, provider reminder), and **web push** (VAPID, quiet-hours/focus rules). 600px fluid, email-safe inline styling.

**Ease** (`ui_kits/ease/`): feelings check-in → 6 playable activities (Bubble pop, branching Silly story, timed Stretch, Doodle draw+stickers+send, Sound bath, **tilt/shake Glitter jar**) → star reward with burst. Kid rules: pastels, Fredoka, emoji OK.

**Plus:** motion system (`tokens/motion.css`, `guidelines/motion.md`, `ui_kits/motion.jsx` helpers), dark mode (`tokens/dark.css`, `[data-theme="dark"|"auto"]`), haptics tiers, hidden scrollbars, reduced-motion contract.

## What is NOT drawn — build these BY PATTERN from the system (do not invent new styles)
Adaptive reminder settings detail and payer-specific admin variants only. For each: reuse the tokens, Card/Button/Badge/Input/Nudge/Stat primitives, screen-header pattern, and the copy voice rules in `readme.md`. (Legal pages and email templates ARE now drawn — see `ui_kits/website/legal.html` + `emails.html`; have counsel finalize legal language.)

## Naming (final)
Adult regulation space = **Exhale** (formerly "Calm Corner"). Kid mode = **Ease** (formerly "Aminy Jr"). Legal entity = **Aminy LLC**. Sweep all code/copy for the old names.

## Ease — the kid co-regulator (drawn in ui_kits/ease/)
Ease is a **rescue tool, not a games menu**: a melting-down child gets handed the phone and it starts calming IMMEDIATELY — autoplay breathing orb, slow phase text, rhythmic haptics, zero reading or choices required (rescue mode is the default entry, see the kit). Only after settling: gentle feelings check-in → six regulation activities → calm star. In production: make rescue mode the kid-profile entry AND a lock-screen/home-screen quick action so a parent reaches it in one gesture.

## iOS lifecycle surfaces (drawn — ui_kits/parent/ios.html)
- **Push**: calm copy, never guilt; "time-sensitive" interruption level ONLY for visit-start.
- **iMessage/SMS (Twilio)**: day-before reminder with reply **C** to confirm / **R** to reschedule; join link 10 min before.
- **Calendar**: every booking auto-sends .ics invites to all caregivers + the provider (Apple/Google/Outlook); reschedules update the same event.
- **App Store**: "The calm center of your child's care", 4+, Medical category.
- **Email preference center** (emails.html → Preferences): granular toggles; visit confirmations & security always send.
- **Gap to wire:** the repo's appointment-cancelled webhook isn't connected, so cancellations currently send NOTHING. Add a cancellation SMS + email (calm, no-guilt, one-tap rebook) using the existing templates as the pattern.

## Growth, retention & monetization playbook (screens drawn in ui_kits/parent/retention.html + emails.html)
- **Cancel-save flow** (industry save rates 40–60%): never one-tap cancel. Sequence: (1) progress recap — the child's wins, AI-memory count, signed answers ("look how far you've come"); (2) alternatives — **pause 1–3 months at $0** (keeps data frozen), **50% off 3 months** (the most-chosen offer), **downgrade to Free**; (3) short exit survey; (4) graceful exit: access through period end, data safe 90 days, one-tap restart. No dark patterns — easy exit builds the trust that drives return.
- **Delete account**: export-first prompt, explicit list of what's lost (the AI memory is the emotional anchor), pause alternative, type-DELETE confirm, 14-day grace restoration window.
- **Win-back**: email at +7d and +30d ("We saved Kai's spot — everything's where you left it") with the 50% offer, 30-day expiry.
- **Referral loop**: give-a-month/get-a-month + shareable win cards (parent-chosen moments only — never auto-share). Referred families convert and retain best-in-class.
- **Review ask**: prompt for App Store review only right after a logged win or a celebrated milestone — never cold.
- **Upsell timing**: annual-plan nudge at week 3 (after habit forms); Ask-a-BCBA upsell contextually when a question exceeds AI scope; dunning = 7-day grace + gentle retry emails, never instant lockout.
- **Tone everywhere**: hope + empowerment, AI-forward but human-accountable. We are the best developmental pediatrician, BCBA, coach, and friend in their pocket — and we say so with warmth, not hype.

## Mobile & responsive (required everywhere)
- The kits are per-breakpoint specs: **phone kits (390px) = the mobile spec; provider kits (1240px) = the desktop spec; the website + legal pages show both** (resize them — breakpoints at ~980px/860px).
- Parent app + Ease are mobile-first PWA; desktop gets the same screens centered with comfortable max-widths — do not invent desktop-only parent layouts.
- Provider OS on tablet: keep the sidebar. Below ~900px: collapse the sidebar to an icon rail; below ~640px: bottom tab bar with the 5 most-used items (Dashboard, Clients, Notes, Sign-offs, Schedule) and the rest behind a More sheet — reuse the parent app's bottom-nav pattern.
- Website/legal/emails: already responsive in the kits — match their breakpoints. Emails must render in Gmail/Apple Mail (inline styles, 600px fluid, no flex-dependent layout in production templates).
- Universal: 44px+ touch targets, 16px input font floor (no iOS zoom), hidden scrollbars on touch surfaces, safe-area insets on the phone shell.

## Non-negotiables while merging
1. Code adopts the design system — not the reverse. Retire `#6B9080`, `#43AA8B`, `#1B2733`, `#FAF7F2`, raw `blue-*`; Manrope → Schibsted Grotesk; Fredoka = logo only.
2. Gate ALL mock data behind `isDemoMode()` (trust/safety first — see MERGE_GUIDE Phase B hotspots).
3. Every tap responds (handler or toast). Haptics per the tier map. `prefers-reduced-motion` honored.
4. Copy: "HIPAA-conscious", rail-based fees (35/10/5%), 14-day trial, per-tier annual savings, never punitive language.
5. Tailwind v4: never interpolate class strings — static maps or inline styles.
6. Keep the PWA responsive container; the kits are the per-breakpoint visual spec (phone = parent/Jr, desktop = provider).

When all phases pass, do a final sweep against the pre-ship checklist in `CLAUDE_CODE_HANDOFF.md`.
