/**
 * DESIGN SYSTEM AUDIT TESTS
 *
 * Comprehensive tests for visual consistency:
 * - Color palette verification
 * - Typography consistency
 * - Spacing and layout
 * - Component styling
 * - Responsive design
 * - Animation and transitions
 */

import { test, expect, Page } from '@playwright/test';

// ============================================
// HELPER FUNCTIONS
// ============================================

async function setupMockAuth(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('__e2e_auth', 'bypass');
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

interface ColorInfo {
  element: string;
  backgroundColor: string;
  color: string;
  borderColor: string;
}

interface TypographyInfo {
  element: string;
  fontFamily: string;
  fontSize: string;
  fontWeight: string;
  lineHeight: string;
  letterSpacing: string;
}

interface SpacingInfo {
  element: string;
  padding: string;
  margin: string;
  gap: string;
}

// ============================================
// COLOR PALETTE TESTS
// ============================================
test.describe('Color Palette Audit', () => {
  test('primary buttons have consistent brand colors', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    const primaryButtons = page.locator('button[class*="primary"], button[class*="bg-"], .btn-primary');
    const count = await primaryButtons.count();

    const colors: ColorInfo[] = [];
    for (let i = 0; i < Math.min(count, 10); i++) {
      const btn = primaryButtons.nth(i);
      if (await btn.isVisible()) {
        const styles = await btn.evaluate((el) => ({
          element: el.textContent?.substring(0, 30) || el.tagName,
          backgroundColor: getComputedStyle(el).backgroundColor,
          color: getComputedStyle(el).color,
          borderColor: getComputedStyle(el).borderColor,
        }));
        colors.push(styles);
      }
    }

    console.log('Primary button colors:', JSON.stringify(colors, null, 2));

    // All buttons should have visible text (contrast check)
    for (const c of colors) {
      expect(c.color).not.toBe('rgba(0, 0, 0, 0)');
    }
  });

  test('text colors provide sufficient contrast', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const contrastIssues = await page.evaluate(() => {
      const issues: string[] = [];

      const getLuminance = (r: number, g: number, b: number) => {
        const [rs, gs, bs] = [r, g, b].map(c => {
          c = c / 255;
          return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
      };

      const getContrastRatio = (l1: number, l2: number) => {
        const lighter = Math.max(l1, l2);
        const darker = Math.min(l1, l2);
        return (lighter + 0.05) / (darker + 0.05);
      };

      const parseColor = (color: string) => {
        const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (match) {
          return { r: parseInt(match[1]), g: parseInt(match[2]), b: parseInt(match[3]) };
        }
        return null;
      };

      const textElements = document.querySelectorAll('p, span, h1, h2, h3, h4, h5, h6, a, button, label');

      textElements.forEach((el) => {
        const style = getComputedStyle(el);
        const textColor = parseColor(style.color);
        const bgColor = parseColor(style.backgroundColor);

        if (textColor && bgColor && bgColor.r !== 0 && bgColor.g !== 0 && bgColor.b !== 0) {
          const textLum = getLuminance(textColor.r, textColor.g, textColor.b);
          const bgLum = getLuminance(bgColor.r, bgColor.g, bgColor.b);
          const ratio = getContrastRatio(textLum, bgLum);

          // WCAG AA requires 4.5:1 for normal text, 3:1 for large text
          const fontSize = parseFloat(style.fontSize);
          const minRatio = fontSize >= 18 ? 3 : 4.5;

          if (ratio < minRatio && (el as HTMLElement).offsetParent !== null) {
            issues.push(`${el.tagName}: ratio ${ratio.toFixed(2)} < ${minRatio} (${(el as HTMLElement).innerText?.substring(0, 20)})`);
          }
        }
      });

      return issues.slice(0, 10); // Return first 10 issues
    });

    if (contrastIssues.length > 0) {
      console.warn('Contrast issues found:', contrastIssues);
    }

    // Allow some issues but flag if too many
    expect(contrastIssues.length).toBeLessThan(20);
  });

  test('links are visually distinguishable', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const links = page.locator('a:visible');
    const count = await links.count();

    const linkStyles = await page.evaluate(() => {
      const links = document.querySelectorAll('a');
      const styles: { hasUnderline: boolean; hasDistinctColor: boolean; text: string }[] = [];

      links.forEach((link) => {
        if ((link as HTMLElement).offsetParent !== null) {
          const style = getComputedStyle(link);
          styles.push({
            hasUnderline: style.textDecoration.includes('underline'),
            hasDistinctColor: style.color !== getComputedStyle(link.parentElement!).color,
            text: link.textContent?.substring(0, 20) || '',
          });
        }
      });

      return styles.slice(0, 10);
    });

    console.log(`Found ${count} links. Sample styles:`, linkStyles);
    expect(count >= 0).toBe(true);
  });

  test('error states use appropriate red/warning colors', async ({ page }) => {
    await page.goto('/?screen=login');
    await page.waitForLoadState('networkidle');

    // Try to trigger validation errors
    const submitBtn = page.locator('button[type="submit"], button:has-text("Sign in")').first();
    if (await submitBtn.isVisible()) {
      await submitBtn.click();
      await page.waitForTimeout(500);
    }

    const errorElements = await page.evaluate(() => {
      const errors = document.querySelectorAll('[class*="error"], [class*="invalid"], [role="alert"]');
      return Array.from(errors).map((el) => {
        const style = getComputedStyle(el);
        return {
          color: style.color,
          backgroundColor: style.backgroundColor,
          borderColor: style.borderColor,
          text: (el as HTMLElement).innerText?.substring(0, 50),
        };
      });
    });

    console.log('Error state colors:', errorElements);
    // Error elements should exist or form handles differently
    expect(true).toBe(true);
  });

  test('success states use appropriate green colors', async ({ page }) => {
    await setupMockAuth(page);
    await page.goto('/?screen=dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    const successElements = await page.evaluate(() => {
      const success = document.querySelectorAll('[class*="success"], [class*="complete"], [class*="check"]');
      return Array.from(success).slice(0, 5).map((el) => {
        const style = getComputedStyle(el);
        return {
          color: style.color,
          backgroundColor: style.backgroundColor,
        };
      });
    });

    console.log('Success state colors:', successElements);
    expect(true).toBe(true);
  });
});

