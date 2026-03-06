# Aminy — Claude Project Instructions
Updated: 2026-03-06

## What is Aminy?
Behavioral wellness PWA for neurodivergent families. React 19 + TypeScript + Vite + Tailwind CSS v4.

## Critical Architecture Rules

### Navigation — 42 Screens via State (NOT React Router)
- All navigation uses `currentScreen` state in `App.tsx`
- NEVER add React Router — it will break the entire app
- Debug: `window.__navigateToScreen('screen-name')` in browser console

### Tailwind CSS v4 — Custom Colors Need Manual CSS
- Tailwind v4 does NOT auto-generate arbitrary `bg-[#hex]` classes
- Any new hex colors MUST have manual CSS utilities added to `src/index.css`
- Existing custom colors: `#0D1B2A`, `#1a3a5c`, `#466379`, `#4a6478`, `#577590`, `#43AA8B`, `#E07A5F`, `#F8F8F6`
- oklch() colors need RGB hex fallbacks in `:root` overrides

### Gradients — Use v4 Format
- Format: `from-{color}`, `via-{color}`, `to-{color}` (not `from-{color}-500`)
- Direction classes: `bg-gradient-to-b`, `bg-gradient-to-t`, etc.
- 174 gradient stop classes already defined in `src/index.css`

### Animations — motion/react v12 WAAPI Issues
- motion/react may leave `opacity:0` inline style after animations
- Current workaround: CSS `* { opacity: 1 !important; }` in index.css + cleanup interval in App.tsx
- This is a known issue, not a bug you introduced

### Body Scroll — DO NOT Use position:fixed
- `body.mobile-optimized` uses `overflow-x:hidden; overflow-y:auto`
- NEVER change to `position:fixed; overflow:hidden` — it breaks login scroll

## Key Files
| File | What It Contains |
|------|-----------------|
| `src/App.tsx` | Main app, screen routing, WAAPI cleanup, debug hooks |
| `src/index.css` | ~16k lines: ALL CSS fixes, custom colors, gradients, oklch fallbacks |
| `src/components/LoginScreen.tsx` | Login UI (blue bar fix applied) |
| `src/components/BenefitsStatusPanel.tsx` | Benefits screen (crash fix: default props) |

## Known Fixes (DO NOT REVERT)
1. `BenefitsStatusPanel.tsx` — `{ statuses = [] }` default prevents crash
2. `App.tsx` — Junior props restructured to prevent crash
3. `index.css` — 8 hex color utilities, 174 gradient stops, oklch fallbacks, scroll fix, opacity hack
4. `LoginScreen.tsx` — No `overflow:hidden` or `transform:scale(1.25)` on logo

## Testing
- Preview: `aminy-dev` on port 3001 (`~/.claude/launch.json`)
- Viewport: 375x812 (mobile-first)
- Quick crash test: navigate through all 42 screens via debug hook
- All 42/42 screens verified rendering (Feb 25)

## GitHub
- **Repo:** `edgarstaren/Aminy-Final` (private)
- **Goal:** Transfer to `aminyabaai-web` org
- **Branches:** `main` (stable), `claude/scorecard-push-to-9plus` (dev)

## What Still Needs Work
- Gradient verification on less-visited screens (settings, paywall, analytics-charts)
- Interactive flow testing (buttons, forms, tabs, modals)
- AI/Supabase integration (Ask Aminy chat, weekly summary, booking)
- Production cleanup: remove debug hooks, opacity hack, restore animations
