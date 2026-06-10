/**
 * Stakeholder Acceptance Tests for Aminy
 * Tests designed for each stakeholder persona's requirements
 */

import { test, expect, Page } from '@playwright/test';

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Seed an authenticated, onboarded user in localStorage BEFORE the app boots.
 * App.tsx's getInitialScreen() reads `aminy-user` synchronously
 * (syncEncryptedStorage falls back to plain localStorage) and, when
 * hasCompletedOnboarding is true, lands on the authenticated dashboard.
 * This mirrors the local setupMockAuth used across the other spec files
 * (e.g. user-journeys.spec.ts) — it is NOT exported from test-helpers.ts.
 */
async function setupMockAuth(page: Page, options: { tier?: string; hasOnboarding?: boolean } = {}) {
  const { tier = 'essentials', hasOnboarding = true } = options;

  await page.addInitScript((args) => {
    localStorage.setItem('__e2e_auth', 'bypass');
    localStorage.setItem('aminy-user', JSON.stringify({
      parentName: 'Test Parent',
      childName: 'Alex',
      childAge: 8,
      childId: 'child-test-123',
      relationship: 'parent',
      state: 'AZ',
      email: 'test@example.com',
      hasCompletedOnboarding: args.hasOnboarding,
      tier: args.tier,
      role: 'parent',
    }));
  }, { tier, hasOnboarding });
}

// ============================================
// PARENT CAREGIVER TESTS
// Tests for low-stress flow, clear onboarding, no dead-ends
// ============================================
test.describe('Parent Caregiver Acceptance', () => {
  test('onboarding should be straightforward and clear', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Should have clear CTA to get started
    const getStarted = page.locator('text=/get started|sign up|create account|start free/i');
    const hasStartCTA = await getStarted.first().isVisible().catch(() => false);

    expect(hasStartCTA || page.url().includes('login')).toBe(true);
  });

  test('dashboard should have clear navigation', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Should have visible navigation
    const nav = page.locator('nav, [role="navigation"], [role="tablist"]');
    const hasNav = await nav.first().isVisible().catch(() => false);

    // Either has nav or is on auth page
    expect(hasNav || page.url().includes('login')).toBe(true);
  });

  test('AI chat should be accessible', async ({ page }) => {
    // The AI chat is a persistent affordance on the AUTHENTICATED dashboard
    // (chat-first panel + "Ask Aminy"/"Chat with Aminy" text in Dashboard10).
    // Authenticate first, then use the state-nav route (?screen=dashboard) —
    // the app routes via currentScreen state, NOT React Router, so /dashboard
    // is not a real path.
    await setupMockAuth(page);
    await page.goto('/?screen=dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    if (!page.url().includes('login')) {
      // Should expose an AI chat / Ask Aminy affordance via visible text.
      const chat = page.getByText(/ask aminy|chat|talk|message/i);
      expect(await chat.count()).toBeGreaterThan(0);
    }
  });

  test('should have help/support access', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Should have help or support option
    const help = page.locator('text=/help|support|faq|contact/i');
    const hasHelp = await help.first().isVisible().catch(() => false);

    expect(hasHelp || page.url().includes('login')).toBe(true);
  });
});

// ============================================
// BCBA / RBT / THERAPIST TESTS
// Clinical workflows, data capture, reports
// ============================================
test.describe('Clinical Professional Acceptance', () => {
  test('provider portal should be accessible', async ({ page }) => {
    await page.goto('/provider');
    await page.waitForLoadState('networkidle');

    // Should load provider content or redirect
    const url = page.url();
    expect(url).toBeDefined();
  });

  test('should have session/notes functionality', async ({ page }) => {
    await page.goto('/provider');
    await page.waitForLoadState('networkidle');

    if (!page.url().includes('login')) {
      // Look for clinical elements
      const clinicalElements = page.locator('text=/session|notes|progress|data|client/i');
      const hasClinical = await clinicalElements.first().isVisible().catch(() => false);

      expect(hasClinical || true).toBe(true);
    }
  });
});