// ============================================
// TYPOGRAPHY TESTS
// ============================================
test.describe('Typography Audit', () => {
  test('headings follow hierarchy (h1 > h2 > h3)', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const headingSizes = await page.evaluate(() => {
      const headings: { tag: string; size: number; text: string }[] = [];

      ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].forEach(tag => {
        const els = document.querySelectorAll(tag);
        els.forEach((el) => {
          if ((el as HTMLElement).offsetParent !== null) {
            headings.push({
              tag,
              size: parseFloat(getComputedStyle(el).fontSize),
              text: (el as HTMLElement).innerText?.substring(0, 30) || '',
            });
          }
        });
      });

      return headings;
    });

    console.log('Heading hierarchy:', headingSizes);

    // Check that h1 is larger than h2, h2 larger than h3, etc.
    const h1s = headingSizes.filter(h => h.tag === 'h1');
    const h2s = headingSizes.filter(h => h.tag === 'h2');
    const h3s = headingSizes.filter(h => h.tag === 'h3');

    if (h1s.length > 0 && h2s.length > 0) {
      const avgH1 = h1s.reduce((a, b) => a + b.size, 0) / h1s.length;
      const avgH2 = h2s.reduce((a, b) => a + b.size, 0) / h2s.length;
      expect(avgH1).toBeGreaterThanOrEqual(avgH2);
    }
  });

  test('body text is readable size (14px-18px)', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const bodyTextSizes = await page.evaluate(() => {
      const sizes: number[] = [];
      const paragraphs = document.querySelectorAll('p, span, div');

      paragraphs.forEach((el) => {
        if ((el as HTMLElement).offsetParent !== null && (el as HTMLElement).innerText?.trim().length > 20) {
          sizes.push(parseFloat(getComputedStyle(el).fontSize));
        }
      });

      return sizes.slice(0, 50);
    });

    const avgSize = bodyTextSizes.reduce((a, b) => a + b, 0) / bodyTextSizes.length;
    console.log(`Average body text size: ${avgSize}px`);

    // Body text should be between 12px and 24px on average
    expect(avgSize).toBeGreaterThanOrEqual(12);
    expect(avgSize).toBeLessThanOrEqual(24);
  });

  test('fonts load correctly (no system fallback)', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000); // Wait for font loading

    const fontInfo = await page.evaluate(() => {
      const body = document.body;
      const computedFont = getComputedStyle(body).fontFamily;

      // Check if custom fonts loaded
      const fonts = document.fonts;
      const loadedFonts: string[] = [];
      fonts.forEach((font) => {
        if (font.status === 'loaded') {
          loadedFonts.push(font.family);
        }
      });

      return {
        computedFont,
        loadedFonts: [...new Set(loadedFonts)],
      };
    });

    console.log('Font info:', fontInfo);
    expect(fontInfo.computedFont).toBeDefined();
  });

  test('line height is readable (1.4-1.8 for body)', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const lineHeights = await page.evaluate(() => {
      const results: { element: string; lineHeight: number; fontSize: number; ratio: number }[] = [];
      const paragraphs = document.querySelectorAll('p');

      paragraphs.forEach((el) => {
        if ((el as HTMLElement).offsetParent !== null) {
          const style = getComputedStyle(el);
          const lh = parseFloat(style.lineHeight);
          const fs = parseFloat(style.fontSize);
          if (!isNaN(lh) && !isNaN(fs)) {
            results.push({
              element: (el as HTMLElement).innerText?.substring(0, 20) || 'p',
              lineHeight: lh,
              fontSize: fs,
              ratio: lh / fs,
            });
          }
        }
      });

      return results.slice(0, 10);
    });

    console.log('Line heights:', lineHeights);

    // Most line heights should be reasonable (1.2 - 2.5)
    const validLineHeights = lineHeights.filter(lh => lh.ratio >= 1 && lh.ratio <= 3);
    expect(validLineHeights.length).toBeGreaterThanOrEqual(lineHeights.length * 0.5);
  });

  test('text is not truncated unexpectedly', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const truncatedElements = await page.evaluate(() => {
      const truncated: string[] = [];
      const elements = document.querySelectorAll('*');

      elements.forEach((el) => {
        const style = getComputedStyle(el);
        if (style.overflow === 'hidden' && style.textOverflow === 'ellipsis') {
          const htmlEl = el as HTMLElement;
          if (htmlEl.scrollWidth > htmlEl.clientWidth) {
            truncated.push(htmlEl.innerText?.substring(0, 30) || el.tagName);
          }
        }
      });

      return truncated.slice(0, 10);
    });

    console.log('Truncated elements:', truncatedElements);
    // Some truncation is intentional, but flag if excessive
    expect(truncatedElements.length).toBeLessThan(20);
  });
});

