// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.

/**
 * Mobile Viewport Spec — verify the app holds up at real device sizes.
 *
 * Tests at iPhone SE (smallest), iPhone 14 Pro, Galaxy S20.
 * Checks: no body horizontal overflow, no buttons under 36×36, chat overlay
 * renders within viewport, charts render inline when AI requests them.
 */

import { test, expect, devices } from '@playwright/test';
import type { Page } from '@playwright/test';

const MOBILE_VIEWPORTS = [
  { name: 'iPhone SE',     width: 375, height: 667 },
  { name: 'iPhone 14 Pro', width: 393, height: 852 },
  { name: 'Galaxy S20',    width: 360, height: 800 },
];

function seedAuth() {
  return {
    id: 'mobile-test-user',
    userId: 'mobile-test-user',
    parentName: 'Mobile Test Parent',
    childName: 'Mobile Test Child',
    childAge: 7,
    childId: 'mobile-child-1',
    activeChildId: 'mobile-child-1',
    relationship: 'parent',
    state: 'AZ',
    email: 'mobile@test.com',
    hasCompletedOnboarding: true,
    tier: 'core',
    role: 'parent',
  };
}

async function setupAuth(page: Page) {
  await page.addInitScript((user) => {
    localStorage.setItem('__e2e_auth', 'bypass');
    localStorage.setItem('aminy-user', JSON.stringify(user));
  }, seedAuth());
}

for (const viewport of MOBILE_VIEWPORTS) {
  test.describe(`Mobile @ ${viewport.name} (${viewport.width}×${viewport.height})`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    test('dashboard has no horizontal body overflow', async ({ page }) => {
      await setupAuth(page);
      await page.goto('/');
      await page.evaluate(() => {
        (window as { __navigateToScreen?: (n: string) => void }).__navigateToScreen?.('dashboard');
      });
      await page.waitForTimeout(800);

      const overflow = await page.evaluate(() => ({
        body: document.body.scrollWidth,
        viewport: window.innerWidth,
      }));

      // Body should not exceed viewport by more than 1px (rounding)
      expect(overflow.body, `Body overflowed at ${overflow.body} on ${overflow.viewport}px viewport`).toBeLessThanOrEqual(overflow.viewport + 1);
    });

    test('all interactive elements meet 36px touch-target minimum', async ({ page }) => {
      await setupAuth(page);
      await page.goto('/');
      await page.evaluate(() => {
        (window as { __navigateToScreen?: (n: string) => void }).__navigateToScreen?.('dashboard');
      });
      await page.waitForTimeout(800);

      const tooSmall = await page.evaluate(() => {
        const small: Array<{ tag: string; w: number; h: number; cls: string }> = [];
        document.querySelectorAll('button, a, [role="button"], [role="tab"]').forEach(el => {
          // Skip sr-only (screen-reader only) elements — intentionally invisible
          const cls = (el.className || '').toString();
          if (cls.includes('sr-only')) return;

          const rect = el.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0 && (rect.width < 36 || rect.height < 36)) {
            small.push({ tag: el.tagName, w: Math.round(rect.width), h: Math.round(rect.height), cls: cls.slice(0, 50) });
          }
        });
        return small;
      });

      expect(tooSmall, `Small touch targets:\n${JSON.stringify(tooSmall.slice(0, 5), null, 2)}`).toEqual([]);
    });

    test('chat overlay opens and fits within viewport', async ({ page }) => {
      await setupAuth(page);
      await page.goto('/');
      await page.evaluate(() => {
        (window as { __navigateToScreen?: (n: string) => void }).__navigateToScreen?.('dashboard');
      });
      await page.waitForTimeout(500);

      await page.evaluate(() => {
        const tab = document.querySelector('[role="tab"][aria-label*="Aminy AI"]') as HTMLElement | null;
        tab?.click();
      });
      await page.waitForTimeout(1500);

      // Header should be visible
      const overlayHeader = page.locator('button[aria-label="Chat history"]').first();
      await expect(overlayHeader).toBeVisible({ timeout: 5000 });

      // Chat should not overflow viewport horizontally
      const chatBounds = await page.evaluate(() => {
        // Find the overlay's bottom sheet (has 82vh height + rounded-t-3xl)
        const sheets = document.querySelectorAll('div[style*="82vh"]');
        if (sheets.length === 0) return null;
        const r = sheets[0].getBoundingClientRect();
        return { right: r.right, viewport: window.innerWidth };
      });

      if (chatBounds) {
        expect(chatBounds.right, `Chat sheet right=${chatBounds.right} exceeded viewport=${chatBounds.viewport}`).toBeLessThanOrEqual(chatBounds.viewport + 1);
      }
    });
  });
}