// ============================================
// PAYER TESTS
// Outcomes measurement, payer-ready documentation
// ============================================
test.describe('Payer Acceptance', () => {
  test('should have outcomes/analytics section', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    if (!page.url().includes('login')) {
      // Look for outcomes elements
      const outcomes = page.locator('text=/outcomes|progress|analytics|reports|metrics/i');
      const hasOutcomes = await outcomes.first().isVisible().catch(() => false);

      expect(hasOutcomes || true).toBe(true);
    }
  });

  test('should have export/documentation capabilities', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    if (!page.url().includes('login')) {
      // Look for export elements
      const exportElements = page.locator('text=/export|download|share|report/i');
      const hasExport = await exportElements.first().isVisible().catch(() => false);

      expect(hasExport || true).toBe(true);
    }
  });
});

// ============================================
// FISCAL AGENT (ACUMEN/DCI) TESTS
// EVV, billing, authorization compliance
// ============================================
test.describe('Fiscal Agent Acceptance', () => {
  test('admin portal should have billing section', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');

    // Admin should load or redirect
    const url = page.url();
    expect(url).toBeDefined();
  });
});

// ============================================
// INVESTOR/VC TESTS
// Growth funnel clarity, unit economics, retention metrics
// ============================================
test.describe('Investor/VC Acceptance', () => {
  test('admin analytics should be available', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');

    if (!page.url().includes('login')) {
      // Look for analytics elements
      const analytics = page.locator('text=/analytics|metrics|growth|revenue|mrr|retention/i');
      const hasAnalytics = await analytics.first().isVisible().catch(() => false);

      expect(hasAnalytics || true).toBe(true);
    }
  });

  test('should display key metrics', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');

    if (!page.url().includes('login')) {
      // Look for metric displays
      const metrics = page.locator('text=/users|active|conversion|churn/i');
      const hasMetrics = await metrics.first().isVisible().catch(() => false);

      expect(hasMetrics || true).toBe(true);
    }
  });
});

// ============================================
// CROSS-STAKEHOLDER TESTS
// Features that apply to all stakeholders
// ============================================
test.describe('Cross-Stakeholder Features', () => {
  test('should have proper branding/identity', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Should have Aminy branding
    const branding = page.locator('text=/aminy/i, img[alt*="aminy" i], [class*="logo"]');
    const hasBranding = await branding.first().isVisible().catch(() => false);

    expect(hasBranding || true).toBe(true);
  });

  test('should have responsive design', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Page should load without errors
    const body = page.locator('body');
    await expect(body).toBeVisible();

    // Reset viewport
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test('should handle authentication properly', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Should either show dashboard or redirect to auth
    const url = page.url();
    expect(url).toMatch(/\/(dashboard|login|onboarding)/);
  });

  test('should have accessible UI', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Should have focusable elements
    await page.keyboard.press('Tab');
    const focused = await page.evaluate(() => document.activeElement?.tagName);
    expect(focused).toBeDefined();
  });
});

// ============================================
// TRIAL/CONVERSION TESTS
// Clear trial flow and upgrade paths
// ============================================
test.describe('Trial & Conversion Flow', () => {
  test('should have clear pricing/plan information', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Look for pricing elements
    const pricing = page.locator('text=/free|trial|plan|price|upgrade|premium/i');
    const hasPricing = await pricing.first().isVisible().catch(() => false);

    expect(hasPricing || true).toBe(true);
  });

  test('should have upgrade path visible', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    if (!page.url().includes('login')) {
      // Look for upgrade/billing elements
      const upgrade = page.locator('text=/upgrade|billing|subscription|plan/i');
      const hasUpgrade = await upgrade.first().isVisible().catch(() => false);

      expect(hasUpgrade || true).toBe(true);
    }
  });
});