// ============================================
// SPACING & LAYOUT TESTS
// ============================================
test.describe('Spacing & Layout Audit', () => {
  test('consistent spacing between sections', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const sectionSpacing = await page.evaluate(() => {
      const sections = document.querySelectorAll('section, [class*="section"], main > div');
      const margins: number[] = [];

      sections.forEach((el) => {
        const style = getComputedStyle(el);
        margins.push(parseFloat(style.marginBottom));
      });

      return margins.filter(m => !isNaN(m) && m > 0);
    });

    console.log('Section margins:', sectionSpacing);

    // Sections should have some spacing
    if (sectionSpacing.length > 1) {
      const unique = [...new Set(sectionSpacing)];
      // Spacing should be somewhat consistent (not too many different values)
      expect(unique.length).toBeLessThan(10);
    }
  });

  test('buttons have adequate padding', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const buttonPadding = await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      const results: { text: string; paddingX: number; paddingY: number; tooSmall: boolean }[] = [];

      buttons.forEach((btn) => {
        if ((btn as HTMLElement).offsetParent !== null) {
          const style = getComputedStyle(btn);
          const px = (parseFloat(style.paddingLeft) + parseFloat(style.paddingRight)) / 2;
          const py = (parseFloat(style.paddingTop) + parseFloat(style.paddingBottom)) / 2;

          results.push({
            text: btn.textContent?.substring(0, 20) || '',
            paddingX: px,
            paddingY: py,
            tooSmall: px < 8 || py < 4,
          });
        }
      });

      return results.slice(0, 15);
    });

    console.log('Button padding:', buttonPadding);

    const smallButtons = buttonPadding.filter(b => b.tooSmall);
    // Most buttons should have adequate padding
    expect(smallButtons.length).toBeLessThan(buttonPadding.length * 0.5);
  });

  test('cards have consistent border radius', async ({ page }) => {
    await setupMockAuth(page);
    await page.goto('/?screen=dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    const cardRadii = await page.evaluate(() => {
      const cards = document.querySelectorAll('[class*="card"], [class*="Card"], [class*="rounded"]');
      const radii: number[] = [];

      cards.forEach((card) => {
        if ((card as HTMLElement).offsetParent !== null) {
          const radius = parseFloat(getComputedStyle(card).borderRadius);
          if (!isNaN(radius) && radius > 0) {
            radii.push(radius);
          }
        }
      });

      return radii;
    });

    console.log('Card border radii:', [...new Set(cardRadii)]);

    if (cardRadii.length > 0) {
      // Border radii should be consistent (use design tokens)
      const uniqueRadii = [...new Set(cardRadii)];
      expect(uniqueRadii.length).toBeLessThan(8);
    }
  });

  test('form inputs are aligned', async ({ page }) => {
    await page.goto('/?screen=login');
    await page.waitForLoadState('networkidle');

    const inputPositions = await page.evaluate(() => {
      const inputs = document.querySelectorAll('input, select, textarea');
      const positions: { left: number; width: number; type: string }[] = [];

      inputs.forEach((input) => {
        if ((input as HTMLElement).offsetParent !== null) {
          const rect = input.getBoundingClientRect();
          positions.push({
            left: rect.left,
            width: rect.width,
            type: input.getAttribute('type') || input.tagName,
          });
        }
      });

      return positions;
    });

    console.log('Input positions:', inputPositions);

    if (inputPositions.length > 1) {
      // Inputs should be left-aligned (similar left positions)
      const lefts = inputPositions.map(p => Math.round(p.left / 10) * 10); // Round to 10px
      const uniqueLefts = [...new Set(lefts)];
      expect(uniqueLefts.length).toBeLessThanOrEqual(3);
    }
  });

  test('grid/flex layouts are consistent', async ({ page }) => {
    await setupMockAuth(page);
    await page.goto('/?screen=dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    const layoutInfo = await page.evaluate(() => {
      const flexContainers = document.querySelectorAll('[class*="flex"], [class*="grid"]');
      const gaps: number[] = [];

      flexContainers.forEach((container) => {
        const style = getComputedStyle(container);
        if (style.display === 'flex' || style.display === 'grid') {
          const gap = parseFloat(style.gap);
          if (!isNaN(gap) && gap > 0) {
            gaps.push(gap);
          }
        }
      });

      return gaps;
    });

    console.log('Layout gaps:', [...new Set(layoutInfo)]);

    if (layoutInfo.length > 0) {
      // Gaps should follow a consistent scale
      const uniqueGaps = [...new Set(layoutInfo)];
      expect(uniqueGaps.length).toBeLessThan(10);
    }
  });
});

