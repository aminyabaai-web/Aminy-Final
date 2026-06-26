# Aminy Design System

**The AI companion for neurodivergent families — and the practice OS for the providers who serve them.**

This repo is the single source of truth for *what Aminy feels like*. If a screen or flow doesn't feel like it belongs to Aminy, it likely violates something here. When in doubt: **make it quieter.**

---

## 1. What Aminy is

Aminy is a **two-sided behavioral-wellness platform** for autism / ADHD / anxiety families and their ABA care teams:

| Surface | Who it's for | Tone |
|---|---|---|
| **Aminy (parent app · B2C)** | Parents, caregivers | Calm, clinical-lite, trustworthy. The compass. |
| **Aminy Provider (B2B)** | BCBAs, RBTs, clinic admins | Efficient, data-dense — same bones, more signal. Violet accent. |
| **Ease** | Children (~4–11) | Soft, playful, big-emoji. Never condescending. |
| **Marketing / public** | Prospective parents & clinics | Warm, literary, quietly confident — never "hero-y". |

All surfaces share one logo (the compass), one navy + teal core, and the compass metaphor. They diverge in **density, rounding, accent saturation, and iconography** (Lucide for parent/provider; emoji for Ease).

Every parent-facing decision is checked against the **"exhale test"**: *does seeing this help the parent breathe easier?*

### Sources (store even if the reader can't open them)
- **Live codebase:** `github.com/aminyabaai-web/Aminy-Final` — React 19 + TypeScript, Vite 6 + PWA, **Tailwind CSS v4 + Radix UI**, motion/react, Supabase, Stripe, Claude via edge functions. 339 components in `src/components/`; screen-based navigation via `currentScreen` in `App.tsx`. Provider demo: `?demo=investor`; partner branding `?partner=aact|rise`.
- **Design export** that seeded this system: `uploads/` (original `README.md`, `colors_and_type.css`, `SKILL.md`, `design_system.html`, `ui_kit_parent.html`, `ui_kit_jr.html`) + brand zip → `assets/`.
- **Brand assets:** real compass logo (`assets/aminy_logo.png`, `aminy_lockup.png`, `favicon.svg`, `mask-icon.svg`) and the mark hydrator `assets/aminy_mark.js`.

---

## 2. CONTENT FUNDAMENTALS — the voice (Aminy's most protected asset)

Copy is not decoration. Copy *is* the product. The standard: treat every family like **your own child is the patient**. If you wouldn't say it to a friend at 2am deleting WebMD tabs, don't put it on screen.

**Voice principles**
1. **Validate first, inform second.** Never lead with a metric or a task.
2. **Celebrate consistency, not perfection.** "3-day streak" beats "72% compliance."
3. **Speak like a trusted coach, not a dashboard.** "You showed up today" — not "Engagement +1."
4. **Short sentences. Plain words.** Parents read while a child tugs their arm.
5. **No fake urgency, no gamified guilt.** Never imply they're failing.
6. **Name the feeling, then offer the next small step.**

**Aminy says** → "Hi Sarah, here's Kai's calm start today." · "One deep breath can reset the whole moment. You already know that." · "You don't have to be perfect. You just have to be present. And you are."

**Aminy never says** → "Boost your parenting score!" · "You missed 3 check-ins this week." · "Unlock premium insights 🔓" · anything starting with "Don't forget to…"

**Length guardrails** — Buttons 1–3 words · card headlines ≤7 words · tips/affirmations 1–2 sentences (rounded brand voice) · errors name what happened + the next move, never blame.

**Provider voice** stays warm but adds precision: clinical terms (CPT 97153, NET, prompt-fading, 5% supervision) are fine; punitive framing is not. "1 claim needs a code review" — not "You failed a claim."

**The brand voice (Fredoka — the logo font) carries display headlines + affirmations** — only affirmations, welcome lines, "you earned a calm star" moments, weekly-report openers. Never for UI labels, buttons, data, or errors. (Newsreader remains available as an optional editorial serif for long-form reports.)

---

## 3. VISUAL FOUNDATIONS

Every value lives in `styles.css` → `tokens/*`. Highlights:

