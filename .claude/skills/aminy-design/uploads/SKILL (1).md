# Aminy — SKILL.md

**Read this before designing anything for Aminy. If you skip it, your work will feel generic and we will send it back.**

This file tells you how to actually make an Aminy design — where to start, which files to load, and the small number of things that will break the brand if you get them wrong.

---

## 0. What Aminy is

Aminy is a behavioral wellness platform for parents of neurodivergent children (autism, ADHD, anxiety). It is: an AI chat companion (*"Ask Aminy"*), a daily routine hub, a telehealth booking surface, a care-plan tracker, and a separate kid-facing surface called **Ease** (a.k.a. **Ease**).

It is **not** a gamified parenting app. It is not a dashboard-first metrics product. It is a calm hub that celebrates consistency, validates the parent first, and only then informs.

---

## 1. Before you design: load these files

Always open these in order:

1. **`README.md`** — voice, palette, icon grammar, layout rules.
2. **`colors_and_type.css`** — the only source of truth for tokens. Link it; never re-declare values.
3. **`ui_kit_parent.html`** — for any parent-facing screen.
4. **`ui_kit_jr.html`** — for any kid-facing screen.
5. **`design_system.html`** — if you want to see tokens and components side by side.

If the user mentions the **provider portal** / BCBA / pilot: use the parent kit as a base but increase density and swap the accent to violet (`--aminy-care-600`).

---

## 2. The non-negotiables

These break the brand if you get them wrong. Check every screen against them before shipping.

1. **Copy is half the design.** If your mock has Lorem Ipsum or dashboard-speak, it is not done. Write real Aminy copy (see README §3) before calling anything finished.
2. **The "exhale test."** For every element ask: *does seeing this help the parent breathe easier?* If no, cut it, soften it, or move it.
3. **Background is mist, not white.** `--aminy-mist → --aminy-mist-deep` gradient or a flat `#F6FBFB`. White is for elevated cards only.
4. **Teal is a pointer, not a theme.** One primary teal element per view — the CTA, the progress, the active tab. If you see three teal things on one screen, two are wrong.
5. **Never shame the user.** No red counts of missed days, no "streak broken," no strike-throughs on incomplete tasks. Incomplete = empty circle, not an X.
6. **44px minimum tap target.** Always. No exceptions, even for secondary chips.
7. **Lucide only in parent/provider; emoji only in Ease.** (Exception: emoji inside user-authored chat content is fine.)
8. **No drawn illustration.** If you need imagery, use the compass mark (`assets/favicon.svg`), a parent/child photo placeholder, or nothing. Do not invent SVG scenes.
9. **Sticky header + bottom nav** are load-bearing in the parent app. Preserve them in every mock unless explicitly making a full-screen modal or onboarding.
10. **Serif italic is sacred.** Only use Fraunces italic for affirmations, welcome lines, and report openers. Never for UI.

---

## 3. Parent app — the default layout

Most parent screens follow this skeleton. Use it unless you have a specific reason not to:

```
┌─────────────────────────────────────┐
│  STICKY HEADER (mist gradient)      │
│    ↳ Greeting ("Hi Sarah, here's    │
│        Kai's calm start today.")    │
│    ↳ Serif italic affirmation       │
│    ↳ Child profile card             │
│    ↳ Upcoming events (horizontal)   │
├─────────────────────────────────────┤
│  MAIN (space-y-4, max-w-4xl)        │
│    ↳ Proactive card (contextual)    │
│    ↳ This Week summary (3 stats)    │
│    ↳ Today's Routine (tabs + list)  │
│    ↳ Outcomes / Wins (conditional)  │
│    ↳ Quick Actions grid (2x2 / 4x1) │
├─────────────────────────────────────┤
│  BOTTOM NAV (5 tabs, sticky)        │
│    Home · My Plan · Aminy · Care · More│
└─────────────────────────────────────┘
```

Screen width: design at **mobile first (390px)**, scale up to a **max-w-4xl (896px)** centered column on tablet/desktop. Never full-bleed content on desktop — the safety is in the column.

---

## 4. Ease — the kid layout

Ease rules bend. Background is a gradient (`from-indigo-50 via-purple-50 to-blue-50`). Type is the same Schibsted Grotesk, heavier. Corners are bigger (24–32px). Emoji are the primary iconography. Tappable elements are larger and use `whileTap={{ scale: 0.95 }}` motion.

Ease screens are usually single-purpose: one emotion check-in, one activity, one reward. Do not pile multiple Ease flows onto one screen.

---

## 5. Patterns you will reach for constantly

All are in `ui_kit_parent.html` — copy, don't rebuild.

- **Greeting + affirmation block** (top of home)
- **Child profile snapshot card** (avatar + age + goal chips)
- **Time-of-day routine tabs** (Sun / Sunset / Moon / Star)
- **Routine task row** (emoji + title + description + time + checkable circle)
- **This Week stats trio** (Routine % / Streak / Goals met)
- **Proactive nudge card** (serif italic tip, teal accent)
- **Quick Actions grid** (4 pastel tiles, each with icon + 2-word label)
- **Wins / streak celebration** (amber, sharable via `QuickShareButton`)
- **Pending provider review** (violet, clear CTA)

---

## 6. Typical mistakes we catch in review

- **Too many colors.** If you used amber + violet + green + teal on one screen, start over.
- **Missing affirmation.** Home without the serif italic tip feels cold.
- **Dashboard tone creep.** "Progress," "Completion rate," "Score" → rewrite as "You showed up," "3 days in a row," "Today's wins."
- **Icons without labels.** Users are tired. Always label.
- **Over-rounded or over-square.** Default buttons 12px. Cards 16–22px. Nothing sharper than 8px.
- **White card on white page.** The mist background makes cards feel elevated. Don't fight it.
- **Dense tables.** Aminy does not use tables. Stack rows with soft dividers.
- **Tiny tap targets.** 44px floor. Measure before you ship.

---

## 7. When the user asks for variations

Aminy is opinionated, so variations should still feel like Aminy. Good variation axes:

- **Density:** calm vs. efficient (parent vs. provider)
- **Accent moment:** which single color carries today's tone (teal / amber / violet)
- **Card rhythm:** one hero card vs. three equal cards
- **Voice register:** practical coach vs. serif-italic affirmation-forward
- **Time of day:** morning / afternoon / evening / bedtime versions of the same screen

Bad variation axes (these produce off-brand work):
- Dark-mode-only as a "bold" option (Aminy has dark mode, but it is not a style choice — it follows the OS)
- Neon / high-contrast / "app-y" — not us
- Replacing Lucide with Heroicons / custom icons — not us
- Dropping the bottom nav to "clean it up" — it is load-bearing

---

## 8. Shipping checklist

Before calling a design done:
- [ ] Real Aminy copy, not placeholder
- [ ] One primary teal element, no more
- [ ] Mist background, not white
- [ ] 44px tap targets everywhere
- [ ] Lucide icons, not mixed sets
- [ ] Header + bottom nav present (parent app)
- [ ] Empty states are warm, not blank
- [ ] An incomplete task is an empty circle, never a red X
- [ ] If there's an affirmation, it's serif italic
- [ ] A tired parent at 11pm can understand this in three seconds
