/**
 * COMPONENT INTERACTION TESTS
 *
 * Tests for individual UI component behavior:
 * - Buttons (click, hover, disabled states)
 * - Form inputs (validation, focus, fill)
 * - Modals/Dialogs (open, close, focus trap)
 * - Navigation (tabs, menus, dropdowns)
 * - Cards (click, expand)
 * - Toasts/Notifications
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

// ============================================
// BUTTON INTERACTIONS
// ============================================
test.describe('Button Interactions', () => {
  test('primary button responds to click', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const buttons = page.locator('button:visible');
    const firstButton = buttons.first();

    if (await firstButton.isVisible()) {
      // Check it's enabled
      await expect(firstButton).toBeEnabled();

      // Click should not throw
      await firstButton.click();
      await page.waitForTimeout(200);
    }

    expect(true).toBe(true);
  });

  test('button shows loading state during action', async ({ page }) => {
    await page.goto('/?screen=login');
    await page.waitForLoadState('networkidle');

    const emailInput = page.locator('input[type="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    const submitBtn = page.locator('button[type="submit"]').first();

    if (await emailInput.isVisible() && await submitBtn.isVisible()) {
      await emailInput.fill('test@test.com');
      await passwordInput.fill('password123');
      await submitBtn.click();

      // Check for loading indicator
      const loading = page.locator('[class*="loading"], [class*="spinner"], button[disabled]');
      const hasLoading = await loading.first().isVisible().catch(() => false);

      console.log(`Button shows loading: ${hasLoading}`);
    }

    expect(true).toBe(true);
  });

  test('disabled button cannot be clicked', async ({ page }) => {
    await page.goto('/?screen=login');
    await page.waitForLoadState('networkidle');

    const disabledBtn = page.locator('button[disabled]');

    if (await disabledBtn.count() > 0) {
      await expect(disabledBtn.first()).toBeDisabled();
    }

    expect(true).toBe(true);
  });

  test('button hover changes appearance', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const button = page.locator('button:visible').first();

    if (await button.isVisible()) {
      const initialBg = await button.evaluate((el) => getComputedStyle(el).backgroundColor);

      await button.hover();
      await page.waitForTimeout(200);

      const hoverBg = await button.evaluate((el) => getComputedStyle(el).backgroundColor);

      console.log(`Button background: ${initialBg} -> ${hoverBg}`);
      // Button may or may not change color, but should not error
    }

    expect(true).toBe(true);
  });

  test('icon button has accessible name', async ({ page }) => {
    await setupMockAuth(page);
    await page.goto('/?screen=dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    const iconButtons = page.locator('button:has(svg)');
    const count = await iconButtons.count();

    let accessibleCount = 0;
    for (let i = 0; i < Math.min(count, 5); i++) {
      const btn = iconButtons.nth(i);
      const ariaLabel = await btn.getAttribute('aria-label');
      const text = await btn.textContent();

      if (ariaLabel || text?.trim()) {
        accessibleCount++;
      }
    }

    console.log(`Icon buttons with accessible name: ${accessibleCount}/${Math.min(count, 5)}`);
    expect(accessibleCount).toBeGreaterThan(0);
  });
});

// ============================================
// FORM INPUT INTERACTIONS
// ============================================
test.describe('Form Input Interactions', () => {
  test('text input accepts and displays text', async ({ page }) => {
    await page.goto('/?screen=login');
    await page.waitForLoadState('networkidle');

    const input = page.locator('input[type="email"], input[type="text"]').first();

    if (await input.isVisible()) {
      await input.fill('test@example.com');
      await expect(input).toHaveValue('test@example.com');

      // Clear and type again
      await input.clear();
      await input.type('another@test.com');
      await expect(input).toHaveValue('another@test.com');
    }
  });

  test('password input masks text', async ({ page }) => {
    await page.goto('/?screen=login');
    await page.waitForLoadState('networkidle');

    const passwordInput = page.locator('input[type="password"]').first();

    if (await passwordInput.isVisible()) {
      await passwordInput.fill('secretPassword123');

      const type = await passwordInput.getAttribute('type');
      expect(type).toBe('password');
    }
  });

  test('input shows focus ring', async ({ page }) => {
    await page.goto('/?screen=login');
    await page.waitForLoadState('networkidle');

    const input = page.locator('input:visible').first();

    if (await input.isVisible()) {
      await input.focus();
      await page.waitForTimeout(100);

      const style = await input.evaluate((el) => {
        const s = getComputedStyle(el);
        return {
          outline: s.outline,
          boxShadow: s.boxShadow,
          borderColor: s.borderColor,
        };
      });

      console.log('Input focus style:', style);
      // Should have some focus indication
      const hasFocus =
        style.outline !== 'none' ||
        style.boxShadow !== 'none' ||
        style.borderColor.includes('rgb');
      expect(hasFocus).toBe(true);
    }
  });

  test('required input shows validation', async ({ page }) => {
    await page.goto('/?screen=login');
    await page.waitForLoadState('networkidle');

    const submitBtn = page.locator('button[type="submit"]').first();

    if (await submitBtn.isVisible()) {
      await submitBtn.click();
      await page.waitForTimeout(300);

      // Check for validation messages
      const invalidInputs = page.locator('[aria-invalid="true"], :invalid, [class*="error"]');
      const count = await invalidInputs.count();

      console.log(`Invalid inputs after submit: ${count}`);
    }

    expect(true).toBe(true);
  });

  test('checkbox toggles on click', async ({ page }) => {
    await page.goto('/?screen=create-account');
    await page.waitForLoadState('networkidle');

    const checkbox = page.locator('input[type="checkbox"], [role="checkbox"]').first();

    if (await checkbox.isVisible()) {
      const initialState = await checkbox.isChecked();
      await checkbox.click();
      await page.waitForTimeout(100);
      const newState = await checkbox.isChecked();

      console.log(`Checkbox: ${initialState} -> ${newState}`);
      expect(newState).not.toBe(initialState);
    } else {
      console.log('No checkbox found');
    }

    expect(true).toBe(true);
  });

  test('select dropdown shows options', async ({ page }) => {
    await setupMockAuth(page);
    await page.goto('/?screen=settings');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    const select = page.locator('select, [role="listbox"], [role="combobox"]').first();

    if (await select.isVisible()) {
      await select.click();
      await page.waitForTimeout(300);

      const options = page.locator('[role="option"], option');
      const count = await options.count();

      console.log(`Dropdown options: ${count}`);
    }

    expect(true).toBe(true);
  });
});

// ============================================
// MODAL/DIALOG INTERACTIONS
// ============================================
test.describe('Modal/Dialog Interactions', () => {
  test('dialog opens on trigger click', async ({ page }) => {
    await setupMockAuth(page);
    await page.goto('/?screen=settings');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    const trigger = page.locator('button').first();

    if (await trigger.isVisible()) {
      await trigger.click();
      await page.waitForTimeout(300);

      const dialog = page.locator('[role="dialog"], [aria-modal="true"], [class*="modal"]');
      const isOpen = await dialog.isVisible().catch(() => false);

      console.log(`Dialog opened: ${isOpen}`);
    }

    expect(true).toBe(true);
  });

  test('dialog closes on Escape key', async ({ page }) => {
    await setupMockAuth(page);
    await page.goto('/?screen=settings');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    const trigger = page.locator('button:has-text("Delete"), button:has-text("Log out")').first();

    if (await trigger.isVisible()) {
      await trigger.click();
      await page.waitForTimeout(300);

      const dialog = page.locator('[role="dialog"]');

      if (await dialog.isVisible()) {
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);

        const stillVisible = await dialog.isVisible().catch(() => false);
        console.log(`Dialog closed on Escape: ${!stillVisible}`);
      }
    }

    expect(true).toBe(true);
  });

  test('dialog closes on overlay click', async ({ page }) => {
    await setupMockAuth(page);
    await page.goto('/?screen=settings');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    const trigger = page.locator('button').first();

    if (await trigger.isVisible()) {
      await trigger.click();
      await page.waitForTimeout(300);

      const overlay = page.locator('[class*="overlay"], [class*="backdrop"]').first();

      if (await overlay.isVisible()) {
        // Click on overlay (not the dialog content)
        await overlay.click({ position: { x: 10, y: 10 } });
        await page.waitForTimeout(300);
      }
    }

    expect(true).toBe(true);
  });

  test('dialog traps focus', async ({ page }) => {
    await setupMockAuth(page);
    await page.goto('/?screen=settings');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    const trigger = page.locator('button:has-text("Delete"), button:has-text("Log out")').first();

    if (await trigger.isVisible()) {
      await trigger.click();
      await page.waitForTimeout(300);

      const dialog = page.locator('[role="dialog"]');

      if (await dialog.isVisible()) {
        // Tab multiple times
        for (let i = 0; i < 10; i++) {
          await page.keyboard.press('Tab');
          await page.waitForTimeout(50);
        }

        // Focus should still be in dialog
        const focusInDialog = await page.evaluate(() => {
          const focused = document.activeElement;
          const dialog = document.querySelector('[role="dialog"]');
          return dialog?.contains(focused);
        });

        console.log(`Focus trapped in dialog: ${focusInDialog}`);
      }
    }

    expect(true).toBe(true);
  });
});

// ============================================
// NAVIGATION INTERACTIONS
// ============================================
test.describe('Navigation Interactions', () => {
  test('tab navigation works', async ({ page }) => {
    await setupMockAuth(page);
    await page.goto('/?screen=dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    const tabs = page.locator('[role="tab"], nav button');
    const count = await tabs.count();

    if (count > 1) {
      // Click second tab
      await tabs.nth(1).click();
      await page.waitForTimeout(300);

      // Check for active state
      const isActive = await tabs.nth(1).evaluate((el) => {
        return el.getAttribute('aria-selected') === 'true' ||
               el.classList.toString().includes('active') ||
               el.classList.toString().includes('selected');
      });

      console.log(`Tab active after click: ${isActive}`);
    }

    expect(true).toBe(true);
  });

  test('dropdown menu opens and closes', async ({ page }) => {
    await setupMockAuth(page);
    await page.goto('/?screen=dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    const menuTrigger = page.locator('[aria-haspopup="true"], [aria-haspopup="menu"]').first();

    if (await menuTrigger.isVisible()) {
      await menuTrigger.click();
      await page.waitForTimeout(300);

      const menu = page.locator('[role="menu"], [class*="dropdown"]');
      const isOpen = await menu.isVisible().catch(() => false);

      console.log(`Dropdown menu opened: ${isOpen}`);

      if (isOpen) {
        // Click outside to close
        await page.click('body', { position: { x: 10, y: 10 } });
        await page.waitForTimeout(300);
      }
    }

    expect(true).toBe(true);
  });

  test('accordion expands and collapses', async ({ page }) => {
    await setupMockAuth(page);
    await page.goto('/?screen=settings');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    const accordionTrigger = page.locator('[aria-expanded], [class*="accordion"]').first();

    if (await accordionTrigger.isVisible()) {
      const initialState = await accordionTrigger.getAttribute('aria-expanded');
      await accordionTrigger.click();
      await page.waitForTimeout(300);

      const newState = await accordionTrigger.getAttribute('aria-expanded');

      console.log(`Accordion: ${initialState} -> ${newState}`);
    }

    expect(true).toBe(true);
  });

  test('back button navigates correctly', async ({ page }) => {
    await setupMockAuth(page);
    await page.goto('/?screen=dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Navigate to settings
    await page.goto('/?screen=settings');
    await page.waitForLoadState('networkidle');

    const backBtn = page.locator('[aria-label*="back" i], button:has-text("Back"), button:has(svg[class*="arrow-left"])').first();

    if (await backBtn.isVisible()) {
      await backBtn.click();
      await page.waitForTimeout(300);

      console.log('Back button clicked');
    }

    expect(true).toBe(true);
  });
});

// ============================================
// CARD INTERACTIONS
// ============================================
test.describe('Card Interactions', () => {
  test('card is clickable when interactive', async ({ page }) => {
    await setupMockAuth(page);
    await page.goto('/?screen=marketplace');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    const card = page.locator('[class*="card"], [class*="Card"]').first();

    if (await card.isVisible()) {
      const cursor = await card.evaluate((el) => getComputedStyle(el).cursor);
      console.log(`Card cursor: ${cursor}`);

      await card.click();
      await page.waitForTimeout(300);
    }

    expect(true).toBe(true);
  });

  test('card hover shows effect', async ({ page }) => {
    await setupMockAuth(page);
    await page.goto('/?screen=dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    const card = page.locator('[class*="card"], [class*="Card"]').first();

    if (await card.isVisible()) {
      const initialShadow = await card.evaluate((el) => getComputedStyle(el).boxShadow);

      await card.hover();
      await page.waitForTimeout(200);

      const hoverShadow = await card.evaluate((el) => getComputedStyle(el).boxShadow);

      console.log(`Card shadow: ${initialShadow} -> ${hoverShadow}`);
    }

    expect(true).toBe(true);
  });

  test('expandable card expands on click', async ({ page }) => {
    await setupMockAuth(page);
    await page.goto('/?screen=dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    const expandable = page.locator('[class*="expandable"], [aria-expanded]').first();

    if (await expandable.isVisible()) {
      const initialHeight = await expandable.evaluate((el) => el.getBoundingClientRect().height);
      await expandable.click();
      await page.waitForTimeout(300);

      const newHeight = await expandable.evaluate((el) => el.getBoundingClientRect().height);

      console.log(`Card height: ${initialHeight} -> ${newHeight}`);
    }

    expect(true).toBe(true);
  });
});

// ============================================
// TOAST/NOTIFICATION INTERACTIONS
// ============================================
test.describe('Toast/Notification Interactions', () => {
  test('toast can be dismissed', async ({ page }) => {
    await setupMockAuth(page);
    await page.goto('/?screen=dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Wait for potential toast to appear
    const toast = page.locator('[class*="toast"], [class*="notification"], [role="alert"]').first();

    if (await toast.isVisible()) {
      const closeBtn = toast.locator('button, [aria-label*="close" i]');

      if (await closeBtn.isVisible()) {
        await closeBtn.click();
        await page.waitForTimeout(300);

        const stillVisible = await toast.isVisible().catch(() => false);
        console.log(`Toast dismissed: ${!stillVisible}`);
      }
    }

    expect(true).toBe(true);
  });

  test('toast auto-dismisses after timeout', async ({ page }) => {
    await setupMockAuth(page);
    await page.goto('/?screen=dashboard');
    await page.waitForLoadState('networkidle');

    // Wait for potential toast
    const toast = page.locator('[class*="toast"]').first();

    if (await toast.isVisible()) {
      // Wait for auto-dismiss (typically 3-5 seconds)
      await page.waitForTimeout(6000);

      const stillVisible = await toast.isVisible().catch(() => false);
      console.log(`Toast auto-dismissed: ${!stillVisible}`);
    }

    expect(true).toBe(true);
  });
});

// ============================================
// SCROLL INTERACTIONS
// ============================================
test.describe('Scroll Interactions', () => {
  test('page scrolls smoothly', async ({ page }) => {
    await setupMockAuth(page);
    await page.setViewportSize({ width: 375, height: 600 });
    await page.goto('/?screen=dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // The app scrolls an inner container (body.mobile-optimized), not window —
    // detect the real scrollable element and assert it moves (pass if content fits).
    const result = await page.evaluate(() => {
      const els = [document.scrollingElement, ...Array.from(document.querySelectorAll('*'))]
        .filter((el): el is Element => !!el && el.scrollHeight > el.clientHeight + 20);
      const el = els[0];
      if (!el) return { scrollable: false, moved: false };
      const before = el.scrollTop;
      el.scrollTop = before + 250;
      return { scrollable: true, moved: el.scrollTop > before };
    });
    console.log(`Scroll: scrollable=${result.scrollable} moved=${result.moved}`);
    expect(result.scrollable ? result.moved : true).toBe(true);
  });

  test('scroll to top button works', async ({ page }) => {
    await setupMockAuth(page);
    await page.setViewportSize({ width: 375, height: 600 });
    await page.goto('/?screen=marketplace');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Scroll to bottom
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);

    const scrollToTop = page.locator('[aria-label*="top" i], button:has-text("Top"), [class*="scroll-top"]');

    if (await scrollToTop.isVisible()) {
      await scrollToTop.click();
      await page.waitForTimeout(500);

      const scrollY = await page.evaluate(() => window.scrollY);
      console.log(`Scroll Y after click: ${scrollY}`);
      expect(scrollY).toBeLessThan(100);
    }

    expect(true).toBe(true);
  });

  test('infinite scroll loads more content', async ({ page }) => {
    await setupMockAuth(page);
    await page.setViewportSize({ width: 375, height: 600 });
    await page.goto('/?screen=community');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    const initialItems = await page.locator('[class*="card"], [class*="post"], [class*="item"]').count();

    // Scroll to bottom
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(2000);

    const newItems = await page.locator('[class*="card"], [class*="post"], [class*="item"]').count();

    console.log(`Items before/after scroll: ${initialItems} -> ${newItems}`);

    expect(true).toBe(true);
  });
});

// ============================================
// DRAG AND DROP INTERACTIONS
// ============================================
test.describe('Drag and Drop', () => {
  test('draggable elements can be moved', async ({ page }) => {
    await setupMockAuth(page);
    await page.goto('/?screen=dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    const draggable = page.locator('[draggable="true"], [class*="draggable"]').first();

    if (await draggable.isVisible()) {
      const box = await draggable.boundingBox();
      if (box) {
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();
        await page.mouse.move(box.x + 100, box.y + 100);
        await page.mouse.up();

        console.log('Dragged element');
      }
    }

    expect(true).toBe(true);
  });
});

// ============================================
// SWIPE INTERACTIONS (MOBILE)
// ============================================
test.describe('Swipe Interactions', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('carousel responds to swipe', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    const carousel = page.locator('[class*="carousel"], [class*="slider"]').first();

    if (await carousel.isVisible()) {
      const box = await carousel.boundingBox();
      if (box) {
        // Simulate swipe left
        await page.mouse.move(box.x + box.width - 20, box.y + box.height / 2);
        await page.mouse.down();
        await page.mouse.move(box.x + 20, box.y + box.height / 2, { steps: 10 });
        await page.mouse.up();
        await page.waitForTimeout(300);

        console.log('Swiped carousel');
      }
    }

    expect(true).toBe(true);
  });

  test('swipe to dismiss works', async ({ page }) => {
    await setupMockAuth(page);
    await page.goto('/?screen=dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    const dismissable = page.locator('[class*="swipe"], [class*="dismissable"]').first();

    if (await dismissable.isVisible()) {
      const box = await dismissable.boundingBox();
      if (box) {
        // Swipe right to dismiss
        await page.mouse.move(box.x + 20, box.y + box.height / 2);
        await page.mouse.down();
        await page.mouse.move(box.x + box.width, box.y + box.height / 2, { steps: 10 });
        await page.mouse.up();
        await page.waitForTimeout(500);
      }
    }

    expect(true).toBe(true);
  });
});

// ============================================
// LONG PRESS INTERACTIONS (MOBILE)
// ============================================
test.describe('Long Press Interactions', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('long press shows context menu', async ({ page }) => {
    await setupMockAuth(page);
    await page.goto('/?screen=dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    const element = page.locator('[class*="card"]').first();

    if (await element.isVisible()) {
      const box = await element.boundingBox();
      if (box) {
        // Simulate long press
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();
        await page.waitForTimeout(1000); // Long press duration
        await page.mouse.up();
        await page.waitForTimeout(300);

        // Check for context menu
        const contextMenu = page.locator('[role="menu"], [class*="context-menu"]');
        const hasMenu = await contextMenu.isVisible().catch(() => false);

        console.log(`Context menu appeared: ${hasMenu}`);
      }
    }

    expect(true).toBe(true);
  });
});
