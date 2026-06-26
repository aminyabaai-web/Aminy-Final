# Aminy — Motion & Animation

Motion in Aminy **reduces anxiety and reinforces "gentle progress."** It never performs. The audience is tired, often-overwhelmed parents and motion-sensitive kids — so every animation earns its place and every one has a static fallback.

## The five rules
1. **One moving thing per view** (same discipline as "one teal element").
2. **Animate on enter or on change — never on loop.** Exceptions: the Exhale breath ring and the "Aminy is thinking" pulse.
3. **Honor `prefers-reduced-motion` everywhere.** Non-negotiable for a health app. Every animation needs a static end-state. (`tokens/elevation.css` ships a global reduced-motion reset; `ui_kits/motion.jsx` short-circuits its JS helpers.)
4. **Calm easing, breath-timed durations.** Nothing bounces hard except Ease.
5. **Validate, don't gamify.** Celebration is restrained on parent surfaces; joyful only in Ease.

## Tokens (`--*` in `tokens/elevation.css`)
| Token | Value | Use |
|---|---|---|
| `--dur-fast` | 120ms | taps, press feedback |
| `--dur-base` | 200ms | tab/screen transitions, hovers |
| `--dur-slow` | 360ms | entrances, reveals |
| `--dur-enter` | 500ms | count-ups, progress fills |
| `--dur-breath` | 4000ms | breathing ring cycle |
| `--ease-calm` | `cubic-bezier(.4,0,.2,1)` | default |
| `--ease-lift` | `cubic-bezier(.2,.8,.2,1)` | cards, reveals |
| `--ease-spring` | `cubic-bezier(.34,1.56,.64,1)` | counts, pops (gentle overshoot) |
| `--ease-breath` | `cubic-bezier(.45,.05,.55,.95)` | breath ring |

Keyframes shipped: `aminy-rise`, `aminy-fade`, `aminy-pop`, `aminy-breath`, `aminy-think`, `aminy-shimmer`. Helpers `.aminy-anim-rise` / `.aminy-anim-pop`.

## Helpers (`ui_kits/motion.jsx` → `window.AminyMotion`)
- `useCountUp(target, {duration, play, decimals})` — number 0→target (easeOutCubic).
- `<Reveal delay={n}>` — fade+rise a block in; use staggered `delay` for lists/onboarding.
- `<Thinking/>` — the calm 3-dot AI pulse. Use instead of a spinner for any AI generation.
- `useInView()` — `[ref, seen]`; trigger count-ups when a scroll region enters view.

## Where motion is used (the map)
**Tier 1 — does real work**
- Exhale **breath ring** (the one place motion *is* the feature).
- **AI "thinking"** pulse on Ask Aminy / Ask-a-BCBA / AI notes generation.
- **Count-up + fill** on care-plan goals, stats, weekly report, provider KPIs.
- **Onboarding chat** typing indicator + staggered message rise.

**Tier 2 — orient the user**
- Screen/tab cross-fade + 6px rise (≤200ms).
- Bottom-sheet / modal slide-up with backdrop fade.
- First-paint **stagger** on lists (claims, messages, schedule) — never on re-render.

**Tier 3 — celebration (rare, earned)**
- Parent **win** card: gentle scale-pop + one shimmer. No confetti.
- **Ease**: bigger, joyful — star reward bounce + sparkle burst; interactive glitter jar.

**Video (Daily.co)**
- Telehealth waiting-room → admit → in-call as calm state reveals (joining pulse, "provider is here" fade-in).
- Live marketplace sessions: pulsing LIVE badge; join = stepping into a room.

## Don'ts
- No spinners (use `<Thinking/>`). No infinite decorative loops on content. No parallax. No bounce on parent surfaces. No animation that blocks input. No motion without a reduced-motion fallback.
