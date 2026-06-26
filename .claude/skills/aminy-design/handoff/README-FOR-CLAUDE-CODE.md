# README FOR CLAUDE CODE — start here

You are finishing the **Aminy** app in this repo (`Aminy-Final`). A complete design system has been
committed to this repo as a skill. Your job: bring the codebase up to that design system and ship.

## Where everything is
The design system lives at: **`.claude/skills/aminy-design/`**
(If it's somewhere else, search the repo for `SKILL.md` + `readme.md` + a `handoff/` folder — that's the root.)

## Read these, in this exact order
1. `.claude/skills/aminy-design/SKILL.md` — what this is, how to use it.
2. `.claude/skills/aminy-design/readme.md` — brand, voice, visual foundations, file index.
3. `.claude/skills/aminy-design/handoff/MERGE_GUIDE.md` — **the bridge.** Reconciles what THIS repo
   already has against what the design improved. Authoritative product facts, the merge playbook
   (Phases A→F), responsive + dark-mode status, the Tailwind v4 gotcha. **This is your main map.**
4. `.claude/skills/aminy-design/handoff/CLAUDE_CODE_HANDOFF.md` — the pre-ship checklist.
5. `.claude/skills/aminy-design/handoff/theme.css` — the design tokens (light + dark) as a Tailwind
   `@theme` block. **Single source of truth for color/type/spacing/radii.**

## Do this first — order of operations (don't skip ahead)
1. **Tokens.** This repo already has `src/styles/design-tokens.css`. **Replace its values** with the
   ones in `handoff/theme.css` (colors, type scale, spacing, radii, light + dark). Do NOT keep two
   competing token files. After this one change the whole app re-skins — do it before touching screens.
2. **Retire the legacy palette.** Search-and-replace the three legacy teals/greens (`#6B9080`,
   `#43AA8B`) + raw `blue-*` drift with the new scale. (Details in MERGE_GUIDE §0.)
3. **Fonts + brand.** Schibsted Grotesk (UI/headings) + Newsreader (serif accents) + Fredoka
   (logo ONLY). Drop the brand assets from `.claude/skills/aminy-design/assets/` into `public/`.
4. **Decide pricing source-of-truth NOW** (see warning below) before porting pricing/email copy.
5. **Port screens one at a time**, in MERGE_GUIDE Phase order. For each screen: open the matching
   `.claude/skills/aminy-design/ui_kits/*/*.jsx` reference and rebuild it with THIS repo's real
   components + Supabase/Stripe data layer. **The `.jsx` files are the visual + interaction SPEC,
   not drop-in code** — they use a lightweight in-house component layer, not your real one.
6. **Final sweep** against `CLAUDE_CODE_HANDOFF.md`.

## Highest-risk work — do before any cosmetic polish ships
MERGE_GUIDE **Phase B**: every fabricated provider / PHI / earnings / Rx array must be gated behind
`isDemoMode()` with a real empty-state fallback. Shipping fake PHI is the biggest trust/safety risk
in the repo. Hot spots are listed in the guide.

## ⚠️ Known inconsistencies to resolve (don't propagate them)
- **Pricing.** Email templates quote Core at both **$14.99/mo** and **$69/mo**; design uses
  **$14.99 / $129-yr**. Pick ONE and sweep `tier-utils.ts`, emails, paywall, website together.
- **Trial length.** Standardize on **14-day** (live code); kill the 7-day dead code.
- **Platform fees are rail-based** (`cash_pay 35%` · `insured 10%` · `aact_pilot 5%`) — never
  hardcode "10%"/"15%".
- **HIPAA wording** is always **"HIPAA-conscious"**, never "HIPAA-compliant".
- **Tailwind v4 JIT**: never interpolate class names (`bg-${c}-500`) — use static maps or inline
  styles, the way `ui_kits/ease/app.jsx` does.

## What's drawn that the code should adopt vs. what the code has that isn't drawn yet
See MERGE_GUIDE §1 and §2. Short version: the design wins on look/feel/interaction; the code wins on
real data + business logic. Merge = code adopts the design's visual/UX layer; a few real backend
surfaces (provider review inbox, messaging, add-to-calendar, live sessions) still need drawing —
build them in the design's voice.

## TL;DR
Adopt `theme.css` tokens repo-wide → force the shared `<ScreenHeader>` everywhere → gate all mock
data behind `isDemoMode()` → wire every dead handler → copy/compliance sweep → pull in the design
upgrades (mist surfaces, Nudge, haptics, fades) and draw the missing surfaces. Work phase by phase;
ship each phase.
