# Aminy Parent App — UI Kit

A high-fidelity, interactive recreation of the Aminy **parent (B2C) app**, rebuilt in the Aminy design system. Every screen is sourced from the live repo (`github.com/aminyabaai-web/Aminy-Final`, `src/components/…`) and re-implemented against the shared tokens (mist surfaces, logo-sampled teal `#2A7D99`, Schibsted Grotesk + Fredoka).

Open **`index.html`** — it boots into onboarding (first run), then the tabbed app. State persists in `localStorage` (`aminy-onboarded`, `aminy-parent-tab`); clear those to replay onboarding.

## Architecture
- `index.html` — loads React + Babel, the shared `../lib.jsx` primitives, then every screen file, then `app.jsx` (router).
- `lib.jsx` (parent of this dir) — standalone Button/Badge/Input/Card/Nudge/Stat/Avatar so kits render without waiting on the compiled bundle.
- `icons.jsx` — `window.AIcon`, a Lucide-style line-icon set (stroke 1.5–2).
- `shell.jsx` — `PhoneShell` (390px device frame) + `BottomNav` (Home / My Plan / Aminy / Exhale / More).
- `app.jsx` — router, first-run gate, full-screen session overlay.

## Screens (each ← its real source component)
| Screen | File | Sourced from |
|---|---|---|
| Conversational onboarding | `onboarding.jsx` | `AIOnboarding.tsx` — one-question-at-a-time chat, live profile chips, multi-select diagnosis/services, time-aware first step, notif priming |
| Home | `home.jsx` | child snapshot, affirmation, TeleABA push, join-visit, signature Nudge, consistency stats, routine |
| My Plan | `plan.jsx` | care-plan goals, weekly win, **AI 2-week home practice plan** (`AIHomePracticePlan.tsx`) |
| Ask Aminy | `ask.jsx` | AI coach chat — attach (camera/photo/file), voice, "Loop in our BCBA" |
| Ask a BCBA | `bcba.jsx` | `AskABCBA.tsx` — async question → instant AI draft → BCBA-signed review, status pills, categories |
| Exhale | `calm.jsx` | multi-tool hub: Breathe · 5-4-3-2-1 · Pop bubbles (haptic) · Soundscapes |
| TeleABA booking | `telehealth.jsx` | `telehealth/AvailabilityPicker.tsx` — date pills + slot grid → confirm → booked |
| Live session | `session.jsx` | `telehealth/WaitingRoom.tsx` + VideoCallRoom — waiting room → admit → in-call → ended |
| Find your guide (marketplace) | `marketplace.jsx` | `ProviderMarketplace.tsx` — designated guide + Book-again, categories, profiles, session pricing |
| Plans & membership | `plans.jsx` | `tier-utils.ts` + `AIPaywallMessage.tsx` — Free/Core/Pro/Family, monthly/yearly, cash vs insured PaywallCard |
| Settings + AI memory | `settings.jsx` | `AIContextViewer.tsx` — account, "What Aminy knows" memory transparency, privacy, legal |
| Vault / Coverage / Community / Weekly report | `destinations.jsx` | vault categories, insured benefits check, community feed, caregiver report |

## Conventions
- One teal primary action per view; earned-state colors (amber/green/violet) carry meaning, never decoration.
- Affirmations use clean grotesk (Schibsted), never serif-italic or the rounded logo font; Fredoka is logo-only.
- 44px+ tap targets; haptic `navigator.vibrate` on key taps.
- Exhale and celebration moments are the only places gradients are welcome.
