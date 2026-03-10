/**
 * Shared E2E test helpers for Aminy app
 *
 * The app uses `currentScreen` state navigation (NOT React Router).
 * Debug hooks: window.__navigateToScreen() and window.__setCurrentScreen()
 * are available in dev mode to programmatically switch screens.
 */

import { Page, expect } from '@playwright/test';

/**
 * Navigate to a screen using the debug hook.
 * Waits for the app to load first, then triggers navigation.
 */
export async function navigateToScreen(page: Page, screenName: string) {
  // Ensure the app is loaded before navigating
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(300);

  await page.evaluate((name) => {
    (window as any).__navigateToScreen(name);
  }, screenName);

  // Allow React to render the new screen
  await page.waitForTimeout(800);
}

/**
 * Set up console error tracking. Call this BEFORE navigating.
 * Returns a function that returns collected errors.
 *
 * Filters out known non-critical errors:
 * - Supabase connection errors (no backend deployed)
 * - Failed fetch requests (expected in test environment)
 * - React hydration warnings
 * - Vite HMR messages
 */
export function trackConsoleErrors(page: Page): () => string[] {
  const errors: string[] = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      const isExpected =
        text.includes('supabase') ||
        text.includes('Supabase') ||
        text.includes('Failed to fetch') ||
        text.includes('NetworkError') ||
        text.includes('net::ERR_') ||
        text.includes('CORS') ||
        text.includes('hydrat') ||
        text.includes('[hmr]') ||
        text.includes('[vite]') ||
        text.includes('ResizeObserver') ||
        text.includes('favicon.ico') ||
        text.includes('401') ||
        text.includes('403') ||
        text.includes('API') ||
        text.includes('env');

      if (!isExpected) {
        errors.push(text);
      }
    }
  });

  return () => errors;
}

/**
 * Verify that a screen renders without crashing.
 * Checks for: visible body, no React error boundary, no blank page.
 */
export async function verifyScreenRenders(page: Page, screenName: string) {
  await navigateToScreen(page, screenName);

  // Body should still be visible (app did not crash)
  const body = page.locator('body');
  await expect(body).toBeVisible();

  // Check for React error boundary messages
  const errorBoundaryTexts = [
    'Something went wrong',
    'An error occurred',
    'Application Error',
    'Unhandled Runtime Error',
  ];

  for (const errorText of errorBoundaryTexts) {
    const errorEl = page.locator(`text="${errorText}"`);
    const hasError = await errorEl.isVisible().catch(() => false);
    expect(hasError, `Screen "${screenName}" triggered error boundary: "${errorText}"`).toBe(false);
  }

  // Page should have some content (not a blank white page)
  const bodyHTML = await page.evaluate(() => document.body.innerHTML);
  expect(bodyHTML.length, `Screen "${screenName}" rendered empty body`).toBeGreaterThan(50);
}

/**
 * Load the app and wait for initial render to complete.
 * Returns a function to retrieve any console errors collected during load.
 */
export async function loadApp(page: Page): Promise<() => string[]> {
  const getErrors = trackConsoleErrors(page);
  await page.goto('/', { waitUntil: 'networkidle' });
  // Wait for React and lazy components to finish initial render
  await page.waitForTimeout(1000);
  return getErrors;
}

/**
 * Check that a screen has at least one interactive element
 * (buttons, links, inputs, or clickable elements).
 */
export async function hasInteractiveElements(page: Page): Promise<boolean> {
  const count = await page.locator('button, a[href], input, textarea, select, [role="button"], [role="tab"]').count();
  return count > 0;
}

/**
 * Check that a screen contains a back button or navigation element.
 */
export async function hasBackNavigation(page: Page): Promise<boolean> {
  const backBtn = page.locator(
    'button:has-text("Back"), button:has-text("back"), [aria-label*="back" i], [aria-label*="Back"]'
  );
  const count = await backBtn.count();
  return count > 0;
}

/**
 * Attempt to find and click a back button. Returns true if found and clicked.
 */
export async function clickBack(page: Page): Promise<boolean> {
  const backBtn = page.locator(
    'button:has-text("Back"), [aria-label*="back" i], [aria-label*="Back"]'
  ).first();
  const visible = await backBtn.isVisible().catch(() => false);
  if (visible) {
    await backBtn.click();
    await page.waitForTimeout(500);
    return true;
  }
  return false;
}
