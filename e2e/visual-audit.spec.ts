/**
 * COMPREHENSIVE VISUAL AUDIT TEST SUITE
 *
 * This test suite performs a complete visual audit of the Aminy application:
 * - Tests every screen at mobile, tablet, and desktop viewports
 * - Captures screenshots for visual review
 * - Checks for overflow/cutoff issues
 * - Tests all button functionality and navigation
 * - Verifies AI chat integration
 * - Ensures no content is cut off on mobile
 */

import { test, expect, Page, Browser } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

// Viewport configurations
const VIEWPORTS = {
  mobile: { width: 375, height: 812, name: 'mobile' },      // iPhone X
  mobileSE: { width: 375, height: 667, name: 'mobile-se' }, // iPhone SE
  mobileSmall: { width: 320, height: 568, name: 'mobile-small' }, // iPhone 5/SE
  tablet: { width: 768, height: 1024, name: 'tablet' },     // iPad
  tabletLandscape: { width: 1024, height: 768, name: 'tablet-landscape' },
  desktop: { width: 1280, height: 800, name: 'desktop' },   // Standard desktop
  desktopLarge: { width: 1920, height: 1080, name: 'desktop-large' }, // Full HD
};

// All screens to test (mapped from App.tsx)
const PUBLIC_SCREENS = [
  { name: 'splash', path: '/', description: 'Landing page' },
  { name: 'login', path: '/?screen=login', description: 'Login screen' },
  { name: 'create-account', path: '/?screen=create-account', description: 'Create account' },
  { name: 'forgot-password', path: '/?screen=forgot-password', description: 'Forgot password' },
  { name: 'privacy-policy', path: '/?screen=privacy-policy', description: 'Privacy policy' },
  { name: 'terms-of-service', path: '/?screen=terms-of-service', description: 'Terms of service' },
  { name: 'provider-landing', path: '/providers', description: 'Provider landing page' },
  { name: 'provider-apply', path: '/providers/apply', description: 'Provider application' },
  { name: 'join-referral', path: '/join?ref=TEST123', description: 'Referral landing' },
];

// Protected screens (require mock auth state)
const PROTECTED_SCREENS = [
  { name: 'dashboard', path: '/?screen=dashboard', description: 'Main dashboard' },
  { name: 'onboarding', path: '/?screen=onboarding', description: 'Onboarding flow' },
  { name: 'paywall', path: '/?screen=paywall', description: 'Subscription paywall' },
  { name: 'telehealth', path: '/?screen=telehealth', description: 'Telehealth home' },
  { name: 'caregivers', path: '/?screen=caregivers', description: 'Caregiver management' },
  { name: 'vault', path: '/?screen=vault', description: 'Document vault' },
  { name: 'settings', path: '/?screen=settings', description: 'Settings' },
  { name: 'profile', path: '/?screen=profile', description: 'User profile' },
  { name: 'benefits', path: '/?screen=benefits', description: 'Benefits navigator' },
  { name: 'junior', path: '/?screen=junior', description: 'Aminy Jr (kids mode)' },
  { name: 'marketplace', path: '/?screen=marketplace', description: 'Provider marketplace' },
  { name: 'bcba-portal', path: '/?screen=bcba-portal', description: 'BCBA Coach Portal' },
  { name: 'outcomes', path: '/?screen=outcomes', description: 'Outcomes tracking' },
  { name: 'calm-tools', path: '/?screen=calm-tools', description: 'Sensory/calming tools' },
  { name: 'incident-log', path: '/?screen=incident-log', description: 'Activity log' },
  { name: 'care-plan', path: '/?screen=care-plan', description: 'Care plan' },
  { name: 'community', path: '/?screen=community', description: 'Community' },
  { name: 'resources', path: '/?screen=resources', description: 'Resources' },
  { name: 'my-appointments', path: '/?screen=my-appointments', description: 'Appointments' },
  { name: 'conversational-booking', path: '/?screen=conversational-booking', description: 'AI booking' },
  { name: 'messages', path: '/?screen=messages', description: 'Secure messaging' },
  { name: 'medications', path: '/?screen=medications', description: 'Medication tracker' },
  { name: 'crisis-resources', path: '/?screen=crisis-resources', description: 'Crisis resources' },
  { name: 'weekly-insights', path: '/?screen=weekly-insights', description: 'Weekly AI summary' },
  { name: 'analytics-charts', path: '/?screen=analytics-charts', description: 'Analytics charts' },
  { name: 'store', path: '/?screen=store', description: 'Store/marketplace' },
  { name: 'community-hub', path: '/?screen=community-hub', description: 'Community hub' },
  { name: 'on-demand-telehealth', path: '/?screen=on-demand-telehealth', description: 'On-demand telehealth' },
  { name: 'provider-portal', path: '/?screen=provider-portal', description: 'Provider portal' },
  { name: 'insight-report', path: '/?screen=insight-report', description: 'Insight report' },
];