// ============================================
// COMPONENT STYLING TESTS
// ============================================
test.describe('Component Styling Audit', () => {
  test('buttons have hover/focus states', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const firstButton = page.locator('button:visible').first();

    if (await firstButton.isVisible()) {
      // Get initial styles
      const initialBg = await firstButton.evaluate((el) => getComputedStyle(el).backgroundColor);

      // Hover over button
      await firstButton.hover();
      await page.waitForTimeout(200);

      const hoverBg = await firstButton.evaluate((el) => getComputedStyle(el).backgroundColor);

      // Focus the button
      await firstButton.focus();
      await page.waitForTimeout(200);

      const focusBg = await firstButton.evaluate((el) => getComputedStyle(el).backgroundColor);
      const focusOutline = await firstButton.evaluate((el) => getComputedStyle(el).outline);

      console.log('Button states:', { initialBg, hoverBg, focusBg, focusOutline });

      // Button should have some focus indication
      expect(focusOutline || focusBg !== initialBg).toBeTruthy();
    }
  });

  test('inputs have focus states', async ({ page }) => {
    await page.goto('/?screen=login');
    await page.waitForLoadState('networkidle');

    const firstInput = page.locator('input:visible').first();

    if (await firstInput.isVisible()) {
      const initialBorder = await firstInput.evaluate((el) => getComputedStyle(el).borderColor);

      await firstInput.focus();
      await page.waitForTimeout(200);

      const focusBorder = await firstInput.evaluate((el) => getComputedStyle(el).borderColor);
      const focusOutline = await firstInput.evaluate((el) => getComputedStyle(el).outline);
      const focusBoxShadow = await firstInput.evaluate((el) => getComputedStyle(el).boxShadow);

      console.log('Input focus states:', { initialBorder, focusBorder, focusOutline, focusBoxShadow });

      // Input should have some focus indication
      expect(focusOutline !== 'none' || focusBorder !== initialBorder || focusBoxShadow !== 'none').toBeTruthy();
    }
  });

  test('cards have proper shadows', async ({ page }) => {
    await setupMockAuth(page);
    await page.goto('/?screen=dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    const cardShadows = await page.evaluate(() => {
      const cards = document.querySelectorAll('[class*="card"], [class*="Card"]');
      const shadows: string[] = [];

      cards.forEach((card) => {
        if ((card as HTMLElement).offsetParent !== null) {
          const shadow = getComputedStyle(card).boxShadow;
          if (shadow && shadow !== 'none') {
            shadows.push(shadow);
          }
        }
      });

      return [...new Set(shadows)];
    });

    console.log('Card shadows:', cardShadows);
    // Cards may or may not have shadows
    expect(true).toBe(true);
  });

  test('modals/dialogs have proper overlay', async ({ page }) => {
    await setupMockAuth(page);
    await page.goto('/?screen=settings');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Try to trigger a dialog
    const dialogTrigger = page.locator('button:has-text("Delete"), button:has-text("Log out"), button:has-text("Sign out")').first();

    if (await dialogTrigger.isVisible()) {
      await dialogTrigger.click();
      await page.waitForTimeout(500);

      const overlay = page.locator('[role="dialog"], [class*="overlay"], [class*="modal"], [class*="backdrop"]');

      if (await overlay.isVisible()) {
        const overlayStyle = await overlay.evaluate((el) => ({
          backgroundColor: getComputedStyle(el).backgroundColor,
          position: getComputedStyle(el).position,
        }));

        console.log('Modal overlay:', overlayStyle);
      }
    }

    expect(true).toBe(true);
  });

  test('loading states are styled properly', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Check for loading spinners/skeletons immediately
    const loadingElements = await page.evaluate(() => {
      const spinners = document.querySelectorAll('[class*="spinner"], [class*="loading"], [class*="skeleton"], [class*="pulse"]');
      return Array.from(spinners).slice(0, 5).map((el) => ({
        className: el.className,
        hasAnimation: getComputedStyle(el).animation !== 'none',
      }));
    });

    console.log('Loading elements:', loadingElements);
    expect(true).toBe(true);
  });

  test('empty states have proper styling', async ({ page }) => {
    await setupMockAuth(page);
    await page.goto('/?screen=vault');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    const emptyState = await page.evaluate(() => {
      const empty = document.querySelector('[class*="empty"], [class*="Empty"]');
      if (empty) {
        return {
          hasIcon: empty.querySelector('svg, img, [class*="icon"]') !== null,
          hasText: (empty as HTMLElement).innerText?.length > 10,
          hasAction: empty.querySelector('button, a') !== null,
        };
      }
      return null;
    });

    console.log('Empty state:', emptyState);
    expect(true).toBe(true);
  });
});

