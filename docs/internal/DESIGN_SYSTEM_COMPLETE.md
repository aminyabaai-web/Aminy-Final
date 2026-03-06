# Aminy Design System - Complete Implementation Guide

## 🎨 Overview

The complete ABA-based behavioral wellness design system is now production-ready with:
- Design tokens CSS file
- Brand guide component
- Brand audit checker
- All user-facing components updated
- Mobile optimization complete

---

## 📁 New Files Created

### 1. Design Tokens
**File:** `/styles/design-tokens.css`

**What it includes:**
- CSS custom properties for all brand colors
- AI gradient definitions
- Typography scale (Poppins, Nunito, DM Sans)
- Spacing system (4px base unit)
- Animation keyframes (`calmPulse`, `aiShimmer`, `gentleFadeIn`)
- Utility classes for AI gradients and glows
- Tone typography classes (`headline-calm`, `subhead-support`, `cta-hope`)

**Usage:**
```css
/* Import in globals.css (already done) */
@import './design-tokens.css';

/* Use tokens in components */
.my-component {
  background: var(--ai-gradient);
  color: var(--aminy-accent);
  animation: calmPulse 3s infinite;
}

/* Or use utility classes */
<div className="ai-gradient-bg calm-pulse">
  AI-powered content
</div>
```

### 2. Brand Guide Component
**File:** `/components/BrandGuideComponent.tsx`

**What it shows:**
- Complete brand identity (tagline, positioning, value pillars)
- Color palette with hex codes (copy to clipboard)
- Voice & tone guidelines with examples
- Do/Don't language lexicon
- Real microcopy examples

**Access:**
```tsx
import { BrandGuideComponent } from './components/BrandGuideComponent';

// Render as standalone page or modal
<BrandGuideComponent />
```

**Features:**
- 5 interactive tabs (Identity, Colors, Voice, Lexicon, Microcopy)
- Click to copy color codes
- Live examples of tone in action
- Prohibited words highlighted
- Replacement suggestions

### 3. Brand Audit Checker
**File:** `/components/BrandAuditChecker.tsx`

**What it checks:**
- ✅ AI presence on every screen
- ✅ ABA reference in educational/proof contexts
- ❌ Prohibited words (therapy, patient, disorder)
- 👁️ AI gradient glow effects
- 📊 Overall brand compliance score

**Usage:**
```tsx
import { BrandAuditChecker } from './components/BrandAuditChecker';

// Run audit anytime
<BrandAuditChecker />
```

**Output:**
- Screen-by-screen analysis
- Overall compliance score (%)
- List of issues and recommendations
- Exportable report

---

## 🎯 Design Token Reference

### Colors

**AI Gradient Palette:**
```css
--aminy-mint: #C9EAD9      /* Mint green for calm */
--aminy-amber: #FFE2B6     /* Warm amber for warmth */
--aminy-lavender: #E6E0F8  /* Soft lavender for intelligence */
--aminy-neutral: #F9F8F4   /* Warm off-white base */
```

**Primary Accent:**
```css
--aminy-accent: #0891b2           /* Teal */
--aminy-accent-hover: #0e7490     /* Darker teal */
--aminy-accent-light: rgba(8, 145, 178, 0.1)
```

**AI Gradients:**
```css
--ai-gradient: linear-gradient(120deg, var(--aminy-mint), var(--aminy-amber), var(--aminy-lavender))
--ai-gradient-subtle: linear-gradient(120deg, var(--aminy-mint) 0%, var(--aminy-amber) 50%, var(--aminy-lavender) 100%)
```

**Tier Colors:**
```css
--tier-starter: #3B82F6   /* Blue */
--tier-core: #0891b2      /* Teal */
--tier-plus: #9333EA      /* Purple */
```

### Typography

**Font Families:**
```css
--font-primary: 'Poppins'    /* Headlines, CTAs */
--font-secondary: 'Nunito'    /* Body, support text */
--font-mono: 'DM Sans'        /* Code, data */
```