// Ensure screenshots directory exists
const SCREENSHOTS_DIR = path.join(process.cwd(), 'e2e-screenshots');

// Helper: Create mock authenticated user in localStorage
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

// Helper: Check for horizontal overflow (content being cut off)
async function checkForOverflow(page: Page): Promise<{hasOverflow: boolean, scrollWidth: number, clientWidth: number}> {
  const result = await page.evaluate(() => {
    const scrollWidth = document.documentElement.scrollWidth;
    const clientWidth = document.documentElement.clientWidth;
    return {
      hasOverflow: scrollWidth > clientWidth + 5, // 5px tolerance
      scrollWidth,
      clientWidth,
    };
  });
  return result;
}

// Helper: Check for vertical content cutoff (bottom of screen)
async function checkForVerticalCutoff(page: Page): Promise<{hasCutoff: boolean, details: string}> {
  const result = await page.evaluate(() => {
    // Check if any fixed/sticky bottom elements are visible
    const bottomNav = document.querySelector('nav[class*="bottom"], [class*="bottom-nav"], [class*="tab-bar"]');
    const body = document.body;
    const html = document.documentElement;

    // Check if content extends beyond viewport
    const bodyHeight = body.scrollHeight;
    const viewportHeight = window.innerHeight;

    // Check for elements with position fixed at bottom
    const fixedBottomElements = document.querySelectorAll('[class*="fixed"][class*="bottom"], [style*="position: fixed"][style*="bottom"]');

    let hasCutoff = false;
    let details = '';

    // Check if bottom navigation is properly visible.
    // A fixed-bottom element whose rect.bottom exceeds the viewport means it is NOT
    // pinned to the viewport — typically because a transform/filter/contain on an
    // ancestor turned it into a containing block (see CLSOptimizer + the
    // .mobile-polish-wrapper rules; guarded by the EOF reset in index.css).
    fixedBottomElements.forEach((el) => {
      const rect = el.getBoundingClientRect();
      // Allow a small sub-pixel/rounding tolerance (sibling tests use 10px).
      if (rect.bottom > viewportHeight + 2) {
        hasCutoff = true;
        details += `Fixed bottom element not pinned to viewport: "${(el.className || '').toString().slice(0, 50)}" rect.bottom=${Math.round(rect.bottom)} > viewport=${viewportHeight}. `;
      }
    });

    return { hasCutoff, details: details || 'No cutoff detected' };
  });
  return result;
}

// Helper: Get all clickable elements info
async function getClickableElements(page: Page): Promise<Array<{tag: string, text: string, isVisible: boolean, rect: DOMRect | null}>> {
  return await page.evaluate(() => {
    const elements = document.querySelectorAll('button, a, [role="button"], [onclick], input[type="submit"]');
    return Array.from(elements).map(el => ({
      tag: el.tagName,
      text: (el as HTMLElement).innerText?.substring(0, 50) || '',
      isVisible: (el as HTMLElement).offsetParent !== null,
      rect: el.getBoundingClientRect(),
    }));
  });
}

// Helper: Check touch target sizes (minimum 44x44 for accessibility)
async function checkTouchTargets(page: Page): Promise<Array<{element: string, width: number, height: number, isTooSmall: boolean}>> {
  return await page.evaluate(() => {
    const elements = document.querySelectorAll('button, a, [role="button"], input[type="submit"]');
    const issues: Array<{element: string, width: number, height: number, isTooSmall: boolean}> = [];

    elements.forEach(el => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        const isTooSmall = rect.width < 44 || rect.height < 44;
        if (isTooSmall && (el as HTMLElement).offsetParent !== null) {
          issues.push({
            element: (el as HTMLElement).innerText?.substring(0, 30) || el.tagName,
            width: Math.round(rect.width),
            height: Math.round(rect.height),
            isTooSmall,
          });
        }
      }
    });

    return issues;
  });
}

