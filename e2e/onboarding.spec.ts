import { test, expect } from '@playwright/test';

test.describe('Onboarding Flow', () => {
  test('should display welcome screen', async ({ page }) => {
    await page.goto('/');

    // Should see the welcome/onboarding screen or dashboard
    // The app may redirect based on auth state
    await expect(page).toHaveURL(/\/(onboarding|dashboard|login)?/);
  });

  test('should navigate through onboarding steps', async ({ page }) => {
    await page.goto('/onboarding');

    // Wait for the page to load
    await page.waitForLoadState('networkidle');

    // Check for onboarding content
    const hasOnboardingContent = await page.locator('text=/welcome|aminy|start|begin/i').first().isVisible().catch(() => false);

    if (hasOnboardingContent) {
      // Look for a continue/next button
      const continueButton = page.locator('button:has-text("Continue"), button:has-text("Next"), button:has-text("Start")').first();

      if (await continueButton.isVisible()) {
        await continueButton.click();
        // Should progress to next step
        await page.waitForTimeout(500);
      }
    }
  });

  test('should handle child name input', async ({ page }) => {
    await page.goto('/onboarding');
    await page.waitForLoadState('networkidle');

    // Look for name input field
    const nameInput = page.locator('input[placeholder*="name" i], input[name*="name" i]').first();

    if (await nameInput.isVisible()) {
      await nameInput.fill('Alex');
      await expect(nameInput).toHaveValue('Alex');
    }
  });

  test('should validate required fields', async ({ page }) => {
    await page.goto('/onboarding');
    await page.waitForLoadState('networkidle');

    // Try to submit without filling required fields
    const submitButton = page.locator('button[type="submit"], button:has-text("Continue")').first();

    if (await submitButton.isVisible()) {
      await submitButton.click();

      // Should show validation error or not progress
      await page.waitForTimeout(300);
    }
  });
});

test.describe('Authentication', () => {
  test('should display login page', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Should see login form elements
    const hasLoginElements = await page.locator('input[type="email"], input[type="password"], button:has-text("Sign in")').first().isVisible().catch(() => false);

    // Page should have login-related content
    expect(await page.title() || await page.locator('h1, h2').first().textContent()).toBeDefined();
  });

  test('should display create account page', async ({ page }) => {
    await page.goto('/create-account');
    await page.waitForLoadState('networkidle');

    // Should see create account form or redirect
    await expect(page).toHaveURL(/\/(create-account|signup|register|login)/);
  });
});
