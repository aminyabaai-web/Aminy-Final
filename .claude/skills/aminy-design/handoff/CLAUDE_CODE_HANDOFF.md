# Aminy MVP → Design System: Claude Code Migration Playbook

**Repo:** `github.com/aminyabaai-web/Aminy-Final` · React 19 + TS, Vite 6 PWA, **Tailwind v4 + Radix**, motion/react, Supabase, Stripe, Claude edge functions.
**Goal:** move the live MVP (`aminy.ai`) onto this design system without a big-bang rewrite. Work top-down; ship each phase.

> The design system in this package is the **north star**. `readme.md` = the law (voice, color, type, icons). `SKILL.md` = how you (Claude Code) should operate. `ui_kits/` = reference implementations of every surface. This file = the ordered route from where the code is today to there.

---

## How to run this (give Claude Code these exact instructions)

1. **Install the skill.** Copy this whole folder into the repo at `.claude/skills/aminy-design/`. Read `SKILL.md` then `readme.md` before writing any UI.
2. **Work phase by phase, in order.** Each phase below is independently shippable. Don't start P1 until P0 is merged — later phases assume the tokens exist.
3. **Never invent values.** Every color/space/radius/shadow comes from `handoff/theme.css`. If you need one that isn't there, add it to the theme first, then use the utility.
4. **Diff against the kits.** Before building a screen, open the matching `ui_kits/*/` file and match its structure, density, and copy register.
5. **Audit, don't assume.** Grep the codebase for the anti-patterns in each phase rather than trusting this list — the MVP is 339 components; some already comply.

---

## PHASE 0 — Tokenize (foundation; unblocks everything)

**Why first:** every later phase references these utilities. Until they exist, you're hand-coding hex values.

> **The code's CURRENT tokens (from `index.html`) are being REPLACED by this design system — not the other way around.** This system is the north star; bring the code to it.
> | Current in code | Replace with (this system) |
> |---|---|
> | `--brand-navy: #1B2733` | navy scale, ink `#0C2230` / `#132F43` |
> | `--brand-cream: #FAF7F2` (warm) | `--color-mist` `#F6FBFB` + mist gradient |
> | `--brand-teal: #6B9080` (sage) | teal `#2A7D99` (sampled from the logo needle) |
> | `--brand-coral: #E07A5F` | retire as primary; use earned-state amber/win where coral carried emphasis |
> | `Manrope` / `Inter` | `Schibsted Grotesk` (UI/body) + `Fredoka` (wordmark/display/affirmations) |

- [ ] Paste `handoff/theme.css`'s `@theme` block into the global stylesheet after `@import "tailwindcss";`. Confirm `bg-mist`, `text-navy-700`, `bg-teal-600`, `rounded-card`, `shadow-cta`, `font-serif` all resolve.
- [ ] **Find & replace the old brand values.** Grep for `#1B2733`, `#FAF7F2`, `#6B9080`, `#E07A5F`, `brand-cream`, `brand-teal`, `brand-coral`, plus `#0f172a`, `slate-`, `bg-white` page backgrounds, ad-hoc `rounded-[…]`. Map to the scale.
- [ ] **Swap the fonts.** Replace the Manrope/Inter `<link>` with the Schibsted Grotesk + Fredoka + Newsreader import from `theme.css`. Set Schibsted as base `font-sans` for ALL UI, headings, and affirmations; use **Fredoka** (`font-brand`) ONLY for the logo wordmark — it reads childish at heading sizes; `font-serif` (Newsreader) optional.
- [ ] Add the compass assets from `assets/` (`aminy_logo.png`, `aminy_lockup.png`, `aminy_compass.png`, `favicon.svg`, `mask-icon.svg`) to `public/` and wire favicon + PWA icons. **The logo stays exactly as-is — it's the anchor the whole system derives from.**

**Done when:** the app still looks ~the same, but no component contains a literal brand hex or font name. This is pure plumbing — no visual redesign yet.

---

## PHASE 1 — The shell & background (highest visual ROI, lowest risk)