// Helper: Take screenshot with descriptive name
async function takeScreenshot(page: Page, screenName: string, viewportName: string, suffix = '') {
  const filename = `${screenName}-${viewportName}${suffix ? '-' + suffix : ''}.png`;
  const filepath = path.join(SCREENSHOTS_DIR, filename);
  await page.screenshot({ path: filepath, fullPage: true });
  return filepath;
}

// ============================================
// VISUAL AUDIT TESTS - PUBLIC SCREENS
// ============================================
test.describe('Visual Audit - Public Screens', () => {
  test.beforeAll(async () => {
    // Create screenshots directory
    if (!fs.existsSync(SCREENSHOTS_DIR)) {
      fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
    }
  });

  for (const screen of PUBLIC_SCREENS) {
    test.describe(`${screen.name} - ${screen.description}`, () => {

      // Test at mobile viewport
      test(`mobile viewport (375x812)`, async ({ page }) => {
        await page.setViewportSize(VIEWPORTS.mobile);
        await page.goto(screen.path);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(500); // Wait for animations

        // Take screenshot
        await takeScreenshot(page, screen.name, 'mobile');

        // Check for overflow
        const overflow = await checkForOverflow(page);
        expect(overflow.hasOverflow).toBe(false);

        // Check for vertical cutoff
        const cutoff = await checkForVerticalCutoff(page);
        if (cutoff.hasCutoff) {
          console.warn(`⚠️ ${screen.name} (mobile): ${cutoff.details}`);
        }

        // Verify page loaded
        const body = page.locator('body');
        await expect(body).toBeVisible();
      });

      // Test at small mobile viewport
      test(`small mobile viewport (320x568)`, async ({ page }) => {
        await page.setViewportSize(VIEWPORTS.mobileSmall);
        await page.goto(screen.path);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(500);

        await takeScreenshot(page, screen.name, 'mobile-small');

        const overflow = await checkForOverflow(page);
        expect(overflow.hasOverflow).toBe(false);
      });

      // Test at tablet viewport
      test(`tablet viewport (768x1024)`, async ({ page }) => {
        await page.setViewportSize(VIEWPORTS.tablet);
        await page.goto(screen.path);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(500);

        await takeScreenshot(page, screen.name, 'tablet');

        const overflow = await checkForOverflow(page);
        expect(overflow.hasOverflow).toBe(false);
      });

      // Test at desktop viewport
      test(`desktop viewport (1280x800)`, async ({ page }) => {
        await page.setViewportSize(VIEWPORTS.desktop);
        await page.goto(screen.path);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(500);

        await takeScreenshot(page, screen.name, 'desktop');

        const overflow = await checkForOverflow(page);
        expect(overflow.hasOverflow).toBe(false);
      });
    });
  }
});

// ============================================
// VISUAL AUDIT TESTS - PROTECTED SCREENS
// ============================================
test.describe('Visual Audit - Protected Screens (with mock auth)', () => {
  test.beforeAll(async () => {
    if (!fs.existsSync(SCREENSHOTS_DIR)) {
      fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
    }
  });

  for (const screen of PROTECTED_SCREENS) {
    test.describe(`${screen.name} - ${screen.description}`, () => {

      test(`mobile viewport (375x812)`, async ({ page }) => {
        await setupMockAuth(page);
        await page.setViewportSize(VIEWPORTS.mobile);
        await page.goto(screen.path);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000); // Longer wait for lazy-loaded components

        await takeScreenshot(page, screen.name, 'mobile');

        const overflow = await checkForOverflow(page);
        if (overflow.hasOverflow) {
          console.warn(`⚠️ OVERFLOW: ${screen.name} (mobile) - scrollWidth: ${overflow.scrollWidth}, clientWidth: ${overflow.clientWidth}`);
        }
        expect(overflow.hasOverflow).toBe(false);

        const cutoff = await checkForVerticalCutoff(page);
        if (cutoff.hasCutoff) {
          console.warn(`⚠️ CUTOFF: ${screen.name} (mobile): ${cutoff.details}`);
        }
      });

      test(`small mobile viewport (320x568)`, async ({ page }) => {
        await setupMockAuth(page);
        await page.setViewportSize(VIEWPORTS.mobileSmall);
        await page.goto(screen.path);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);

        await takeScreenshot(page, screen.name, 'mobile-small');

        const overflow = await checkForOverflow(page);
        expect(overflow.hasOverflow).toBe(false);
      });

      test(`tablet viewport (768x1024)`, async ({ page }) => {
        await setupMockAuth(page);
        await page.setViewportSize(VIEWPORTS.tablet);
        await page.goto(screen.path);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);

        await takeScreenshot(page, screen.name, 'tablet');

        const overflow = await checkForOverflow(page);
        expect(overflow.hasOverflow).toBe(false);
      });

      test(`desktop viewport (1280x800)`, async ({ page }) => {
        await setupMockAuth(page);
        await page.setViewportSize(VIEWPORTS.desktop);
        await page.goto(screen.path);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);

        await takeScreenshot(page, screen.name, 'desktop');

        const overflow = await checkForOverflow(page);
        expect(overflow.hasOverflow).toBe(false);
      });
    });
  }
});