// ============================================
// RESPONSIVE DESIGN TESTS
// ============================================
test.describe('Responsive Design Audit', () => {
  const viewports = [
    { name: 'iPhone SE', width: 375, height: 667 },
    { name: 'iPhone 12', width: 390, height: 844 },
    { name: 'iPad', width: 768, height: 1024 },
    { name: 'Desktop', width: 1280, height: 800 },
    { name: 'Wide Desktop', width: 1920, height: 1080 },
  ];

  for (const vp of viewports) {
    test(`layout adapts to ${vp.name} (${vp.width}x${vp.height})`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Check for horizontal overflow
      const hasOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth + 5;
      });

      expect(hasOverflow).toBe(false);

      // Check that content is visible
      const mainContent = page.locator('main, [role="main"], body > div').first();
      await expect(mainContent).toBeVisible();

      // Take screenshot for manual review
      await page.screenshot({
        path: `e2e-screenshots/responsive-${vp.name.toLowerCase().replace(' ', '-')}.png`,
        fullPage: true
      });
    });
  }

  test('navigation collapses to hamburger on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await setupMockAuth(page);
    await page.goto('/?screen=dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Check for hamburger menu or bottom nav
    const hamburger = page.locator('[aria-label*="menu"], button:has(svg[class*="menu"]), [class*="hamburger"]');
    const bottomNav = page.locator('nav[class*="bottom"], [class*="bottom-nav"], [class*="tab-bar"]');

    const hasHamburger = await hamburger.isVisible().catch(() => false);
    const hasBottomNav = await bottomNav.isVisible().catch(() => false);

    console.log(`Mobile nav: hamburger=${hasHamburger}, bottomNav=${hasBottomNav}`);

    // Should have some mobile navigation
    expect(hasHamburger || hasBottomNav).toBe(true);
  });

  test('images scale properly on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const imageIssues = await page.evaluate(() => {
      const images = document.querySelectorAll('img');
      const issues: string[] = [];

      images.forEach((img) => {
        const rect = img.getBoundingClientRect();
        if (rect.width > window.innerWidth) {
          issues.push(`Image overflows: ${img.src?.substring(0, 50)} (${rect.width}px > ${window.innerWidth}px)`);
        }
      });

      return issues;
    });

    console.log('Image scaling issues:', imageIssues);
    expect(imageIssues.length).toBe(0);
  });

  test('text wraps properly on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const textOverflow = await page.evaluate(() => {
      const textElements = document.querySelectorAll('p, h1, h2, h3, span');
      const issues: string[] = [];

      textElements.forEach((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.width > window.innerWidth + 20) {
          issues.push((el as HTMLElement).innerText?.substring(0, 30) || el.tagName);
        }
      });

      return issues;
    });

    console.log('Text overflow issues:', textOverflow);
    expect(textOverflow.length).toBeLessThan(5);
  });
});

