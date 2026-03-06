# Contributing to Aminy

Guidelines for contributing to the Aminy codebase.

## Development Setup

1. Follow the [Getting Started](README.md#getting-started) instructions
2. Ensure all checks pass before submitting:
   ```bash
   npm run typecheck    # 0 TypeScript errors
   npm run test:run     # All unit tests pass
   npm run build        # Production build succeeds
   ```

## Code Style

### TypeScript

- **Strict mode** is enabled — no implicit `any`, no unchecked index access
- Use proper interfaces/types instead of `any` (411 legacy `any` usages are being cleaned up)
- Use `Record<string, unknown>` instead of `any` for untyped objects
- Shared interfaces go in `src/types/`

### React

- Functional components only (no class components)
- Use `motion/react` for animations (not CSS transitions)
- Use Radix UI primitives for accessible interactive components
- Screen components live in `src/components/` as top-level files

### Styling

- Tailwind CSS v4 utility classes
- Custom utilities defined in `src/index.css`
- No inline `style` props unless absolutely necessary (e.g., dynamic values)

### ESLint

Flat config (v9+) with React Hooks and TypeScript rules. Run:

```bash
npm run lint
```

## Testing

### Unit Tests (Vitest)

- Test files: `src/**/*.{test,spec}.{ts,tsx}`
- Setup: `src/test/setup.ts`
- Use `jsdom` environment for component tests
- Coverage thresholds: 40% statements, 35% branches, 40% functions/lines

### E2E Tests (Playwright)

- Test files: `e2e/**/*.spec.ts`
- Browsers: Chromium, Firefox, WebKit, mobile viewports
- Timeout: 90s global, 15s action/expect
- Visual regression: 3% max pixel diff

### Writing Tests

When adding new features:
1. Add unit tests for business logic in `src/lib/`
2. Add component tests for new UI components
3. Add E2E tests for new user flows

## Git Workflow

### Branches

- `main` — production-ready code
- Feature branches: `feature/description`
- Bug fixes: `fix/description`
- Chores: `chore/description`

### Commit Messages

Use clear, descriptive messages:

```
Add telehealth session timer component

- Display countdown during active video calls
- Auto-notify when 5 minutes remain
- Handle session extension requests
```

### Pull Requests

1. Create a branch from `main`
2. Make your changes with tests
3. Ensure all CI checks pass:
   - TypeScript compilation
   - Unit tests
   - Security audit
   - Production build + bundle size limits
4. Write a clear PR description
5. Request review

## Project Conventions

### Navigation

Screens are managed via `currentScreen` state in `App.tsx`, not React Router. To add a new screen:

1. Create the component in `src/components/`
2. Add the screen name to the switch/case in `App.tsx`
3. Wire up navigation via `setCurrentScreen` prop

### Error Handling

- Data layer errors dispatch `dataservice:error` CustomEvent
- `App.tsx` listens and shows toast notifications
- Never silently swallow errors — always log and surface to user

### Accessibility

- Use `aria-label`, `role`, and `aria-modal` on interactive elements
- Use `FocusTrap` component for modal dialogs
- Use Radix UI primitives which include built-in a11y
- Test with `npm run test:e2e:accessibility`