**Why:** one change touches every screen. The MVP almost certainly uses a white/very-light page background; the brand is **mist, never pure white.**

- [ ] App background → `.bg-app` (mist → mist-deep gradient). White is now reserved for elevated cards only.
- [ ] **Parent app:** confirm the sticky **header** + **bottom nav** are present and load-bearing on every B2C screen (see `ui_kits/parent/`). Bottom nav: icon **+ label**, 44px+ targets, teal active state.
- [ ] **Provider OS:** LIGHT white sidebar (not dark) with the real `aminy_logo.png`, **teal** active state (not violet), and a topbar with a crisp Schibsted title (see `ui_kits/provider/`). Full surface set: Dashboard, Clients (searchable caseload), Credentialing (even progress stages), AI Notes (SOAP sign-off), Billing (claims + denial appeal), **Visit Verify / EVV** (GPS clock-in, records, authorization budget), **RBT Supervision** (BACB 5% tracking).
- [ ] Normalize card styling globally: white, `border-navy-100`, `rounded-lg`, `shadow-sm` resting / `shadow-md` hover. Kill any harsh black drop-shadows.

**Done when:** every screen sits on mist, cards float, and each surface has its correct chrome.

---

## PHASE 2 — Primitives (consistency engine)

Replace bespoke one-off elements with the system primitives. Source of truth: `components/core/` (`.jsx` + `.d.ts` + `.prompt.md`). Port them to your Radix/Tailwind stack, keeping the API.

- [ ] **Button** — exactly one `primary` (teal, `shadow-cta`) per view; everything else `secondary`/`ghost`. Audit for multiple teal CTAs competing on one screen and demote.
- [ ] **Badge** — tones map to earned states; stop using color decoratively.
- [ ] **Input** — 16px font floor (kills iOS zoom), 3px teal focus ring, sentence-case labels.
- [ ] **Card / Stat / Avatar / Nudge** — swap in. The **Nudge** (warm rounded Fredoka tip + teal left-stripe) is the signature card; use it for every proactive Aminy suggestion.
- [ ] **Icons:** standardize on **Lucide** in parent/provider (stroke 1.5 inactive / 2 active; always icon+label in nav). Remove any Heroicons/Feather/emoji from parent & provider chrome. Emoji live **only** in Ease.

**Done when:** no screen hand-rolls a button/badge/input/card; all come from the primitives.

---

## PHASE 3 — Voice pass (the brand's most protected asset — do not skip)

Copy *is* the product. Read `readme.md` §2, then sweep every user-facing string.

- [ ] **Validate first, inform second.** No screen leads with a metric or a task. Lead with the parent, then the data.
- [ ] **Kill shame & gamified guilt.** No "streak broken," no "you missed N check-ins," no "X% compliance," no 🔓"unlock." **Incomplete = empty circle, never a red ✕.**
- [ ] **Display headlines + affirmations → Fredoka (the logo font)**, and *only* affirmations/welcomes/celebrations/report-openers. Never labels, data, or errors.
- [ ] **Errors** name what happened + the next small step; never blame.
- [ ] **Provider voice:** warm + precise. Clinical terms fine ("1 claim needs a code review"); punitive framing ("you failed a claim") not.
- [ ] Length guardrails: buttons 1–3 words · card headlines ≤7 words · tips 1–2 sentences.

**Done when:** a tired parent at 11pm feels *helped*, not graded, on every screen.

---

## PHASE 4 — Motion & the moments that make it Aminy

- [ ] Global easing/durations → tokens (`ease-calm`, `duration-200`, etc.). Nothing bounces aggressively; everything exhales. Press = subtle scale (0.98), never a jolt.
- [ ] **Exhale** breathing ring → the 4s `ease-breath` cycle (gradient allowed here). See `ui_kits/parent/calm.jsx`.
- [ ] **Celebration moments** (wins, "calm coin") get the one sanctioned gradient + gentle pop — `ui_kits/ease/app.jsx` Reward screen is the reference.
- [ ] Respect `prefers-reduced-motion`: animations become instant end-states.

