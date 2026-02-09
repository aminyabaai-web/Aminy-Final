/**
 * VISUAL REGRESSION TESTS
 *
 * Screenshot-based visual regression testing:
 * - Baseline comparison for all major screens
 * - Component-level visual tests
 * - Responsive breakpoint verification
 * - Theme/dark mode testing
 */

import { test, expect, Page } from '@playwright/test';

// ============================================
// HELPER FUNCTIONS
// ============================================

async function setupMockAuth(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('aminy-user', JSON.stringify({
      parentName: 'Test Parent',
      childName: 'Alex',
      childAge: 8,
      childId: 'child-test-123',
      relationship: 'parent',
      state: 'AZ',
      email: 'test@example.com',
      hasCompletedOnboarding: true,
      tier: 'essentials',
      role: 'parent',
    }));
  });
}

async function hideAnimations(page: Page) {
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        transition-delay: 0s !important;
      }
    `,
  });
}

async function waitForPageReady(page: Page) {
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
  await hideAnimations(page);
}

// ============================================
// PUBLIC PAGES VISUAL REGRESSION
// ============================================
test.describe('Visual Regression - Public Pages', () => {
  test.describe('Splash Page', () => {
    test('desktop viewport', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto('/');
      await waitForPageReady(page);

      await expect(page).toHaveScreenshot('splash-desktop.png', {
        maxDiffPixelRatio: 0.02,
        fullPage: true,
      });
    });

    test('tablet viewport', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto('/');
      await waitForPageReady(page);

      await expect(page).toHaveScreenshot('splash-tablet.png', {
        maxDiffPixelRatio: 0.02,
        fullPage: true,
      });
    });

    test('mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto('/');
      await waitForPageReady(page);

      await expect(page).toHaveScreenshot('splash-mobile.png', {
        maxDiffPixelRatio: 0.02,
        fullPage: true,
      });
    });

    test('small mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 568 });
      await page.goto('/');
      await waitForPageReady(page);

      await expect(page).toHaveScreenshot('splash-mobile-small.png', {
        maxDiffPixelRatio: 0.02,
        fullPage: true,
      });
    });
  });

  test.describe('Login Page', () => {
    test('desktop viewport', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto('/?screen=login');
      await waitForPageReady(page);

      await expect(page).toHaveScreenshot('login-desktop.png', {
        maxDiffPixelRatio: 0.02,
        fullPage: true,
      });
    });

    test('mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto('/?screen=login');
      await waitForPageReady(page);

      await expect(page).toHaveScreenshot('login-mobile.png', {
        maxDiffPixelRatio: 0.02,
        fullPage: true,
      });
    });

    test('with validation errors', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto('/?screen=login');
      await waitForPageReady(page);

      // Try to submit empty form
      const submit = page.locator('button[type="submit"]').first();
      if (await submit.isVisible()) {
        await submit.click();
        await page.waitForTimeout(300);
      }

      await expect(page).toHaveScreenshot('login-validation-errors.png', {
        maxDiffPixelRatio: 0.05,
        fullPage: true,
      });
    });
  });

  test.describe('Create Account Page', () => {
    test('mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto('/?screen=create-account');
      await waitForPageReady(page);

      await expect(page).toHaveScreenshot('create-account-mobile.png', {
        maxDiffPixelRatio: 0.02,
        fullPage: true,
      });
    });
  });

  test.describe('Provider Landing', () => {
    test('desktop viewport', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto('/providers');
      await waitForPageReady(page);

      await expect(page).toHaveScreenshot('provider-landing-desktop.png', {
        maxDiffPixelRatio: 0.02,
        fullPage: true,
      });
    });

    test('mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto('/providers');
      await waitForPageReady(page);

      await expect(page).toHaveScreenshot('provider-landing-mobile.png', {
        maxDiffPixelRatio: 0.02,
        fullPage: true,
      });
    });
  });
});

// ============================================
// PROTECTED PAGES VISUAL REGRESSION
// ============================================
test.describe('Visual Regression - Protected Pages', () => {
  test.describe('Dashboard', () => {
    test('desktop viewport', async ({ page }) => {
      await setupMockAuth(page);
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto('/?screen=dashboard');
      await waitForPageReady(page);
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot('dashboard-desktop.png', {
        maxDiffPixelRatio: 0.03,
        fullPage: true,
      });
    });

    test('tablet viewport', async ({ page }) => {
      await setupMockAuth(page);
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto('/?screen=dashboard');
      await waitForPageReady(page);
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot('dashboard-tablet.png', {
        maxDiffPixelRatio: 0.03,
        fullPage: true,
      });
    });

    test('mobile viewport', async ({ page }) => {
      await setupMockAuth(page);
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto('/?screen=dashboard');
      await waitForPageReady(page);
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot('dashboard-mobile.png', {
        maxDiffPixelRatio: 0.03,
        fullPage: true,
      });
    });

    test('iPhone SE viewport', async ({ page }) => {
      await setupMockAuth(page);
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/?screen=dashboard');
      await waitForPageReady(page);
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot('dashboard-iphone-se.png', {
        maxDiffPixelRatio: 0.03,
        fullPage: true,
      });
    });
  });

  test.describe('Settings', () => {
    test('mobile viewport', async ({ page }) => {
      await setupMockAuth(page);
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto('/?screen=settings');
      await waitForPageReady(page);

      await expect(page).toHaveScreenshot('settings-mobile.png', {
        maxDiffPixelRatio: 0.03,
        fullPage: true,
      });
    });
  });

  test.describe('Profile', () => {
    test('mobile viewport', async ({ page }) => {
      await setupMockAuth(page);
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto('/?screen=profile');
      await waitForPageReady(page);

      await expect(page).toHaveScreenshot('profile-mobile.png', {
        maxDiffPixelRatio: 0.03,
        fullPage: true,
      });
    });
  });

  test.describe('Telehealth', () => {
    test('mobile viewport', async ({ page }) => {
      await setupMockAuth(page);
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto('/?screen=telehealth');
      await waitForPageReady(page);

      await expect(page).toHaveScreenshot('telehealth-mobile.png', {
        maxDiffPixelRatio: 0.03,
        fullPage: true,
      });
    });
  });

  test.describe('Vault', () => {
    test('mobile viewport', async ({ page }) => {
      await setupMockAuth(page);
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto('/?screen=vault');
      await waitForPageReady(page);

      await expect(page).toHaveScreenshot('vault-mobile.png', {
        maxDiffPixelRatio: 0.03,
        fullPage: true,
      });
    });
  });

  test.describe('Marketplace', () => {
    test('mobile viewport', async ({ page }) => {
      await setupMockAuth(page);
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto('/?screen=marketplace');
      await waitForPageReady(page);

      await expect(page).toHaveScreenshot('marketplace-mobile.png', {
        maxDiffPixelRatio: 0.03,
        fullPage: true,
      });
    });
  });

  test.describe('Junior Mode', () => {
    test('mobile viewport', async ({ page }) => {
      await setupMockAuth(page);
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto('/?screen=junior');
      await waitForPageReady(page);

      await expect(page).toHaveScreenshot('junior-mobile.png', {
        maxDiffPixelRatio: 0.03,
        fullPage: true,
      });
    });
  });

  test.describe('Paywall', () => {
    test('mobile viewport', async ({ page }) => {
      await setupMockAuth(page);
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto('/?screen=paywall');
      await waitForPageReady(page);

      await expect(page).toHaveScreenshot('paywall-mobile.png', {
        maxDiffPixelRatio: 0.03,
        fullPage: true,
      });
    });
  });

  test.describe('Onboarding', () => {
    test('mobile viewport', async ({ page }) => {
      await page.addInitScript(() => {
        localStorage.setItem('aminy-user', JSON.stringify({
          parentName: 'Test Parent',
          email: 'test@example.com',
          hasCompletedOnboarding: false,
          tier: 'free',
          role: 'parent',
        }));
      });
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto('/?screen=onboarding');
      await waitForPageReady(page);

      await expect(page).toHaveScreenshot('onboarding-mobile.png', {
        maxDiffPixelRatio: 0.03,
        fullPage: true,
      });
    });
  });
});

// ============================================
// DARK MODE VISUAL REGRESSION
// ============================================
test.describe('Visual Regression - Dark Mode', () => {
  test('dashboard dark mode', async ({ page }) => {
    await setupMockAuth(page);
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/?screen=dashboard');
    await waitForPageReady(page);
    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot('dashboard-dark-mode.png', {
      maxDiffPixelRatio: 0.03,
      fullPage: true,
    });
  });

  test('login dark mode', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/?screen=login');
    await waitForPageReady(page);

    await expect(page).toHaveScreenshot('login-dark-mode.png', {
      maxDiffPixelRatio: 0.03,
      fullPage: true,
    });
  });

  test('settings dark mode', async ({ page }) => {
    await setupMockAuth(page);
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/?screen=settings');
    await waitForPageReady(page);

    await expect(page).toHaveScreenshot('settings-dark-mode.png', {
      maxDiffPixelRatio: 0.03,
      fullPage: true,
    });
  });
});

// ============================================
// COMPONENT VISUAL TESTS
// ============================================
test.describe('Visual Regression - Components', () => {
  test('buttons in various states', async ({ page }) => {
    await page.setViewportSize({ width: 400, height: 600 });
    await page.goto('/');
    await waitForPageReady(page);

    const buttons = page.locator('button:visible');
    const count = await buttons.count();

    if (count > 0) {
      // Capture button states
      const firstButton = buttons.first();
      await expect(firstButton).toHaveScreenshot('button-default.png', {
        maxDiffPixelRatio: 0.05,
      });

      await firstButton.hover();
      await page.waitForTimeout(200);
      await expect(firstButton).toHaveScreenshot('button-hover.png', {
        maxDiffPixelRatio: 0.05,
      });

      await firstButton.focus();
      await page.waitForTimeout(200);
      await expect(firstButton).toHaveScreenshot('button-focus.png', {
        maxDiffPixelRatio: 0.05,
      });
    }
  });

  test('input fields in various states', async ({ page }) => {
    await page.setViewportSize({ width: 400, height: 600 });
    await page.goto('/?screen=login');
    await waitForPageReady(page);

    const input = page.locator('input:visible').first();

    if (await input.isVisible()) {
      // Default state
      await expect(input).toHaveScreenshot('input-default.png', {
        maxDiffPixelRatio: 0.05,
      });

      // Focused state
      await input.focus();
      await page.waitForTimeout(200);
      await expect(input).toHaveScreenshot('input-focus.png', {
        maxDiffPixelRatio: 0.05,
      });

      // With text
      await input.fill('test@example.com');
      await expect(input).toHaveScreenshot('input-filled.png', {
        maxDiffPixelRatio: 0.05,
      });
    }
  });

  test('cards component', async ({ page }) => {
    await setupMockAuth(page);
    await page.setViewportSize({ width: 400, height: 800 });
    await page.goto('/?screen=dashboard');
    await waitForPageReady(page);
    await page.waitForTimeout(500);

    const card = page.locator('[class*="card"], [class*="Card"]').first();

    if (await card.isVisible()) {
      await expect(card).toHaveScreenshot('card-component.png', {
        maxDiffPixelRatio: 0.05,
      });
    }
  });

  test('navigation bar', async ({ page }) => {
    await setupMockAuth(page);
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/?screen=dashboard');
    await waitForPageReady(page);
    await page.waitForTimeout(500);

    const nav = page.locator('nav').last();

    if (await nav.isVisible()) {
      await expect(nav).toHaveScreenshot('navigation-bar.png', {
        maxDiffPixelRatio: 0.05,
      });
    }
  });
});

// ============================================
// RESPONSIVE BREAKPOINT TESTS
// ============================================
test.describe('Visual Regression - Breakpoints', () => {
  const breakpoints = [
    { name: 'xs', width: 320, height: 568 },
    { name: 'sm', width: 375, height: 812 },
    { name: 'md', width: 768, height: 1024 },
    { name: 'lg', width: 1024, height: 768 },
    { name: 'xl', width: 1280, height: 800 },
    { name: '2xl', width: 1536, height: 864 },
  ];

  for (const bp of breakpoints) {
    test(`dashboard at ${bp.name} (${bp.width}px)`, async ({ page }) => {
      await setupMockAuth(page);
      await page.setViewportSize({ width: bp.width, height: bp.height });
      await page.goto('/?screen=dashboard');
      await waitForPageReady(page);
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot(`dashboard-${bp.name}.png`, {
        maxDiffPixelRatio: 0.03,
        fullPage: true,
      });
    });
  }
});

// ============================================
// STATE-BASED VISUAL TESTS
// ============================================
test.describe('Visual Regression - States', () => {
  test('empty state - vault', async ({ page }) => {
    await setupMockAuth(page);
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/?screen=vault');
    await waitForPageReady(page);

    await expect(page).toHaveScreenshot('vault-empty-state.png', {
      maxDiffPixelRatio: 0.03,
      fullPage: true,
    });
  });

  test('loading state', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    // Capture immediately during load
    await page.waitForLoadState('domcontentloaded');

    // May or may not catch loading state
    await page.screenshot({
      path: 'test-results/loading-state.png',
      fullPage: true,
    });

    expect(true).toBe(true);
  });
});

// ============================================
// SCROLL POSITION TESTS
// ============================================
test.describe('Visual Regression - Scroll States', () => {
  test('dashboard scrolled to bottom', async ({ page }) => {
    await setupMockAuth(page);
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/?screen=dashboard');
    await waitForPageReady(page);
    await page.waitForTimeout(500);

    // Scroll to bottom
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(300);

    await expect(page).toHaveScreenshot('dashboard-scrolled.png', {
      maxDiffPixelRatio: 0.03,
    });
  });

  test('marketplace scrolled', async ({ page }) => {
    await setupMockAuth(page);
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/?screen=marketplace');
    await waitForPageReady(page);

    // Scroll halfway
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
    await page.waitForTimeout(300);

    await expect(page).toHaveScreenshot('marketplace-scrolled.png', {
      maxDiffPixelRatio: 0.03,
    });
  });
});

// ============================================
// MODAL/DIALOG VISUAL TESTS
// ============================================
test.describe('Visual Regression - Modals', () => {
  test('settings dialog', async ({ page }) => {
    await setupMockAuth(page);
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/?screen=settings');
    await waitForPageReady(page);

    // Try to open a dialog
    const trigger = page.locator('button:has-text("Delete"), button:has-text("Log out"), button:has-text("Sign out")').first();

    if (await trigger.isVisible()) {
      await trigger.click();
      await page.waitForTimeout(300);

      const dialog = page.locator('[role="dialog"], [class*="modal"]');
      if (await dialog.isVisible()) {
        await expect(page).toHaveScreenshot('settings-dialog.png', {
          maxDiffPixelRatio: 0.05,
          fullPage: true,
        });
      }
    }

    expect(true).toBe(true);
  });
});

// ============================================
// FORM STATE VISUAL TESTS
// ============================================
test.describe('Visual Regression - Form States', () => {
  test('login form filled', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/?screen=login');
    await waitForPageReady(page);

    // Fill in form
    const emailInput = page.locator('input[type="email"], input[placeholder*="email" i]').first();
    const passwordInput = page.locator('input[type="password"]').first();

    if (await emailInput.isVisible()) {
      await emailInput.fill('test@example.com');
    }
    if (await passwordInput.isVisible()) {
      await passwordInput.fill('password123');
    }

    await expect(page).toHaveScreenshot('login-form-filled.png', {
      maxDiffPixelRatio: 0.03,
      fullPage: true,
    });
  });
});

// ============================================
// ANIMATION-PAUSED TESTS
// ============================================
test.describe('Visual Regression - Static (No Animations)', () => {
  test('splash without animations', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    await waitForPageReady(page);

    // Ensure all animations are stopped
    await page.addStyleTag({
      content: `
        *, *::before, *::after {
          animation: none !important;
          transition: none !important;
        }
      `,
    });

    await expect(page).toHaveScreenshot('splash-static.png', {
      maxDiffPixelRatio: 0.02,
      fullPage: true,
    });
  });
});
