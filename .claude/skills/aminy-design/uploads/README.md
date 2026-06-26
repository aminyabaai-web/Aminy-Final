# Aminy Design System

**For designers, product managers, and engineers designing with and for Aminy — a behavioral wellness platform for neurodivergent families.**

This repo is the single source of truth for *what Aminy feels like*. If a screen or flow does not feel like it belongs to Aminy, it likely violates something here.

---

## 1. Who Aminy is for

Aminy serves **parents and caregivers of neurodivergent children** (autism, ADHD, anxiety, developmental differences) and the **BCBAs, therapists, and providers** who support those families. A smaller, separate surface — **Ease** (also called **Ease**) — is for the kids themselves.

These users are exhausted, over-researched, and have been let down by every other tool they've tried. They do not need another app that makes them feel behind. They need a tool that says: *you are already doing enough, and here's what the next small step looks like.*

Every design decision should be checked against the **"exhale test"**: does seeing this element help the parent breathe easier?

## 2. The product, briefly

| Surface | Who it's for | Tone |
|---|---|---|
| **Aminy (parent app)** | Parents, caregivers | Calm, clinical-lite, trustworthy. The compass. |
| **Aminy Provider** | BCBAs, therapists, pilot clinicians | Efficient, data-dense, same bones — more signal |
| **Ease** | Children (ages ~4–11) | Soft, playful, big-emoji. Never condescending. |
| **Marketing / public** | Prospective parents | Warm, literary, quietly confident — never "hero-y" |

All four share the same logo, the same navy + teal, and the same compass metaphor. They diverge in type weight, density, rounding, and color saturation.

---

## 3. CONTENT FUNDAMENTALS — the voice

Aminy's voice is the most protected asset in the system. Copy is not decoration. Copy *is* the product.

### The CTCA Child Standard
Treat every family like YOUR child is the patient. If you wouldn't say it to a friend who is at 2am, deleting WebMD tabs, don't put it on screen.

### Voice principles
1. **Validate first, inform second.** Never lead with a metric or a task.
2. **Celebrate consistency, not perfection.** "3-day streak" beats "72% compliance."
3. **Speak like a trusted coach, not a dashboard.** "You showed up today" — not "Engagement: +1."
4. **Short sentences. Plain words.** Parents read while a child tugs their arm.
5. **No fake urgency, no gamified guilt.** Never imply they're failing.
6. **Name the feeling, then offer the next small step.**

### What Aminy *says*
- "Hi Sarah, here's Kai's calm start today."
- "One deep breath can reset the whole moment. You already know that."
- "Mornings are rough — help me make transitions easier"
- "You don't have to be perfect. You just have to be present. And you are."

### What Aminy *never* says
- "Boost your parenting score!"
- "You missed 3 check-ins this week."
- "Unlock premium insights 🔓"
- "Let's optimize your child's outcomes."
- Anything that starts with "Don't forget to…"

### Copy length guardrails
- **Button labels:** 1–3 words. "Save," "See my plan," "Open Calm Corner."
- **Card headlines:** ≤ 7 words.
- **Tips / affirmations:** One sentence, two at most. Serif italic.
- **Error messages:** Name what happened, offer the next move. Never blame the user.

### When to use the **serif italic** voice
Fraunces italic is reserved for *empathetic, human moments only*:
- Daily affirmation under the greeting
- "You earned a calm coin" moments
- Weekly report cover lines
- Onboarding welcome screens
Never use it for UI labels, buttons, data, or errors.

---

## 4. VISUAL FOUNDATIONS

See `colors_and_type.css` for every token. Highlights:

### Color usage rules
- **Teal `#0891b2`** is the only primary. Use it sparingly — on CTAs, active states, progress, and the compass needle. If everything is teal, nothing is.
- **Navy `#0D1B2A`** is voice. It is the most common ink. Headlines, body, nav.
- **Cream / Mist** (`#F6FBFB → #EDF4F7`) is the default app background. Not white. White is elevated.
- **Amber, Green, Violet, Red** are **earned** colors — only for wins, growth, clinical, and true urgency. Never as decoration.
- **Never** use more than two accent colors on a single screen.
- **Never** use gradients as backgrounds. Gradients are reserved for the breathing ring and celebration moments.

### Ease palette is separate
Ease screens use softer sky/indigo/mint pastels and more playful gradients. Parent screens never borrow from it, and vice versa.

### Type
- **Schibsted Grotesk** — every UI surface. 400/500/600/700/800.
- **Newsreader** — editorial + empathetic moments only.
- Body text is **16px minimum** on mobile (prevents iOS zoom).
- Line-height for long-form is **1.6** (relaxed). Parents read tired.

### Radius
Nothing sharper than 8px in the parent app. Cards are 16–22px. Pills for identity. Ease goes higher still — 24–32px on most activity tiles.

### Shadow
Soft, never black. `--shadow-sm` for resting cards, `--shadow-md` on hover, `--shadow-xl` only on the header panel. A teal glow (`--shadow-glow-teal`) marks the primary CTA.

### Motion
Calm easing, breath-timed durations. Nothing bounces aggressively. The breathing ring is the spiritual ancestor of all Aminy motion — everything should feel like it's exhaling.

---

## 5. ICONOGRAPHY

Aminy uses **Lucide** icons exclusively in the parent and provider apps. Stroke 1.5 (inactive) / 2 (active). 20×20 default, 24×24 on primary nav.

### Icon grammar
| Concept | Icon |
|---|---|
| Home / Dashboard | `Home` |
| Aminy AI (the assistant) | `Sparkles` |
| My Plan / goals | `Heart` |
| Telehealth / Care | `Video` |
| Calm Corner | `Wind` |
| Log incident / note a moment | `AlertCircle` |
| Vault / documents | `FolderOpen` |
| Coverage / insurance | `Shield` |
| Community | `Users` |
| Streak / wins | `Award`, `Star` |
| Progress / trends | `TrendingUp` |
| Junior / Ease | `Baby` |

### Rules
- **Never mix icon libraries.** No Heroicons or Feather inside the parent app.
- **Always pair icon + label** in navigation. Icons never stand alone for primary nav.
- **Emoji are permitted only in Ease** (activity cards, emotion check-ins, celebration moments). Parent app uses emoji *only* inside shared content — weekly report cover, chat messages authored by the user. Never in UI chrome.
- The **compass mark** (see `assets/favicon.svg`) is Aminy's identity. Use it only as the app icon, loading state, or hero brand moment — never as a decorative illustration.

---

## 6. How this folder is laid out

```
README.md                    ← you are here
SKILL.md                     ← how to actually make an Aminy design
colors_and_type.css          ← all design tokens

design_system.html           ← visual index of everything (tokens + previews)

ui_kit_parent.html           ← components & patterns for Aminy parent app
ui_kit_jr.html               ← components & patterns for Ease

previews/                    ← individual card previews used by design_system.html
   type.html
   colors.html
   spacing.html
   components.html
   brand.html

assets/                      ← logo marks, favicons, source SVG
```

## 7. Where to start

- **Designing a parent-facing screen?** Open `ui_kit_parent.html`. Copy the closest pattern. Do not start from scratch.
- **Designing a kid-facing screen?** Open `ui_kit_jr.html`. The rules bend — warmth wins.
- **Writing copy?** Re-read Section 3. Read it again. Show a draft to someone outside the company before you ship.
- **Looking for a token?** `colors_and_type.css` has every value. If you need one that isn't there, propose it — don't just invent it.

When in doubt: **make it quieter.**