**Font Sizes:**
```css
--text-xs: 0.75rem      /* 12px */
--text-sm: 0.875rem     /* 14px */
--text-base: 1rem       /* 16px */
--text-lg: 1.125rem     /* 18px */
--text-xl: 1.25rem      /* 20px */
--text-2xl: 1.5rem      /* 24px */
--text-3xl: 1.875rem    /* 30px */
--text-4xl: 2.25rem     /* 36px */
--text-5xl: 3rem        /* 48px */
```

### Animations

**Keyframes:**
```css
@keyframes calmPulse {
  0% { opacity: 0.85; }
  50% { opacity: 1; }
  100% { opacity: 0.85; }
}

@keyframes aiShimmer {
  0% { background-position: -200% center; }
  100% { background-position: 200% center; }
}

@keyframes gentleFadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
```

**Usage:**
```css
.calm-element {
  animation: calmPulse 3s ease-in-out infinite;
}

.ai-shimmer-text {
  background: linear-gradient(90deg, #C9EAD9, #FFE2B6, #E6E0F8);
  background-size: 200% 100%;
  animation: aiShimmer 3s linear infinite;
}
```

### Utility Classes

**AI Gradient Background:**
```html
<div class="ai-gradient-bg">
  <!-- Content with gradient background -->
</div>
```

**AI Gradient Text:**
```html
<h1 class="ai-gradient-text">
  Gradient text effect
</h1>
```

**AI Glow Effect:**
```html
<div class="ai-glow">
  <!-- Element with soft glow shadow -->
</div>
```

**Calm Pulse:**
```html
<div class="calm-pulse">
  <!-- Gentle breathing animation -->
</div>
```

**Gentle Fade In:**
```html
<div class="gentle-fade-in">
  <!-- Fades in from below -->
</div>
```

### Tone Typography Classes

**Headline (Calm):**
```html
<h1 class="headline-calm">
  Finally, calm that works.
</h1>
<!-- Renders: Poppins, 600 weight, tight tracking -->
```

**Subheading (Support):**
```html
<p class="subhead-support">
  Aminy uses proven ABA principles and adaptive AI...
</p>
<!-- Renders: Nunito, 400 weight, relaxed leading -->
```

**CTA (Hope):**
```html
<button class="cta-hope">
  Start Your 7-Day Free Trial
</button>
<!-- Renders: Poppins, 600 weight, wide tracking -->
```

**Tooltip (Gentle):**
```html
<span class="tooltip-gentle">
  Powered by AI and ABA science
</span>
<!-- Renders: Nunito, xs size, 400 weight -->
```

---

## 🖼️ Component Implementation Examples

### Dashboard with AI Glow

```tsx
<div className="flex items-center gap-2">
  <div className="relative">
    {/* AI Gradient Glow */}
    <div className="absolute inset-0 bg-gradient-to-r from-[var(--aminy-mint)] via-[var(--aminy-amber)] to-[var(--aminy-lavender)] opacity-20 blur-md rounded-full"></div>
    
    {/* Icon */}
    <CompassIcon className="w-5 h-5 compass-animate relative z-10" />
  </div>
  
  <div>
    <h1 className="headline-calm">Today's Calm Plan</h1>
    <p className="tooltip-gentle">Powered by AI and grounded in ABA behavioral science</p>
  </div>
</div>
```

### Pricing Card with AI Gradient Border

```tsx
<Card className="relative p-6 border-2 border-transparent bg-gradient-to-r from-accent/10 to-teal-100">
  {/* AI Gradient Border Effect */}
  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-[var(--aminy-mint)] via-[var(--aminy-amber)] to-[var(--aminy-lavender)] opacity-30 blur-sm"></div>
  
  <div className="relative z-10">
    <h3 className="headline-calm">Core Plan</h3>
    <p className="subhead-support">Build calm, connect daily.</p>
    <Button className="cta-hope">Start Free 7-Day Trial</Button>
  </div>
</Card>
```

### Floating Chat Button with Pulse

```tsx
<Button
  className="fixed bottom-24 right-6 h-14 px-6 bg-accent hover:bg-accent/90 text-white shadow-lg rounded-full calm-pulse z-50"
>
  <MessageCircle className="w-5 h-5 mr-2" />
  <span className="cta-hope">Ask Aminy 💬</span>
</Button>
```