---

## PHASE 5 — Ease polish

- [ ] Kid surface = softer, rounder (radius 24–32), bigger emoji, single clear action per screen (`ui_kits/ease/`).
- [ ] Pastel set only (sky/indigo/purple/mint); **never** borrow parent navy/teal chrome. Reward language celebrates effort ("You took a breath. That counts."), never scores.

---

## PHASE 6 — iOS onboarding (first-run) — reference: `ui_kits/parent/onboarding.jsx`

The MVP's first-run is the highest-leverage conversion surface. Build it to these iOS patterns (all implemented in the kit):

- [ ] **Value-first.** Three calm welcome panels (rounded Fredoka headline + one-line body + soft line-icon tile) BEFORE any form or permission ask. No sign-up wall on screen one.
- [ ] **Progressive profiling.** One question per screen — parent name → child name+age → focus areas. Never a single dense form. Everything except the names is optional, with a persistent "Skip for now."
- [ ] **Permission priming (critical).** NEVER trigger the native notification dialog cold. Show the soft pre-prompt first ("A gentle nudge, only when it helps") explaining the value; only call `Notification.requestPermission()` if they tap **Turn on reminders**. "Maybe later" costs nothing — the system prompt isn't burned, so you can ask again at a better moment. This single pattern typically 2–3×'s opt-in rate.
- [ ] **Warm finish.** Confirm with the child's name + chosen focus chips, then a single "Open Aminy" into Home. The summary makes the two minutes feel worth it.
- [ ] **Mechanics:** 56px primary targets, thumb-reachable bottom CTA, progress dots on the welcome carousel, graceful fallbacks if fields are skipped, and a `localStorage` first-run gate (`aminy-onboarded`).

**Done when:** a parent goes welcome → set up → Home in under two minutes, has been *asked* (not forced) for notifications with context, and never saw a cold permission dialog.

---

## The pre-ship checklist (paste into PR template)

- [ ] Real Aminy copy — no lorem, no dashboard-speak
- [ ] Exactly one teal element (the primary action)
- [ ] Mist background, not white
- [ ] 44px+ tap targets
- [ ] Lucide (parent/provider) or emoji (Ease) — never mixed
- [ ] Parent app: header + bottom nav present
- [ ] Incomplete = empty circle, never a red ✕
- [ ] Display + affirmations in the rounded brand voice (Fredoka)
- [ ] A tired parent understands the screen in 3 seconds

---

## My recommended *significant* changes (you asked for these)

1. **Build the Provider OS as a first-class surface.** The README lists the B2B feature set (credentialing, AI notes, CPT billing, denial mgmt, EVV, RBT supervision, KPIs) but it reads as the weaker half today. `ui_kits/provider/` is a complete, opinionated target — treat the dark-sidebar + violet-accent layout as the spec. This is the biggest revenue surface and the biggest design gap.
2. **Commit to "mist, never white" platform-wide.** It's the single change that most makes the app *feel* like Aminy instead of a generic health SPA. Cheap, global, high-impact.
3. **Make the Nudge the backbone of the parent home.** Right now proactive guidance is likely styled like everything else. The Nudge (crisp grotesk tip + teal left-stripe) is your differentiator — it's what makes Aminy feel like a coach, not a tracker. Use it deliberately and sparingly (one hero nudge per screen).
4. **Ruthless teal discipline.** If three things are teal, two are wrong. A single pointer per view is what creates the calm. Audit and demote.
5. **Separate the three surfaces' design languages cleanly.** Parent (calm/Lucide), Provider (dense/violet), Jr (soft/emoji) should never bleed. Most MVP drift comes from one surface borrowing another's vocabulary.

---

*Caveat: I built these kits from your repo's README + tokens, not from pixel-matched screenshots of the live app. Before executing Phase 1, drop 3–5 screenshots of the real screens so the kits can be reconciled to production — otherwise treat the kits as the intended target and migrate toward them.*