- **Color.** **Teal `#2A7D99`** is the *only* primary — CTAs, active state, progress, the compass needle. One teal element per view. **Navy `#0D1B2A`** is voice (ink): headlines, body, nav. **Mist `#F6FBFB → #EDF4F7`** is the default background — *never pure white*; white is for elevated cards. **Amber / Green / Violet / Red** are **earned** (wins, growth, clinical, true urgency) — never decoration, never >2 accents per screen. Ease uses a separate sky/indigo/purple/mint pastel set; parent never borrows from it.
- **Type.** **Schibsted Grotesk** (400–800) for body, UI, data, labels; **Fredoka** (the logo font) for the wordmark, display headlines, and affirmations; **Newsreader** kept as an optional editorial serif. Body 16px floor on mobile (no iOS zoom); long-form line-height 1.625 (parents read tired).
- **Radius.** Nothing sharper than 8px in the parent app. Inputs 8 · buttons 12 · cards 16 · hero 22 · modals 28 · pills full. Ease goes higher (24–32 on tiles).
- **Elevation.** Soft "bevel" shadows, never harsh black. `--shadow-sm` resting, `--shadow-md` hover, `--shadow-xl` on header panels; `--shadow-cta` (teal glow) marks the primary CTA only.
- **Motion.** Calm, breath-timed. `--ease-calm` default, `--ease-breath` for the breathing ring, `--ease-lift` for card hover. Durations 120 / 200 / 360ms; the breathing ring is 4s. Nothing bounces aggressively — everything exhales. Press = subtle scale (0.98 parent / 0.95 Ease), never a jolt. Hover = darker teal or a 1px lift, never a glow flash.
- **Backgrounds.** Flat mist or a mist→mist-deep gradient. **Gradients are reserved** for the breathing ring, celebration moments, and all of Ease. No decorative gradient backgrounds in the parent/provider apps.
- **Cards.** White, hairline `--color-border`, 16px radius, resting `--shadow-sm`. The **Nudge** is the signature card: warm rounded tip (Fredoka) + teal left-stripe.
- **Imagery.** Warm, calm, real parent/child photography when available — otherwise the compass mark or nothing. **Never invent SVG illustration scenes.**

---

## 4. ICONOGRAPHY

- **Parent & Provider apps: Lucide only.** Stroke 1.5 inactive / 2 active. 20×20 default, 24×24 primary nav. Never mix in Heroicons/Feather. **Always pair icon + label** in navigation. A working subset is bundled in `ui_kits/parent/icons.jsx` (and inline in the provider kit); pull the rest from `lucide.dev` / `unpkg.com/lucide-static`.
- **Grammar:** Home `Home` · Aminy AI `Sparkles` · My Plan `Heart` · Care/Telehealth `Video` · Exhale `Wind` · Vault `FolderOpen`/`File` · Coverage `Shield` · Community `Users` · Wins `Award`/`Star` · Trends `TrendingUp` · Provider billing `CreditCard` · Credentialing `Shield` · Notes `FileText`.
- **Emoji** are permitted **only in Ease** (and inside user-authored chat content). Never in parent/provider UI chrome.
- **The compass mark** is identity only — app icon, loading state, hero brand moment. Hydrate via `assets/aminy_mark.js` (`<span class="aminy-mark"></span>` / `<span class="aminy-compass"></span>`). Never decorative.

---

## 5. Repo index / manifest

```
styles.css                  ← global entry (consumers link this); @import list only
tokens/
  fonts.css                 ← Schibsted Grotesk + Fredoka + Newsreader (Google Fonts)
  colors.css                ← navy / teal / stone / surfaces / earned states / Ease + semantic aliases
  typography.css            ← families, size scale, line-height, weights
  spacing.css               ← 4pt scale, touch targets, radii, z-index
  elevation.css             ← shadows + motion (easing, durations)
brand/brand.css             ← .aminy-mark / .aminy-lockup + composable type helpers (.aminy-display, .aminy-affirm…)
assets/                     ← compass logo, lockup, favicon, mask-icon, aminy_mark.js
guidelines/                 ← foundation specimen cards (Colors · Type · Spacing · Brand)
components/core/            ← React primitives: Button · Badge · Input · Card · Nudge · Stat · Avatar
                              (each: .jsx + .d.ts + .prompt.md; core.card.html is the gallery)
ui_kits/
  lib.jsx                   ← standalone mirror of the primitives (kits render without the compiled bundle)
  parent/                   ← B2C app: Home · Ask Aminy · Exhale · My Plan · More
  provider/                 ← B2B practice OS: Dashboard · Credentialing · AI Notes · Billing
  ease/                     ← Ease: feelings check-in · activities · calm star
SKILL.md                    ← Claude Code / Agent Skills entry point
```

**Where to start** — Parent screen? `ui_kits/parent/`. Provider screen? `ui_kits/provider/` (violet accent, denser). Kid screen? `ui_kits/ease/` (warmth wins). Need a token? `tokens/`. Writing copy? Re-read §2, twice.

---

*Non-negotiables checklist before shipping: real Aminy copy (no lorem) · one teal element · mist background not white · 44px tap targets · Lucide (parent/provider) or emoji (Ease), never mixed · header + bottom nav present in the parent app · incomplete = empty circle, never a red ✕ · affirmations in serif italic · a tired parent at 11pm understands it in three seconds.*