### Splash Screen Hero with Shimmer

```tsx
<div className="text-center">
  <h1 className="headline-calm text-5xl mb-4">
    Finally, calm that works.
  </h1>
  
  <p className="subhead-support text-lg mb-6">
    Aminy uses proven ABA principles and adaptive AI to make family life easier — one calm routine at a time.
  </p>
  
  <div className="inline-block ai-shimmer rounded-lg p-4">
    <p className="text-sm font-medium text-slate-700">
      Guided by AI. Grounded in ABA. Built for Family Life.
    </p>
  </div>
  
  <Button className="cta-hope bg-accent hover:bg-accent/90 text-white gentle-fade-in">
    Start Your 7-Day Free Trial
  </Button>
</div>
```

---

## 📱 Mobile Optimization

### Responsive Font Sizes

```css
/* Design tokens include mobile breakpoint */
@media (max-width: 640px) {
  :root {
    --text-4xl: 2rem;      /* 32px on mobile (down from 36px) */
    --text-5xl: 2.5rem;    /* 40px on mobile (down from 48px) */
  }
}
```

### Safe Area Padding

All components use responsive padding:
```tsx
<div className="px-4 sm:px-6 lg:px-8">
  {/* Content */}
</div>
```

### Keyboard-Aware FAB

```tsx
// PersistentChatFAB.tsx handles keyboard detection
<div 
  className="fixed z-50 transition-all duration-300"
  style={{
    bottom: keyboardHeight > 0 ? `${keyboardHeight + 20}px` : '100px',
    right: '20px'
  }}
>
  <Button className="ai-glow calm-pulse">Ask Aminy 💬</Button>
</div>
```

---

## 🎯 Brand Compliance Checklist

### Every Screen Must Have:

**1. AI Presence (Visual or Copy)**
- ✅ AI gradient glow effect
- ✅ "Powered by AI" text
- ✅ Sparkles icon
- ✅ "Adaptive" / "Personalized" / "Smart guidance" language

**2. ABA Reference (Educational/Proof Context)**
- ✅ "Grounded in ABA behavioral science"
- ✅ "Based on ABA principles"
- ✅ "Using proven ABA strategies"
- ✅ Footer disclaimer mentioning ABA

**3. No Prohibited Words**
- ❌ therapy, treatment, patient
- ❌ diagnosis, disorder, cure, fix
- ❌ clinical therapy, medical device
- ❌ intervention, prescription

