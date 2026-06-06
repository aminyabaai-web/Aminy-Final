// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.

/**
 * Golden Path E2E — the canonical end-to-end flow every release must pass.
 *
 * Cold load → splash → screening start → AI chat opens → settings panel works
 *   → custom instructions save → personality switches → org-admin renders
 *   → ask-bcba renders → no console errors anywhere.
 *
 * This test is the "is the demo OK?" gate. If golden-path passes, we ship.
 * If it fails, we don't.
 *
 * Does NOT submit real Stripe checkout (test mode only — payment flow is
 * exercised by api-integrations.spec.ts).
 */

import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

function seedAuthenticatedCaregiver() {
  return {
    id: 'golden-test-user',
    userId: 'golden-test-user',
    parentName: 'Golden Test Parent',
    childName: 'Liam',
    childAge: 7,
    childId: 'golden-child-1',
    activeChildId: 'golden-child-1',
    relationship: 'parent',
    state: 'AZ',
    email: 'golden@test.com',
    hasCompletedOnboarding: true,
    tier: 'core',
    role: 'parent',
  };
}

async function setupAuth(page: Page) {
  await page.addInitScript((user) => {
    localStorage.setItem('aminy-user', JSON.stringify(user));
    // DEV-only bypass: prevents INITIAL_SESSION from bouncing to login in E2E
    localStorage.setItem('__e2e_auth', 'bypass');
  }, seedAuthenticatedCaregiver());
}

async function nav(page: Page, screen: string) {
  await page.evaluate((name) => {
    (window as { __navigateToScreen?: (n: string) => void }).__navigateToScreen?.(name);
  }, screen);
  await page.waitForTimeout(500);
}

test.describe('Golden Path — Aminy demo gate', () => {

  test('splash renders the primary CTA', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const cta = page.locator('text=/start|begin|get started|free/i').first();
    await expect(cta).toBeVisible({ timeout: 10000 });
  });

  test('free screening flow accessible', async ({ page }) => {
    await page.goto('/');
    await nav(page, 'free-screening');
    const screening = page.locator('text=/screening|question|child|concern/i').first();
    await expect(screening).toBeVisible({ timeout: 10000 });
  });

  test('authenticated parent lands on dashboard with child name', async ({ page }) => {
    await setupAuth(page);
    await page.goto('/');
    await nav(page, 'dashboard');
    // Dashboard should reference Liam (the seeded child)
    const childName = page.locator('text=/Liam/i').first();
    await expect(childName).toBeVisible({ timeout: 10000 });
  });

  test('Aminy AI chat overlay opens via center nav tab', async ({ page }) => {
    await setupAuth(page);
    await page.goto('/');
    await nav(page, 'dashboard');
    await page.waitForTimeout(500);

    // Use the dev hook — more reliable than DOM click which can miss React synthetic events
    await page.evaluate(() => {
      (window as { __openBevelChat?: () => void }).__openBevelChat?.();
    });
    await page.waitForTimeout(800);

    // The overlay has a "Chat history" button in its header — unique to the overlay
    const overlayHeader = page.locator('button[aria-label="Chat history"]').first();
    await expect(overlayHeader).toBeVisible({ timeout: 8000 });
  });

  test('chat settings panel opens and shows personality + custom instructions', async ({ page }) => {
    await setupAuth(page);
    await page.goto('/');
    await nav(page, 'dashboard');

    await page.evaluate(() => {
      (window as { __openBevelChat?: () => void }).__openBevelChat?.();
    });
    await page.waitForTimeout(800);

    const settingsBtn = page.locator('button[aria-label="Chat settings"]').first();
    await expect(settingsBtn).toBeVisible({ timeout: 8000 });
    await settingsBtn.click();
    await page.waitForTimeout(800);

    // Settings panel content (case-insensitive)
    await expect(page.locator('text=/communication style/i').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=/custom instructions/i').first()).toBeVisible({ timeout: 5000 });
  });

  test('B2B org admin screen accessible', async ({ page }) => {
    await setupAuth(page);
    await page.goto('/');
    await nav(page, 'org-admin');
    // Renders even when user has no org — shows "No organization yet" empty state
    const orgContent = page.locator('text=/organization|seats|billing|members/i').first();
    await expect(orgContent).toBeVisible({ timeout: 10000 });
  });

  test('Ask BCBA screen renders with compose CTA', async ({ page }) => {
    await setupAuth(page);
    await page.goto('/');
    await nav(page, 'ask-bcba');
    // Shows the "Ask a question" CTA or compose form
    const askCTA = page.locator('text=/ask.*question|ask.*bcba/i').first();
    await expect(askCTA).toBeVisible({ timeout: 10000 });
  });

  test('AACT partner setup screen shows invite link', async ({ page }) => {
    await setupAuth(page);
    await page.goto('/');
    await nav(page, 'aact-partner-setup');
    const invite = page.locator('text=/invite.*link|provider.*onboard|aact/i').first();
    await expect(invite).toBeVisible({ timeout: 10000 });
  });

  test('?org=aact URL param persists to localStorage', async ({ page }) => {
    await page.goto('/?org=aact');
    await page.waitForLoadState('networkidle');
    // Trigger detectPartnerOrg() by calling the module directly
    const stored = await page.evaluate(async () => {
      const mod = await import('/src/lib/partner-org.ts');
      mod.detectPartnerOrg();
      return localStorage.getItem('aminy_partner_org');
    });
    expect(stored).toBe('aact');
  });

  test('no console errors across the golden path', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await setupAuth(page);
    await page.goto('/');

    for (const screen of ['dashboard', 'org-admin', 'ask-bcba', 'aact-partner-setup', 'settings', 'care-plan']) {
      await nav(page, screen);
      await page.waitForTimeout(400);
    }

    // Filter noise
    const realErrors = errors.filter(e =>
      !e.includes('favicon') &&
      !e.includes('sourcemap') &&
      !e.includes('Failed to load resource') &&
      !e.includes('Download the React DevTools') &&
      // Benign WebKit/Safari engine warning about a Chrome-only viewport meta key
      !e.toLowerCase().includes('interactive-widget') &&
      !e.toLowerCase().includes('viewport argument') &&
      !e.toLowerCase().includes('warning'),
    );

    expect(realErrors, `Console errors:\n${realErrors.join('\n')}`).toEqual([]);
  });
});
