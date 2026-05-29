# Aminy — Marketing Imagery Brief

Generate these in ChatGPT / Midjourney / DALL-E. Drop the resulting files into `src/assets/imagery/` and we'll wire them into the right components.

---

## Brand constraints — read first

- **Color palette:** Soft teal `#43AA8B`, deep slate `#577590`, warm cream `#FAF7F2`, accent peach `#E07A5F`. Avoid neon, harsh primary colors, or stock-photo blues.
- **Style:** Warm, optimistic, modern. NOT clip-art. NOT cartoon. Think Headspace × Notion × Calm × One Medical aesthetic.
- **Faces:** Real, diverse, neurodivergent-inclusive. Multiple ethnicities, ages, family compositions. NO obvious models. Should feel like real Phoenix-area families.
- **Output spec:** 1600×1200 px (4:3) for hero images; 800×800 for icons/spot illustrations. PNG with transparent background where the spec says "no bg."
- **Naming:** Save as `hero-splash.png`, `interlude-1-empathy.png`, etc. (matching the slot names below).

---

## 1. Splash hero (`hero-splash.png`) — 1600×1200, transparent bg

**Where it goes:** `src/components/SplashPage.tsx` — replaces the existing `aminy-logo-cropped` placeholder above "The Family OS for neurodivergent care."

**Prompt:**
> Soft illustration in a warm modern style. A mom (mid-30s, brown hair, casual clothes) sitting on a couch with her 7-year-old son who is wearing noise-canceling headphones and looking calm + focused on a tablet. Both are smiling subtly. The mom holds a phone showing a soft teal app interface. Warm afternoon light streams in. Cream + teal + slate color palette. No text in the image. Soft watercolor texture. NOT clip-art. NOT corporate stock photography. Headspace-meets-Notion aesthetic.

---

## 2. FreeScreeningFlow interludes (3 images, transparent bg, 800×800)

**Where:** `src/components/FreeScreeningFlow.tsx` — the three "Aminy Insights" interludes that appear between question groups during the pre-signup screening.

### `interlude-1-empathy.png`
> Minimal illustration. A parent's hand gently holding a child's hand, both hands different sizes. Soft teal + cream palette. Watercolor-style softness, no harsh outlines. Symbolizes "you're not alone." No faces, just hands. 800×800 with transparent background.

### `interlude-2-progress.png`
> Minimal illustration. A small green plant sprouting from cupped hands. Behind the hands, soft sun rays in peach/coral tones. Symbolizes early growth. Teal + cream + peach palette. Watercolor texture. 800×800 transparent bg.

### `interlude-3-community.png`
> Minimal illustration. Three abstract human silhouettes (different sizes — parent, child, supporter) standing close together, facing forward. Soft slate + teal gradients. Symbolizes "team around your child." No detailed faces. 800×800 transparent bg.

---

## 3. Paywall tier illustrations (4 images, 600×600, transparent bg)

**Where:** `src/components/PricingTiers.tsx` — one per tier card.

### `tier-free.png`
> Minimal icon. A small sprouting seedling in soft teal. Symbolizes starting out. No text. Flat illustration with subtle gradient.

### `tier-core.png` (featured tier)
> Minimal icon. A simple house with a glowing teal heart in the center. Symbolizes "your everyday companion." Slate + teal palette.

### `tier-pro.png`
> Minimal icon. Three interlocking circles in teal-slate-peach, representing the AI + provider + family triangle. Soft gradients.

### `tier-family.png`
> Minimal icon. A constellation of 5 stars connected by soft lines, in teal + cream. Symbolizes whole-family care.

---

## 4. Empty state illustrations (12 images, 400×400, transparent bg)

**Where:** Various screens. Each replaces a generic Lucide icon with branded illustration.

### `empty-marketplace.png`
> Friendly illustration of a small magnifying glass over a soft teal map dot. "No providers in your area yet."

### `empty-appointments.png`
> Friendly illustration of a calendar with a single soft teal sparkle on it. "Your week is clear."