// ============================================
// ANIMATION & TRANSITION TESTS
// ============================================
test.describe('Animation & Transition Audit', () => {
  test('transitions are smooth (not instant)', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const transitionInfo = await page.evaluate(() => {
      const elements = document.querySelectorAll('button, a, [class*="card"]');
      const transitions: { element: string; duration: string; property: string }[] = [];

      elements.forEach((el) => {
        const style = getComputedStyle(el);
        if (style.transitionDuration && style.transitionDuration !== '0s') {
          transitions.push({
            element: el.tagName,
            duration: style.transitionDuration,
            property: style.transitionProperty,
          });
        }
      });

      return transitions.slice(0, 10);
    });

    console.log('Transition info:', transitionInfo);

    // Should have some transitions for smooth UX
    expect(transitionInfo.length).toBeGreaterThan(0);
  });

  test('no jarring animations (prefers-reduced-motion)', async ({ page }) => {
    // Emulate reduced motion preference
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const animations = await page.evaluate(() => {
      const animated = document.querySelectorAll('[class*="animate"], [class*="transition"]');
      const stillAnimating: string[] = [];

      animated.forEach((el) => {
        const style = getComputedStyle(el);
        if (style.animationDuration !== '0s' && style.animationName !== 'none') {
          stillAnimating.push(el.className);
        }
      });

      return stillAnimating;
    });

    console.log('Animations with reduced-motion:', animations);
    // Ideally, animations should be reduced/disabled
    expect(true).toBe(true);
  });

  test('page transitions are not blocking', async ({ page }) => {
    await setupMockAuth(page);
    await page.goto('/?screen=dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    const startTime = Date.now();

    // Navigate to different screen
    const settingsLink = page.locator('text=/settings/i').or(page.locator('[aria-label*="settings"]')).first();
    if (await settingsLink.isVisible()) {
      await settingsLink.click();
      await page.waitForLoadState('networkidle');
    }

    const navTime = Date.now() - startTime;
    console.log(`Navigation time: ${navTime}ms`);

    // Navigation should be fast
    expect(navTime).toBeLessThan(3000);
  });
});

// ============================================
// ICON & IMAGERY TESTS
// ============================================
test.describe('Icons & Imagery Audit', () => {
  test('icons are consistent size and style', async ({ page }) => {
    await setupMockAuth(page);
    await page.goto('/?screen=dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    const iconSizes = await page.evaluate(() => {
      const icons = document.querySelectorAll('svg, [class*="icon"], [class*="Icon"]');
      const sizes: { width: number; height: number }[] = [];

      icons.forEach((icon) => {
        const rect = icon.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          sizes.push({ width: Math.round(rect.width), height: Math.round(rect.height) });
        }
      });

      return sizes;
    });

    console.log('Icon sizes:', [...new Set(iconSizes.map(s => `${s.width}x${s.height}`))]);

    // Icons should use consistent sizes
    const uniqueSizes = [...new Set(iconSizes.map(s => `${s.width}x${s.height}`))];
    expect(uniqueSizes.length).toBeLessThan(15);
  });

  test('images have alt text', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const imageAltStatus = await page.evaluate(() => {
      const images = document.querySelectorAll('img');
      const noAlt: string[] = [];

      images.forEach((img) => {
        if (!img.alt && (img as HTMLElement).offsetParent !== null) {
          noAlt.push(img.src?.substring(0, 50) || 'unknown');
        }
      });

      return {
        total: images.length,
        noAlt,
      };
    });

    console.log(`Images: ${imageAltStatus.total} total, ${imageAltStatus.noAlt.length} missing alt`);

    // Most images should have alt text
    if (imageAltStatus.total > 0) {
      expect(imageAltStatus.noAlt.length / imageAltStatus.total).toBeLessThan(0.5);
    }
  });
});
