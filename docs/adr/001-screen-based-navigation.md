# ADR 001: Screen-Based Navigation via `currentScreen` State

## Status

Accepted

## Date

2024-11-01

## Context

Aminy is a Progressive Web App (PWA) serving neurodivergent families with 42+ distinct screens spanning multiple modules: Dashboard, Junior Mode, Provider Marketplace, Telehealth, Daily Plan, Document Vault, Community Hub, Coverage/Insurance, Settings, and more.

The team evaluated two primary navigation approaches:

1. **React Router** (traditional SPA routing with URL-based navigation)
2. **Screen-based state machine** (a single `currentScreen` state variable in `App.tsx` that conditionally renders top-level screen components)

Key considerations:

- **PWA constraints**: The app is designed as a mobile-first installable PWA. Unlike traditional web apps, PWA navigation does not need to support arbitrary URL entry, bookmark sharing, or SEO indexing. The app launches from a home screen icon and operates as a self-contained experience.
- **Deep-linking requirements are minimal**: Users do not share links to specific screens. The only deep-link needed is for telehealth video room URLs, which are handled via query parameters on the single entry point.
- **Performance**: React Router adds bundle weight (~12 KB gzipped for v6) and introduces route-matching overhead on every navigation. With 42+ screens, lazy-loading route definitions become complex. A simple state switch avoids this entirely.
- **Animation control**: The app uses `motion/react` v12 for screen transitions. Controlling enter/exit animations is simpler when navigation is a state change rather than a route change, as there is no race condition between route resolution and animation lifecycle.
- **Complexity**: The 42 screens map to a flat list of string identifiers (e.g., `'dashboard'`, `'marketplace'`, `'telehealth-room'`). This is simpler than defining nested route trees, layout routes, and outlet components.

## Decision

Use a `currentScreen` state variable in `App.tsx` to manage navigation. Each screen is a top-level component rendered via a switch statement or conditional block. Navigation is performed by calling `setCurrentScreen('screen-name')`, which is passed down via props or exposed as `window.__navigateToScreen()` for debugging.

```tsx
// Simplified pattern in App.tsx
const [currentScreen, setCurrentScreen] = useState<ScreenName>('login');

// Render the active screen
switch (currentScreen) {
  case 'dashboard': return <Dashboard10 onNavigate={setCurrentScreen} />;
  case 'marketplace': return <ProviderMarketplace onNavigate={setCurrentScreen} />;
  case 'telehealth-room': return <TelehealthRoom onNavigate={setCurrentScreen} />;
  // ... 39 more screens
}
```

## Consequences

### Positive

- **Zero routing overhead**: No route matching, no history stack management, no URL serialization per navigation event.
- **Simple mental model**: Developers add a new screen by adding a case to the switch and a new component file. No route configuration files to maintain.
- **Full animation control**: Screen transitions are managed entirely by React state, making `motion/react` AnimatePresence work reliably without fighting a router.
- **Smaller bundle**: No React Router dependency (~12 KB saved).
- **Debug-friendly**: `window.__navigateToScreen('screen-name')` and `window.__setCurrentScreen('screen-name')` allow instant navigation during development and QA testing.

### Negative

- **No browser back/forward**: The browser's back button does not work as users might expect in a web app. This is mitigated by in-app back buttons on every screen and is consistent with native mobile app behavior.
- **No URL-based state**: Refreshing the page always returns to the dashboard (or login). Bookmarking a specific screen is not possible. This is acceptable for a PWA that launches from a home screen icon.
- **Screen list grows linearly**: The switch statement in `App.tsx` grows with each new screen. At 42 screens this is manageable but could benefit from a registry pattern if it reaches 100+.
- **Testing navigation**: E2E tests must use the debug hooks or click through the UI rather than navigating directly to a URL. Playwright tests use `window.__navigateToScreen()` to set up test state.

### Alternatives Considered

- **React Router v6 with lazy loading**: Would provide URL-based navigation and code splitting but adds complexity for minimal benefit in a PWA context.
- **TanStack Router**: Type-safe routing but heavyweight for an app that does not need URL-based navigation.
- **State machine (XState)**: Would formalize screen transitions as a finite state machine but adds conceptual overhead for what is effectively a flat list of screens.
