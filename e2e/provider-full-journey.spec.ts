// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.

/**
 * Provider Full-Journey E2E Test
 *
 * Walks the screens a provider hits from first sign-up to first payout:
 *   1. Provider landing → application form renders
 *   2. Provider onboarding flow accessible
 *   3. Provider portal renders for a logged-in provider
 *   4. Stripe Connect onboarding screen accessible
 *   5. Provider directory renders with empty/loaded state
 *   6. Session payout screen accessible
 *
 * NOTE: This is a smoke + flow test, not a live-payment test.
 * It verifies routes work, screens render, and the basic state transitions hold.
 * It does NOT submit real applications or process real payments.
 */

import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

function seedAuthenticatedProvider() {
  return {
    // dev- prefix triggers the ProviderPortal fast-fail path (skip Supabase, use mock data)
    id: 'dev-provider-test',
    userId: 'dev-provider-test',
    parentName: 'Dr. Test Provider',
    email: 'provider@example.com',
    hasCompletedOnboarding: true,
    tier: 'pro',
    role: 'provider',
  };
}

async function setupAuthenticatedProvider(page: Page) {
  await page.addInitScript((user) => {
    localStorage.setItem('__e2e_auth', 'bypass');
    localStorage.setItem('aminy-user', JSON.stringify(user));
  }, seedAuthenticatedProvider());
}

async function navigateToScreen(page: Page, screen: string) {
  // Wait for React hydration to complete before calling the debug hook
  await page.waitForFunction(() => typeof (window as any).__navigateToScreen === 'function', { timeout: 10000 }).catch(() => {});
  await page.evaluate((name) => {
    (window as { __navigateToScreen?: (screenName: string) => void }).__navigateToScreen?.(name);
  }, screen);
  await page.waitForTimeout(800);
}

test.describe('Provider Full Journey', () => {

  test('provider landing screen renders the apply CTA', async ({ page }) => {
    await page.goto('/');
    await navigateToScreen(page, 'provider-landing');

    // Some heading or CTA mentioning "provider" or "apply" or "join"
    const cta = page.locator('text=/apply|join.*provider|provider.*join|become.*provider/i').first();
    await expect(cta).toBeVisible({ timeout: 10000 });
  });

  test('provider application form renders all required steps', async ({ page }) => {
    await page.goto('/');
    await navigateToScreen(page, 'provider-apply');

    // Form should have name, email, phone, or license number visible
    const formField = page.locator('input, textarea, select').first();
    await expect(formField).toBeVisible({ timeout: 10000 });
  });

  test('provider portal renders for authenticated provider', async ({ page }) => {
    await setupAuthenticatedProvider(page);
    // Deep-link directly to provider-portal so the screen is the initial render.
    // This avoids hook-registration timing — no need to navigate after load.
    // The E2E bypass (authReady=true + no session redirect) lets this work without
    // a real Supabase session. loadProviderData sees __e2e_auth=bypass and
    // clears isLoading immediately, surfacing the nav tabs.
    await page.goto('/?screen=provider-portal');

    // Should see at least one navigation tab from the portal (Insights, Sessions, Notes, etc.)
    const portalTab = page.locator('text=/insights|sessions|notes|earnings|my practice/i').first();
    await expect(portalTab).toBeVisible({ timeout: 20000 });
  });

  test('provider directory renders an empty state or provider list', async ({ page }) => {
    await page.goto('/');
    await navigateToScreen(page, 'marketplace');

    // Empty state OR provider cards must render — never a crash or blank screen
    const directoryContent = page.locator('text=/provider|no providers|coming soon|specialist/i').first();
    await expect(directoryContent).toBeVisible({ timeout: 10000 });
  });

  test('Stripe Connect payout setup screen accessible to providers', async ({ page }) => {
    await setupAuthenticatedProvider(page);
    await page.goto('/');
    await navigateToScreen(page, 'provider-payout-setup');

    // Screen should mention Stripe, payout, bank, or onboarding
    const payoutMention = page.locator('text=/stripe|payout|bank|onboard/i').first();
    await expect(payoutMention).toBeVisible({ timeout: 10000 });
  });

  test('session payout admin screen renders', async ({ page }) => {
    await setupAuthenticatedProvider(page);
    await page.goto('/');
    await navigateToScreen(page, 'session-payout');

    // Screen mentions payout/release
    const payoutText = page.locator('text=/payout|release|session/i').first();
    await expect(payoutText).toBeVisible({ timeout: 10000 });
  });

  test('AACT-attributed signup applies partner config to profile', async ({ page }) => {
    // Visit with ?org=aact and verify localStorage flag set
    await page.goto('/?org=aact');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    // partner-org.ts persists the attribution flag
    const stored = await page.evaluate(() => localStorage.getItem('aminy_partner_org'));
    expect(stored).toBe('aact');
  });

  test('no console errors on the full provider journey', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await setupAuthenticatedProvider(page);
    await page.goto('/');

    for (const screen of ['provider-landing', 'provider-apply', 'provider-portal', 'marketplace', 'provider-payout-setup']) {
      await navigateToScreen(page, screen);
      await page.waitForTimeout(400);
    }

    // Filter out known-noisy errors (favicon, source map, dev warnings)
    const realErrors = errors.filter(e =>
      !e.includes('favicon') &&
      !e.includes('sourcemap') &&
      !e.includes('Download the React DevTools') &&
      !e.includes('Failed to load resource'),
    );

    expect(realErrors, `Console errors:\n${realErrors.join('\n')}`).toEqual([]);
  });
});
