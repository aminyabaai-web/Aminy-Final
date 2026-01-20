# 🚨 LOGO PROTECTION - DO NOT REMOVE 🚨

## Critical Brand Assets

### 1. Full Aminy Logo (Large Size)
**File:** `figma:asset/6ee92f0834f42dd340e530208a75e78f1e485b26.png`

This is the PRIMARY BRAND IDENTITY for Aminy - full wordmark with compass icon.

**Use this for:** Large hero images, splash screens (500x140px or larger)

### 2. Compass Icon (Small Size)
**File:** `figma:asset/2e39d2a71ccd340d3accf6a7d306e6a6a6781942.png`

This is the ICON VERSION of the Aminy brand. It's the compass icon alone.

**Use this for:** Small icons, avatars, headers, chat messages (16x16px to 40x40px)
**Why:** The full logo becomes illegible at small sizes. The compass icon alone is crisp and recognizable.

---

## Where Each Logo Must Appear

### Full Logo (Large) - `figma:asset/6ee92f0834f42dd340e530208a75e78f1e485b26.png`

#### 1. SplashScreen.tsx ✅
```tsx
import aminyLogo from 'figma:asset/6ee92f0834f42dd340e530208a75e78f1e485b26.png';
import { ImageWithFallback } from './figma/ImageWithFallback';
```
- Used as the hero image in the splash screen (500x140px)
- Critical LCP element - must load immediately
- DO NOT REPLACE with SVG components or compass icon

### Compass Icon (Small) - `figma:asset/2e39d2a71ccd340d3accf6a7d306e6a6a6781942.png`

#### 2. OnboardingFlow5Steps.tsx ✅
```tsx
import compassIcon from 'figma:asset/2e39d2a71ccd340d3accf6a7d306e6a6a6781942.png';
import { ImageWithFallback } from './figma/ImageWithFallback';
```
- Header icon (40x40px)
- Chat message avatar icon (16x16px)
- DO NOT REPLACE with full logo or lucide-react Compass icon

#### 3. LoginScreen.tsx ✅
```tsx
import compassIcon from 'figma:asset/2e39d2a71ccd340d3accf6a7d306e6a6a6781942.png';
```
- Header icon in the center (40x40px)
- DO NOT use the full logo or old compass logo

#### 4. CreateAccountScreen.tsx ✅
```tsx
import compassIcon from 'figma:asset/2e39d2a71ccd340d3accf6a7d306e6a6a6781942.png';
import { ImageWithFallback } from './figma/ImageWithFallback';
```
- Header icon in the center (40x40px)
- DO NOT use the full logo or Logo component

#### 5. ForgotPasswordScreen.tsx ✅
```tsx
import compassIcon from 'figma:asset/2e39d2a71ccd340d3accf6a7d306e6a6a6781942.png';
import { ImageWithFallback } from './figma/ImageWithFallback';
```
- Header icon in the center (40x40px)
- DO NOT use the full logo or Logo component

### Other Components

#### 6. Logo.tsx (SVG Component)
- This is a SEPARATE component for creating the logo programmatically using SVG
- It's for specific use cases where SVG is needed
- Does NOT replace the image logos above
- Should only be used when explicitly needed for dynamic rendering

---

## Rules

1. **NEVER** remove logo/icon image imports from any file that uses them
2. **NEVER** replace the images with lucide-react icon components (Compass, etc.)
3. **USE THE RIGHT IMAGE FOR THE RIGHT SIZE:**
   - Full logo: 500x140px or larger (splash screen only)
   - Compass icon: 16x16px to 40x40px (headers, chat, auth screens)
4. **ALWAYS** use `ImageWithFallback` component when displaying logos/icons
5. **ALWAYS** add comments like `// IMPORTANT: DO NOT REMOVE THIS LOGO` near logo code
6. If making changes to onboarding or splash screens, CHECK that correct logo/icon is still present

---

## Why This Matters

The logos are the brand identity. Removing them or replacing them with generic icons:
- Destroys brand recognition
- Makes the app look generic
- Frustrates the client who specifically designed these assets
- Breaks visual consistency across the app

**Size matters:** Using the full logo at small sizes makes it illegible. Using the compass icon at large sizes loses the brand messaging. Use the right asset for the right context.

---

## Quick Reference

**Need a splash screen logo?** → Use `figma:asset/6ee92f0834f42dd340e530208a75e78f1e485b26.png`

**Need a small icon/avatar?** → Use `figma:asset/2e39d2a71ccd340d3accf6a7d306e6a6a6781942.png`

**Both must:**
- Use `ImageWithFallback` component
- Have proper width/height attributes
- Never be replaced with SVG or lucide-react icons