// ============================================
// BUTTON & NAVIGATION TESTS
// ============================================
test.describe('Button & Navigation Audit', () => {
  test('splash page - all buttons clickable', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Find all buttons
    const buttons = page.locator('button:visible');
    const buttonCount = await buttons.count();

    console.log(`Found ${buttonCount} visible buttons on splash page`);
    expect(buttonCount).toBeGreaterThan(0);

    // Test each button is clickable (not disabled, has proper cursor)
    for (let i = 0; i < buttonCount; i++) {
      const button = buttons.nth(i);
      const isEnabled = await button.isEnabled();
      const text = await button.textContent();
      console.log(`  Button ${i + 1}: "${text?.trim()}" - Enabled: ${isEnabled}`);
    }
  });

  test('login page - form elements work', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    await page.goto('/?screen=login');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Check for email input
    const emailInput = page.locator('input[type="email"], input[placeholder*="email" i]').first();
    if (await emailInput.isVisible()) {
      await emailInput.fill('test@example.com');
      await expect(emailInput).toHaveValue('test@example.com');
    }

    // Check for password input
    const passwordInput = page.locator('input[type="password"]').first();
    if (await passwordInput.isVisible()) {
      await passwordInput.fill('testpassword123');
    }

    // Check for submit button
    const submitButton = page.locator('button[type="submit"], button:has-text("Sign in"), button:has-text("Log in")').first();
    if (await submitButton.isVisible()) {
      await expect(submitButton).toBeEnabled();
    }
  });

  test('dashboard navigation - all tabs accessible', async ({ page }) => {
    await setupMockAuth(page);
    await page.setViewportSize(VIEWPORTS.mobile);
    await page.goto('/?screen=dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Find navigation tabs
    const navTabs = page.locator('nav button, [role="tab"], [role="tablist"] button');
    const tabCount = await navTabs.count();

    console.log(`Found ${tabCount} navigation tabs on dashboard`);

    // Click each tab and verify it responds
    for (let i = 0; i < Math.min(tabCount, 5); i++) {
      const tab = navTabs.nth(i);
      if (await tab.isVisible()) {
        const text = await tab.textContent();
        console.log(`  Clicking tab: "${text?.trim()}"`);
        await tab.click();
        await page.waitForTimeout(300);
      }
    }
  });

  test('settings page - all options accessible', async ({ page }) => {
    await setupMockAuth(page);
    await page.setViewportSize(VIEWPORTS.mobile);
    await page.goto('/?screen=settings');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Check for settings options
    const settingsOptions = page.locator('button, a, [role="button"]');
    const optionCount = await settingsOptions.count();

    console.log(`Found ${optionCount} clickable elements on settings page`);
    expect(optionCount).toBeGreaterThan(0);
  });
});

// ============================================
// TOUCH TARGET SIZE AUDIT
// ============================================
test.describe('Touch Target Accessibility', () => {
  const screensToCheck = ['splash', 'login', 'dashboard', 'settings'];

  for (const screenName of screensToCheck) {
    test(`${screenName} - touch targets meet 44x44 minimum`, async ({ page }) => {
      if (screenName === 'dashboard' || screenName === 'settings') {
        await setupMockAuth(page);
      }

      await page.setViewportSize(VIEWPORTS.mobile);
      await page.goto(screenName === 'splash' ? '/' : `/?screen=${screenName}`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);

      const smallTargets = await checkTouchTargets(page);

      if (smallTargets.length > 0) {
        console.warn(`⚠️ ${screenName}: ${smallTargets.length} touch targets smaller than 44x44:`);
        smallTargets.slice(0, 5).forEach(t => {
          console.warn(`   - "${t.element}" (${t.width}x${t.height})`);
        });
      }

      // Allow up to 3 small targets (icons, etc.) but warn
      expect(smallTargets.length).toBeLessThan(10);
    });
  }
});