**4. Tone = Warm-Expert**
- ✅ Contractions (you're, let's, it's)
- ✅ Short, breathing-pace sentences
- ✅ Empathy first, solutions second
- ✅ 6th-grade reading level

### Screen-Specific Requirements:

**Splash Screen:**
- Hero: "Finally, calm that works."
- Subhead: Mention both ABA + AI
- CTA: "Start Your 7-Day Free Trial"
- AI gradient glow behind logo

**Dashboard:**
- Header: "Today's Calm Plan"
- Subtext: "Powered by AI and grounded in ABA behavioral science"
- AI glow on compass icon
- Active cards have accent glow

**Reports:**
- Title: "Progress You Can See — Powered by AI, Grounded in ABA"
- Parent View / Professional View tabs
- Share modal with 7-day expiration note

**Pricing:**
- Three tiers with AI gradient borders
- Guarantee: "Noticeably calmer routines in 7 days"
- No credit card required messaging

**Legal Footer:**
- Full disclaimer about ABA educational tools
- "Not a medical device or clinical therapy"
- Privacy promise: "Never sold, always private"

---

## 🚀 Integration Instructions

### Step 1: Import Design Tokens

Already done in `/styles/globals.css`:
```css
@import './design-tokens.css';
```

### Step 2: Use Tokens in Components

Replace hardcoded values:
```tsx
// Before
<div style={{ background: 'linear-gradient(120deg, #C9EAD9, #FFE2B6, #E6E0F8)' }}>

// After
<div className="ai-gradient-bg">
```

### Step 3: Apply Tone Classes

```tsx
// Before
<h1 className="text-4xl font-bold text-slate-900">

// After
<h1 className="headline-calm text-4xl">
```

### Step 4: Add AI Glows

```tsx
// Wrap icons/elements that should glow
<div className="relative">
  <div className="absolute inset-0 bg-gradient-to-r from-accent via-teal-400 to-accent opacity-20 blur-md rounded-full"></div>
  <Icon className="relative z-10" />
</div>
```

### Step 5: Run Brand Audit

```tsx
import { BrandAuditChecker } from './components/BrandAuditChecker';

// Check compliance
<BrandAuditChecker />
```

---

## 📊 Testing & Validation

### Visual Regression Testing

1. **Splash Screen** - Check hero glow, tagline, CTA
2. **Dashboard** - Verify "Today's Calm Plan" header with AI glow
3. **Chat FAB** - Confirm persistent button with pulse animation
4. **Pricing** - Validate gradient borders on tier cards
5. **Legal Footer** - Ensure disclaimer appears on all pages

### Mobile Testing (Required Devices)

- iPhone SE (375×812)
- iPhone 14 Pro Max (430×932)
- iPad (768×1024)
- Desktop (1440×900)

### Accessibility Testing

- ✅ Color contrast WCAG AA minimum
- ✅ Keyboard navigation works
- ✅ Screen reader announces AI context
- ✅ Touch targets ≥ 44×44px

### Performance Testing

- ✅ LCP < 2.5s (design tokens don't block render)
- ✅ CLS < 0.1 (animations don't cause shifts)
- ✅ Font loading uses `font-display: optional`

---

## 🎨 Design Token Migration Path

### Phase 1: Core Screens (Complete ✅)
- Splash Screen
- Dashboard
- Pricing Page
- Reports Hub
- Chat FAB

### Phase 2: Secondary Screens (Next)
- Settings Page
- Parent Hub
- Junior Mode
- Help Center
- Vault

### Phase 3: Polish (Next)
- Email templates
- Push notifications
- Error states
- Loading screens
- Empty states

---

## 📚 Resources

### Documentation
- `/styles/design-tokens.css` - All CSS variables
- `/lib/brand-guide.ts` - Brand system constants
- `/lib/microcopy-aba-wellness.ts` - Copy library
- `/ABA_WELLNESS_FINAL_IMPLEMENTATION.md` - Complete guide

### Components
- `/components/BrandGuideComponent.tsx` - Interactive guide
- `/components/BrandAuditChecker.tsx` - Compliance checker
- `/components/PersistentChatFAB.tsx` - AI chat button
- `/components/PricingPage.tsx` - Tier comparison
- `/components/LegalPrivacyFooter.tsx` - Legal disclaimers

### Examples
- View any updated component for real-world usage
- Check BrandGuideComponent for copy examples
- Run BrandAuditChecker for compliance validation

---

## ✨ Quick Reference

### Most Used Tokens

```css
/* Colors */
var(--aminy-accent)           /* #0891b2 - Primary teal */
var(--ai-gradient)            /* Mint→Amber→Lavender */
var(--aminy-neutral)          /* #F9F8F4 - Warm off-white */

/* Typography */
var(--font-primary)           /* Poppins */
var(--text-4xl)               /* 36px headlines */
var(--leading-relaxed)        /* 1.75 line height */

/* Spacing */
var(--space-4)                /* 16px */
var(--space-6)                /* 24px */
var(--radius-lg)              /* 12px rounded corners */

/* Animations */
calmPulse                     /* Gentle breathing */
aiShimmer                     /* Gradient shimmer */
gentleFadeIn                  /* Fade from below */
```

### Most Used Classes

```css
.ai-gradient-bg               /* Gradient background */
.ai-gradient-text             /* Gradient text effect */
.ai-glow                      /* Soft glow shadow */
.calm-pulse                   /* Breathing animation */
.headline-calm                /* Poppins, bold, tight */
.subhead-support              /* Nunito, relaxed */
.cta-hope                     /* Poppins, semibold, wide */
.tooltip-gentle               /* Nunito, xs, subtle */
```

---

**Status:** ✅ Production-Ready  
**Version:** 3.0 - Complete Design System  
**Last Updated:** 2024  
**Maintained By:** Aminy Design Team