### `empty-community.png`
> Three small bubbles in different sizes, soft teal/peach palette. "Community is just getting started."

### `empty-outcomes.png`
> A simple line chart trending upward, watercolor style, soft teal. "Track progress over time."

### `empty-records.png`
> A folder with a soft teal heart on the front. "Your vault is private + safe."

### `empty-care-team.png`
> Three abstract figures in a soft semicircle, teal + slate. "Build your care team."

### `empty-goals.png`
> A teal flag at the top of a small hill, watercolor. "Set your first goal."

### `empty-notes.png`
> An open notebook with a soft teal pen. "Your notes will appear here."

### `empty-messages.png`
> Two soft teal speech bubbles. "Conversations live here."

### `empty-memory.png`
> A glowing soft teal orb with subtle sparkles. "Aminy is just getting to know your family."

### `empty-insights.png`
> A small light bulb in teal with subtle radiating lines. "Insights coming soon."

### `empty-shop.png`
> A small teal gift box with a peach ribbon. "Coming soon."

---

## 5. Onboarding success (`onboarding-success.png`) — 1200×900, transparent bg

**Where:** End of `AIOnboarding` flow. Replaces the generic checkmark.

**Prompt:**
> Celebratory but calm illustration. A mom + child silhouetted from behind, looking forward toward a sunrise over rolling hills. Soft teal, peach, and warm cream. Watercolor texture. Sense of "we're starting this journey together." No text. 1200×900.

---

## 6. Provider landing hero (`provider-landing-hero.png`) — 1600×1000, transparent bg

**Where:** `src/components/ProviderLanding.tsx`

**Prompt:**
> A BCBA-style professional (mid-30s, casual professional dress) sitting at a sunlit desk reviewing a chart on a tablet. Behind them, abstract patient progress shapes (gentle line charts, soft data viz). Warm light, teal + cream palette. Inspires confidence in clinical workflow. No corporate stock-photo feel.

---

## 7. AACT partnership landing (`partners-aact-hero.png`) — 1600×1000

**Where:** `/partners/aact` (when built).

**Prompt:**
> Abstract handshake between two soft gradient shapes (one teal, one peach), with a small home + heart icon at the center. Symbolizes "partnership." NO actual hands, just the soft gradient shapes. Watercolor texture. 1600×1000.

---

## How to source these

**Best (quality + speed):** ChatGPT with image generation enabled. Paste each prompt exactly. Iterate 2-3 times per image. Save best output as PNG.

**Budget alternative:** Storyset.com — they have a free tier with ~70% matches. Search "neurodivergent family" or "therapy illustration" — pick from existing.

**Photography option (premium):** Hire local Phoenix photographer for a half-day shoot. ~$3-5K. Real families recruited through AACT or CCV. Use real photography for Splash hero #1 + Provider landing #6 instead of illustrations.

---

## Where to put them once generated

Save all PNGs to `/Users/estaren/Developer/Aminy/Aminy-Final/src/assets/imagery/`. Then tell me they're ready and I'll wire each into the right component (1-2 hour task, mechanical).

---

## File naming checklist

- [ ] hero-splash.png
- [ ] interlude-1-empathy.png
- [ ] interlude-2-progress.png
- [ ] interlude-3-community.png
- [ ] tier-free.png
- [ ] tier-core.png
- [ ] tier-pro.png
- [ ] tier-family.png
- [ ] empty-marketplace.png
- [ ] empty-appointments.png
- [ ] empty-community.png
- [ ] empty-outcomes.png
- [ ] empty-records.png
- [ ] empty-care-team.png
- [ ] empty-goals.png
- [ ] empty-notes.png
- [ ] empty-messages.png
- [ ] empty-memory.png
- [ ] empty-insights.png
- [ ] empty-shop.png
- [ ] onboarding-success.png
- [ ] provider-landing-hero.png
- [ ] partners-aact-hero.png

23 files total. ~2 hours in ChatGPT, ~$4-6K via photographer.
