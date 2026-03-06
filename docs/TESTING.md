# Testing Strategy

Aminy uses **Vitest** for unit and component tests and **Playwright** for end-to-end (E2E) and visual regression tests. This document covers how to run tests, coverage targets, file organization, mock patterns, and best practices.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Test Stack](#test-stack)
3. [File Organization](#file-organization)
4. [Unit & Component Tests (Vitest)](#unit--component-tests-vitest)
5. [E2E Tests (Playwright)](#e2e-tests-playwright)
6. [Mock Patterns](#mock-patterns)
7. [Coverage Targets](#coverage-targets)
8. [CI Integration](#ci-integration)
9. [Writing New Tests](#writing-new-tests)

---

## Quick Start

```bash
# Unit tests
npm test                  # Run all Vitest tests
npm test -- --watch       # Watch mode
npm test -- --coverage    # With coverage report

# E2E tests
npx playwright test       # Run all E2E tests
npx playwright test --ui  # Interactive UI mode
npx playwright show-report # View HTML report after run

# Type checking
npx tsc --noEmit          # TypeScript checks without emit
```

---

## Test Stack

| Tool | Version | Purpose |
|------|---------|---------|
| **Vitest** | ^3.x | Unit and component test runner (Vite-native) |
| **@testing-library/react** | ^16.x | React component testing utilities |
| **@testing-library/jest-dom** | ^6.x | Custom DOM matchers (`toBeInTheDocument`, etc.) |
| **jsdom** | (via Vitest) | Browser environment simulation |
| **Playwright** | ^1.x | E2E browser automation and visual regression |
| **v8** | (via Vitest) | Code coverage provider |

---

## File Organization

```
src/
├── test/
│   └── setup.ts              # Global test setup (mocks, env vars)
├── components/
│   ├── Dashboard10.tsx
│   └── Dashboard10.test.tsx   # Co-located component test
├── ai/
│   ├── contextLayer.tsx
│   └── contextLayer.test.tsx  # Co-located unit test
└── utils/
    ├── tier-utils.ts
    └── tier-utils.test.ts     # Co-located unit test

e2e/
├── navigation.spec.ts         # Screen navigation E2E tests
├── onboarding.spec.ts         # Onboarding flow E2E tests
└── visual/
    └── screenshots/           # Visual regression baselines
```

**Convention**: Test files are co-located with their source files using the `*.test.{ts,tsx}` or `*.spec.{ts,tsx}` suffix. Vitest discovers all files matching `src/**/*.{test,spec}.{ts,tsx}`.

---

## Unit & Component Tests (Vitest)

### Configuration

The full Vitest configuration lives in `/Users/estaren/Desktop/aminy-final-merge-base/vitest.config.ts`:

```typescript
// Key settings from vitest.config.ts
export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      thresholds: {
        statements: 40,
        branches: 35,
        functions: 40,
        lines: 40,
      },
      exclude: [
        'node_modules',
        'src/test',
        '**/*.d.ts',
        '**/*.test.*',
        '**/types/**',
        '**/components/ui/**',
      ],
    },
  },
});
```

### Global Test Setup

The setup file (`src/test/setup.ts`) runs before every test and provides:

1. **Testing Library matchers**: Imports `@testing-library/jest-dom` for DOM assertion methods.

2. **Environment variables**: Stubs Supabase connection details:
   ```typescript
   process.env.VITE_SUPABASE_URL = 'https://test.supabase.co';
   process.env.VITE_SUPABASE_ANON_KEY = 'test-anon-key';
   ```

3. **Browser API mocks** (see [Mock Patterns](#mock-patterns) below).

### Running Specific Tests

```bash
# Run tests matching a pattern
npm test -- tier-utils

# Run a single test file
npm test -- src/utils/tier-utils.test.ts

# Run tests in watch mode (re-runs on file changes)
npm test -- --watch

# Run with verbose output
npm test -- --reporter=verbose
```

---

## E2E Tests (Playwright)

### Configuration

The Playwright configuration lives in `/Users/estaren/Desktop/aminy-final-merge-base/playwright.config.ts`.

### Browser Matrix

Playwright tests run across **7 browser/device configurations**:

| Project | Browser | Viewport | Description |
|---------|---------|----------|-------------|
| `chromium` | Chromium | 1280 x 800 | Desktop Chrome |
| `firefox` | Firefox | 1280 x 800 | Desktop Firefox |
| `webkit` | WebKit | 1280 x 800 | Desktop Safari |
| `Mobile Chrome` | Chromium | Pixel 5 profile | Android mobile |
| `Mobile Safari` | WebKit | iPhone 12 profile | iOS mobile |
| `Mobile Safari SE` | WebKit | iPhone SE profile | Small iOS device |
| `Tablet` | WebKit | iPad Gen 7 profile | Tablet |

### Visual Regression

Playwright is configured for visual regression testing with these thresholds:

```typescript
expect: {
  toHaveScreenshot: {
    maxDiffPixelRatio: 0.03,   // Allow 3% pixel difference
    threshold: 0.2,             // Per-pixel color threshold
    animations: 'disabled',     // Freeze animations for stable snapshots
  },
}
```

### Timeouts and Retries

| Setting | Local | CI |
|---------|-------|----|
| Test timeout | 90 seconds | 90 seconds |
| Retries | 1 | 2 |
| Workers | 50% of CPUs | 50% of CPUs |

### Dev Server

Playwright auto-starts the dev server before running tests:

```typescript
webServer: {
  command: 'npm run dev -- --host 0.0.0.0 --port 5173',
  port: 5173,
  reuseExistingServer: !process.env.CI,
}
```

### Navigation in E2E Tests

Since Aminy uses `currentScreen` state instead of URL routing, E2E tests navigate using the debug hook:

```typescript
// Navigate to a specific screen in Playwright
await page.evaluate(() => {
  window.__navigateToScreen('marketplace');
});
await page.waitForSelector('[data-testid="marketplace-header"]');
```

### Running E2E Tests

```bash
# Run all E2E tests
npx playwright test

# Run a specific test file
npx playwright test e2e/navigation.spec.ts

# Run in headed mode (see the browser)
npx playwright test --headed

# Run on a specific device
npx playwright test --project="Mobile Chrome"

# Update visual regression baselines
npx playwright test --update-snapshots

# Interactive UI mode (recommended for debugging)
npx playwright test --ui

# View the HTML report
npx playwright show-report
```

---

## Mock Patterns

### Browser API Mocks (Global Setup)

These mocks are configured in `src/test/setup.ts` and available in all tests:

#### `window.matchMedia`

```typescript
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});
```

#### `localStorage`

A functional mock with an in-memory store:

```typescript
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
    get length() { return Object.keys(store).length; },
    key: (index: number) => Object.keys(store)[index] ?? null,
  };
})();
```

#### `ResizeObserver`

```typescript
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};
```

#### `IntersectionObserver`

```typescript
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  observe() { return null; }
  unobserve() { return null; }
  disconnect() { return null; }
};
```

### Supabase Client Mock

For component tests that call Supabase, mock the client:

```typescript
import { vi } from 'vitest';

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id', email: 'test@example.com' } },
        error: null,
      }),
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: 'mock-token' } },
        error: null,
      }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: {}, error: null }),
    }),
  },
}));
```

### Stripe Mock

For billing-related component tests:

```typescript
vi.mock('@stripe/stripe-js', () => ({
  loadStripe: vi.fn().mockResolvedValue({
    redirectToCheckout: vi.fn().mockResolvedValue({ error: null }),
  }),
}));
```

### AI / Fetch Mock

For testing components that call AI endpoints:

```typescript
global.fetch = vi.fn().mockImplementation((url: string) => {
  if (url.includes('/ai/chat')) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        response: 'Mock AI response',
        tokensUsed: { input: 100, output: 50 },
        dailyUsage: { used: 1, limit: 50, remaining: 49 },
      }),
    });
  }
  return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
});
```

### motion/react Mock

To avoid animation-related test flakiness:

```typescript
vi.mock('motion/react', () => ({
  motion: new Proxy({}, {
    get: (_target, prop) => {
      if (typeof prop === 'string') {
        return ({ children, ...props }: any) => {
          const Tag = prop;
          return <Tag {...props}>{children}</Tag>;
        };
      }
    },
  }),
  AnimatePresence: ({ children }: any) => children,
  useMotionValue: () => ({ get: () => 0, set: vi.fn() }),
  useTransform: () => ({ get: () => 0 }),
}));
```

---

## Coverage Targets

Current coverage thresholds (enforced by Vitest):

| Metric | Threshold | Description |
|--------|-----------|-------------|
| **Statements** | 40% | Percentage of code statements executed |
| **Branches** | 35% | Percentage of conditional branches tested |
| **Functions** | 40% | Percentage of functions called |
| **Lines** | 40% | Percentage of source lines executed |

**Excluded from coverage**:
- `node_modules/`
- `src/test/` (test setup files)
- `**/*.d.ts` (type declarations)
- `**/*.test.*` (test files themselves)
- `**/types/**` (TypeScript type modules)
- `**/components/ui/**` (generic UI primitives)

### Generating Coverage Reports

```bash
# Text summary in terminal
npm test -- --coverage

# HTML report (opens in browser)
npm test -- --coverage
open coverage/index.html

# JSON report (for CI parsing)
# Output: coverage/coverage-final.json

# LCOV report (for tools like Codecov/Coveralls)
# Output: coverage/lcov.info
```

### Coverage Strategy

**High-priority targets** (aim for 80%+ coverage):
- `src/utils/tier-utils.ts` -- Tier feature gating logic
- `src/ai/contextLayer.tsx` -- AI context aggregation
- `src/utils/sanitize.ts` -- PII scrubbing and prompt injection detection

**Medium-priority targets** (aim for 60%+ coverage):
- Screen components with complex state (Dashboard, Telehealth, Marketplace)
- Form validation logic

**Low-priority targets** (current 40% threshold is acceptable):
- Pure visual components
- Static content screens (About, Help, Privacy Policy)

---

## CI Integration

### Recommended GitHub Actions Workflow

```yaml
name: Test
on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm test -- --coverage
      - uses: codecov/codecov-action@v4
        with:
          files: coverage/lcov.info

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npx playwright test
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

### Environment Variables for CI

```bash
# Required for Vitest (stubbed in setup.ts, but set in CI for safety)
VITE_SUPABASE_URL=https://test.supabase.co
VITE_SUPABASE_ANON_KEY=test-anon-key

# Playwright settings
CI=true          # Enables extra retries and headless mode
```

---

## Writing New Tests

### Component Test Template

```typescript
// src/components/MyComponent.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MyComponent } from './MyComponent';

describe('MyComponent', () => {
  const defaultProps = {
    onNavigate: vi.fn(),
    // ... other required props
  };

  it('renders without crashing', () => {
    render(<MyComponent {...defaultProps} />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });

  it('handles user interaction', async () => {
    render(<MyComponent {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
    expect(defaultProps.onNavigate).toHaveBeenCalledWith('next-screen');
  });

  it('displays loading state', () => {
    render(<MyComponent {...defaultProps} isLoading />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('handles error state', () => {
    render(<MyComponent {...defaultProps} error="Something went wrong" />);
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });
});
```

### Utility Test Template

```typescript
// src/utils/my-util.test.ts
import { describe, it, expect } from 'vitest';
import { myFunction } from './my-util';

describe('myFunction', () => {
  it('returns expected result for valid input', () => {
    expect(myFunction('input')).toBe('expected');
  });

  it('handles edge cases', () => {
    expect(myFunction('')).toBe('default');
    expect(myFunction(null as any)).toBe('default');
  });

  it('throws on invalid input', () => {
    expect(() => myFunction(undefined as any)).toThrow('Invalid input');
  });
});
```

### E2E Test Template

```typescript
// e2e/my-flow.spec.ts
import { test, expect } from '@playwright/test';

test.describe('My Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Navigate to the starting screen
    await page.evaluate(() => window.__navigateToScreen('dashboard'));
  });

  test('completes the happy path', async ({ page }) => {
    await page.click('[data-testid="start-button"]');
    await expect(page.locator('[data-testid="result"]')).toBeVisible();
    await expect(page.locator('[data-testid="result"]')).toContainText('Success');
  });

  test('visual regression', async ({ page }) => {
    await expect(page).toHaveScreenshot('my-flow-baseline.png');
  });
});
```

### Best Practices

1. **Use `data-testid` attributes** for E2E selectors. Avoid selecting by CSS class names (they change with styling) or text content (they change with copy edits).

2. **Co-locate tests with source files**. A test for `Dashboard10.tsx` should live at `Dashboard10.test.tsx` in the same directory.

3. **Mock at boundaries**. Mock Supabase, Stripe, and fetch calls -- not internal utility functions. This tests real business logic while isolating external dependencies.

4. **Test user behavior, not implementation**. Use Testing Library's `getByRole`, `getByText`, and `getByLabelText` over `querySelector` or implementation details.

5. **Keep E2E tests focused**. Each E2E test should verify one user journey. Use `test.describe` blocks to group related flows.

6. **Freeze animations in visual tests**. Playwright's `animations: 'disabled'` config handles this globally, but ensure `motion/react` components are also mocked in unit tests.

7. **Use the debug navigation hook** (`window.__navigateToScreen()`) in E2E tests to skip irrelevant navigation steps and jump directly to the screen under test.
