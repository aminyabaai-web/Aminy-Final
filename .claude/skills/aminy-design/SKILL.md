---
name: aminy-design
description: Use this skill to generate well-branded interfaces and assets for Aminy — the AI companion for neurodivergent families (B2C parent app + B2B provider practice OS + Ease kids' app). Contains essential design guidelines, voice, colors, type, fonts, brand assets, and reusable UI kit components for production work or throwaway prototypes/mocks.
user-invocable: true
---

# Aminy Design

Read `readme.md` in this skill first — it is the source of truth for voice, color, type, iconography, and the repo map. Then explore the other files.

- **Making a visual artifact** (slides, mocks, throwaway prototype): copy the assets you need out of `assets/`, link `styles.css`, and produce static/interactive HTML the user can open. Compose the primitives in `components/core/` and copy the closest screen from `ui_kits/`.
- **Working in the production codebase** (`github.com/aminyabaai-web/Aminy-Final`, React 19 + Tailwind v4 + Radix): copy the tokens into your Tailwind `@theme`, lift the component patterns, and use this skill's rules to design like an Aminy native.
- If invoked with no other guidance, ask what they want to build, ask a few sharp questions, then act as an expert Aminy designer who outputs HTML artifacts *or* production code depending on the need.

## The five things that break the brand if you get them wrong
1. **Copy is half the design.** Real Aminy copy, never lorem or dashboard-speak. Validate first, inform second. (readme §2)
2. **Mist, not white.** Background is `--aminy-mist`; white is for elevated cards only.
3. **Teal is a pointer, not a theme.** One primary teal element per view.
4. **Never shame the user.** Incomplete = empty circle, never a red ✕. No "streak broken," no missed-day counts.
5. **Right iconography per surface.** Lucide in parent/provider; emoji only in Ease/Jr. 44px minimum tap target.

## Surfaces
- **Parent app (B2C)** — calm hub. Sticky header + bottom nav are load-bearing. `ui_kits/parent/`.
- **Provider OS (B2B)** — denser, violet (`--aminy-care-600`) accent, same bones. `ui_kits/provider/`.
- **Ease (kids)** — softer, rounder, bigger; gradients + emoji welcome. `ui_kits/ease/`.

## Files
- `styles.css` → `tokens/*` + `brand/brand.css` — link this one file; every token + webfont ships from its `@import` closure.
- `components/core/` — Button · Badge · Input · Card · Nudge · Stat · Avatar (`.jsx` + `.d.ts` + `.prompt.md`).
- `ui_kits/lib.jsx` — standalone mirror of those primitives so kits render without a build step.
- `assets/` — compass logo, lockup, favicon, and `aminy_mark.js` (hydrates `<span class="aminy-mark">`).
- `guidelines/` — foundation specimen cards.

When in doubt: **make it quieter.**