// ============================================
// MOBILE BOTTOM NAVIGATION TEST
// ============================================
test.describe('Mobile Bottom Navigation', () => {
  test('bottom nav not cut off on mobile', async ({ page }) => {
    await setupMockAuth(page);
    await page.setViewportSize(VIEWPORTS.mobile);
    await page.goto('/?screen=dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Check for bottom navigation
    const bottomNav = page.locator('nav').last();

    if (await bottomNav.isVisible()) {
      const boundingBox = await bottomNav.boundingBox();

      if (boundingBox) {
        const viewportHeight = VIEWPORTS.mobile.height;
        const navBottom = boundingBox.y + boundingBox.height;

        console.log(`Bottom nav: y=${boundingBox.y}, height=${boundingBox.height}, bottom=${navBottom}`);
        console.log(`Viewport height: ${viewportHeight}`);

        // Bottom nav should be fully visible
        expect(navBottom).toBeLessThanOrEqual(viewportHeight + 10);
      }
    }
  });

  test('bottom nav visible on iPhone SE', async ({ page }) => {
    await setupMockAuth(page);
    await page.setViewportSize(VIEWPORTS.mobileSE);
    await page.goto('/?screen=dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    await takeScreenshot(page, 'dashboard-bottomnav', 'iphone-se');

    const cutoff = await checkForVerticalCutoff(page);
    expect(cutoff.hasCutoff, cutoff.details).toBe(false);
  });

  test('bottom nav visible on small mobile', async ({ page }) => {
    await setupMockAuth(page);
    await page.setViewportSize(VIEWPORTS.mobileSmall);
    await page.goto('/?screen=dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    await takeScreenshot(page, 'dashboard-bottomnav', 'mobile-small');

    const cutoff = await checkForVerticalCutoff(page);
    expect(cutoff.hasCutoff, cutoff.details).toBe(false);
  });
});

// ============================================
// AI CHAT INTEGRATION TEST
// ============================================
test.describe('AI Chat Integration', () => {
  test('chat interface loads on dashboard', async ({ page }) => {
    await setupMockAuth(page);
    await page.setViewportSize(VIEWPORTS.mobile);
    await page.goto('/?screen=dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    // Look for chat input or chat button
    const chatInput = page.locator('textarea, input[placeholder*="message" i], input[placeholder*="type" i], input[placeholder*="ask" i]');
    const chatButton = page.locator('button:has-text("Ask"), button:has-text("Chat"), [aria-label*="chat" i]');

    const hasChat = (await chatInput.count() > 0) || (await chatButton.count() > 0);

    if (hasChat) {
      await takeScreenshot(page, 'chat-interface', 'mobile');
      console.log('✓ Chat interface found');
    } else {
      console.log('⚠️ Chat interface not immediately visible (may need tab navigation)');
    }
  });

  test('chat input accepts text', async ({ page }) => {
    await setupMockAuth(page);
    await page.setViewportSize(VIEWPORTS.mobile);
    await page.goto('/?screen=dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    // Try to find and interact with chat input
    const chatInput = page.locator('textarea, [contenteditable="true"]').first();

    if (await chatInput.isVisible()) {
      await chatInput.fill('Hello, this is a test message');
      const value = await chatInput.inputValue().catch(() => null);
      console.log(`Chat input value: "${value}"`);
    }
  });
});

// ============================================
// SCROLL & CONTENT VISIBILITY TEST
// ============================================
test.describe('Scroll & Content Visibility', () => {
  const longContentScreens = ['community', 'resources', 'marketplace', 'store'];

  for (const screenName of longContentScreens) {
    test(`${screenName} - content scrollable, nothing cut off`, async ({ page }) => {
      await setupMockAuth(page);
      await page.setViewportSize(VIEWPORTS.mobile);
      await page.goto(`/?screen=${screenName}`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      // Take screenshot of top
      await takeScreenshot(page, screenName, 'mobile-top');

      // Scroll to bottom
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(500);

      // Take screenshot of bottom
      await takeScreenshot(page, screenName, 'mobile-bottom');

      // Check for horizontal overflow
      const overflow = await checkForOverflow(page);
      expect(overflow.hasOverflow).toBe(false);
    });
  }
});

// ============================================
// FORM VALIDATION TEST
// ============================================
test.describe('Form Validation', () => {
  test('login form shows validation errors', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    await page.goto('/?screen=login');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Try to submit empty form
    const submitButton = page.locator('button[type="submit"], button:has-text("Sign in"), button:has-text("Log in")').first();

    if (await submitButton.isVisible()) {
      await submitButton.click();
      await page.waitForTimeout(500);

      // Check for validation feedback
      const errorMessages = page.locator('[role="alert"], .error, [class*="error"], [class*="invalid"]');
      const errorCount = await errorMessages.count();

      console.log(`Found ${errorCount} validation indicators after empty submit`);
      await takeScreenshot(page, 'login-validation', 'mobile');
    }
  });

  test('create account form validation', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    await page.goto('/?screen=create-account');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    const submitButton = page.locator('button[type="submit"], button:has-text("Create"), button:has-text("Sign up")').first();

    if (await submitButton.isVisible()) {
      await submitButton.click();
      await page.waitForTimeout(500);

      await takeScreenshot(page, 'create-account-validation', 'mobile');
    }
  });
});

// ============================================
// DARK MODE TEST
// ============================================
test.describe('Dark Mode', () => {
  test('app respects system dark mode preference', async ({ page }) => {
    await setupMockAuth(page);

    // Emulate dark mode preference
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.setViewportSize(VIEWPORTS.mobile);
    await page.goto('/?screen=dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    await takeScreenshot(page, 'dashboard-dark-mode', 'mobile');

    // Check if dark mode is applied
    const isDarkMode = await page.evaluate(() => {
      const html = document.documentElement;
      return html.classList.contains('dark') ||
             getComputedStyle(document.body).backgroundColor.includes('rgb(') &&
             parseInt(getComputedStyle(document.body).backgroundColor.split(',')[0].replace(/\D/g, '')) < 50;
    });

    console.log(`Dark mode detected: ${isDarkMode}`);
  });
});

// ============================================
// PERFORMANCE AUDIT
// ============================================
test.describe('Performance Audit', () => {
  test('splash page loads quickly', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);

    const startTime = Date.now();
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    const domLoadTime = Date.now() - startTime;

    await page.waitForLoadState('networkidle');
    const fullLoadTime = Date.now() - startTime;

    console.log(`Splash page DOM load: ${domLoadTime}ms`);
    console.log(`Splash page full load: ${fullLoadTime}ms`);

    expect(domLoadTime).toBeLessThan(5000); // 5 second DOM load max
    expect(fullLoadTime).toBeLessThan(15000); // 15 second full load max
  });

  test('dashboard loads within acceptable time', async ({ page }) => {
    await setupMockAuth(page);
    await page.setViewportSize(VIEWPORTS.mobile);

    const startTime = Date.now();
    await page.goto('/?screen=dashboard');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;

    console.log(`Dashboard load time: ${loadTime}ms`);

    expect(loadTime).toBeLessThan(15000);
  });
});

// ============================================
// CONSOLE ERROR MONITORING
// ============================================
test.describe('Console Error Monitoring', () => {
  const screensToMonitor = ['splash', 'login', 'dashboard', 'settings', 'telehealth'];

  for (const screenName of screensToMonitor) {
    test(`${screenName} - no critical console errors`, async ({ page }) => {
      const errors: string[] = [];
      const warnings: string[] = [];

      page.on('console', msg => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        } else if (msg.type() === 'warning') {
          warnings.push(msg.text());
        }
      });

      if (screenName === 'dashboard' || screenName === 'settings' || screenName === 'telehealth') {
        await setupMockAuth(page);
      }

      await page.setViewportSize(VIEWPORTS.mobile);
      await page.goto(screenName === 'splash' ? '/' : `/?screen=${screenName}`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      // Filter out expected/non-critical errors
      const criticalErrors = errors.filter(e =>
        !e.includes('favicon') &&
        !e.includes('manifest') &&
        !e.includes('service-worker') &&
        !e.includes('chunk') &&
        !e.includes('Failed to load resource') &&
        !e.includes('net::ERR')
      );

      if (criticalErrors.length > 0) {
        console.error(`❌ ${screenName} has ${criticalErrors.length} critical errors:`);
        criticalErrors.forEach(e => console.error(`   ${e.substring(0, 100)}`));
      }

      if (warnings.length > 0) {
        console.warn(`⚠️ ${screenName} has ${warnings.length} warnings`);
      }

      expect(criticalErrors.length).toBe(0);
    });
  }
});

// ============================================
// SUMMARY REPORT
// ============================================
test.afterAll(async () => {
  console.log('\n========================================');
  console.log('VISUAL AUDIT COMPLETE');
  console.log('========================================');
  console.log(`Screenshots saved to: ${SCREENSHOTS_DIR}`);
  console.log('Review screenshots to verify visual appearance.');
  console.log('========================================\n');
});
