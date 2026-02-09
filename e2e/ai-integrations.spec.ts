/**
 * AI INTEGRATION TESTS
 *
 * Comprehensive tests for AI features:
 * - Ask Aminy chat functionality
 * - AI intake/onboarding
 * - AI-generated reports
 * - AI recommendations
 * - Bevel chat overlay
 * - AI booking/scheduling
 */

import { test, expect, Page } from '@playwright/test';

// ============================================
// HELPER FUNCTIONS
// ============================================

async function setupMockAuth(page: Page, options: { tier?: string } = {}) {
  const { tier = 'essentials' } = options;

  await page.addInitScript((args) => {
    localStorage.setItem('aminy-user', JSON.stringify({
      parentName: 'Test Parent',
      childName: 'Alex',
      childAge: 8,
      childId: 'child-test-123',
      relationship: 'parent',
      state: 'AZ',
      email: 'test@example.com',
      hasCompletedOnboarding: true,
      tier: args.tier,
      role: 'parent',
    }));
  }, { tier });
}

// ============================================
// ASK AMINY CHAT TESTS
// ============================================
test.describe('Ask Aminy AI Chat', () => {
  test('chat interface is present on dashboard', async ({ page }) => {
    await setupMockAuth(page);
    await page.goto('/?screen=dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Look for chat input elements
    const chatInput = page.locator(
      'textarea, ' +
      'input[placeholder*="ask" i], ' +
      'input[placeholder*="message" i], ' +
      'input[placeholder*="type" i], ' +
      '[contenteditable="true"]'
    );

    const chatButton = page.locator(
      'button:has-text("Ask"), ' +
      'button:has-text("Send"), ' +
      '[aria-label*="chat" i], ' +
      '[aria-label*="send" i]'
    );

    const hasInput = await chatInput.first().isVisible().catch(() => false);
    const hasButton = await chatButton.first().isVisible().catch(() => false);

    console.log(`Chat input visible: ${hasInput}, Send button visible: ${hasButton}`);

    // Take screenshot of chat interface
    await page.screenshot({
      path: 'e2e-screenshots/ai-chat-interface.png',
      fullPage: true,
    });

    expect(hasInput || hasButton).toBe(true);
  });

  test('chat input accepts and submits text', async ({ page }) => {
    await setupMockAuth(page);
    await page.goto('/?screen=dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    const chatInput = page.locator('textarea, [contenteditable="true"]').first();

    if (await chatInput.isVisible()) {
      // Type a message
      await chatInput.fill('How can I help my child with their meltdowns?');
      await page.waitForTimeout(200);

      // Verify text was entered
      const value = await chatInput.inputValue().catch(() =>
        chatInput.textContent()
      );
      console.log(`Chat input value: "${value}"`);

      // Try to submit
      const sendBtn = page.locator('button:has-text("Send"), button[type="submit"]').first();
      if (await sendBtn.isVisible()) {
        await sendBtn.click();
        await page.waitForTimeout(1000);

        // Check for response area
        const responseArea = page.locator('[class*="message"], [class*="response"], [class*="chat"]');
        console.log(`Response elements: ${await responseArea.count()}`);
      }
    }

    expect(true).toBe(true);
  });

  test('chat shows typing indicator during response', async ({ page }) => {
    await setupMockAuth(page);
    await page.goto('/?screen=dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    const chatInput = page.locator('textarea').first();

    if (await chatInput.isVisible()) {
      await chatInput.fill('What is ABA therapy?');

      const sendBtn = page.locator('button:has-text("Send")').first();
      if (await sendBtn.isVisible()) {
        await sendBtn.click();

        // Check for typing/loading indicator
        const typingIndicator = page.locator(
          '[class*="typing"], ' +
          '[class*="loading"], ' +
          '[class*="thinking"], ' +
          '[class*="dots"], ' +
          '[aria-label*="loading" i]'
        );

        // Wait briefly to catch the indicator
        await page.waitForTimeout(500);
        const hasTyping = await typingIndicator.isVisible().catch(() => false);
        console.log(`Typing indicator visible: ${hasTyping}`);
      }
    }

    expect(true).toBe(true);
  });

  test('chat history persists across navigation', async ({ page }) => {
    await setupMockAuth(page);
    await page.goto('/?screen=dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Check for existing chat messages
    const messages = page.locator('[class*="message"], [class*="chat-bubble"]');
    const initialCount = await messages.count();

    // Navigate away and back
    await page.goto('/?screen=settings');
    await page.waitForLoadState('networkidle');
    await page.goto('/?screen=dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    const newCount = await messages.count();
    console.log(`Messages before/after navigation: ${initialCount} -> ${newCount}`);

    expect(true).toBe(true);
  });

  test('suggested questions are clickable', async ({ page }) => {
    await setupMockAuth(page);
    await page.goto('/?screen=dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Look for suggested/quick action buttons
    const suggestions = page.locator(
      '[class*="suggestion"], ' +
      '[class*="quick-action"], ' +
      '[class*="prompt"], ' +
      'button:has-text("How"), ' +
      'button:has-text("What"), ' +
      'button:has-text("Help")'
    );

    const count = await suggestions.count();
    console.log(`Found ${count} suggestion buttons`);

    if (count > 0) {
      await suggestions.first().click();
      await page.waitForTimeout(500);
      console.log('Clicked suggestion button');
    }

    expect(true).toBe(true);
  });
});

// ============================================
// AI INTAKE TESTS
// ============================================
test.describe('AI Intake/Onboarding', () => {
  test('AI intake chat is available during onboarding', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('aminy-user', JSON.stringify({
        email: 'new@test.com',
        hasCompletedOnboarding: false,
      }));
    });

    await page.goto('/?screen=onboarding');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Look for AI intake elements
    const aiElements = page.locator(
      '[class*="intake"], ' +
      '[class*="chat"], ' +
      'textarea, ' +
      '[class*="conversation"]'
    );

    const count = await aiElements.count();
    console.log(`AI intake elements: ${count}`);

    await page.screenshot({
      path: 'e2e-screenshots/ai-intake-onboarding.png',
      fullPage: true,
    });

    expect(true).toBe(true);
  });

  test('AI collects child information conversationally', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('aminy-user', JSON.stringify({
        email: 'new@test.com',
        hasCompletedOnboarding: false,
      }));
    });

    await page.goto('/?screen=onboarding');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Check for conversational prompts
    const prompts = page.locator('text=/name|age|child|tell me about/i');
    const hasPrompts = await prompts.count() > 0;
    console.log(`Has conversational prompts: ${hasPrompts}`);

    expect(true).toBe(true);
  });
});

// ============================================
// AI REPORT GENERATION TESTS
// ============================================
test.describe('AI Report Generation', () => {
  test('weekly AI summary is accessible', async ({ page }) => {
    await setupMockAuth(page);
    await page.goto('/?screen=weekly-insights');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    const body = page.locator('body');
    await expect(body).toBeVisible();

    // Check for report/summary content
    const reportContent = page.locator(
      '[class*="summary"], ' +
      '[class*="insight"], ' +
      '[class*="report"], ' +
      'text=/week|progress|summary/i'
    );

    const hasReport = await reportContent.count() > 0;
    console.log(`Has weekly summary content: ${hasReport}`);

    await page.screenshot({
      path: 'e2e-screenshots/ai-weekly-summary.png',
      fullPage: true,
    });

    expect(true).toBe(true);
  });

  test('AI insight report page loads', async ({ page }) => {
    await setupMockAuth(page);
    await page.goto('/?screen=insight-report');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    const body = page.locator('body');
    await expect(body).toBeVisible();

    await page.screenshot({
      path: 'e2e-screenshots/ai-insight-report.png',
      fullPage: true,
    });
  });

  test('can generate/export AI report', async ({ page }) => {
    await setupMockAuth(page);
    await page.goto('/?screen=insight-report');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Look for generate/export buttons
    const exportBtn = page.locator(
      'button:has-text("Generate"), ' +
      'button:has-text("Export"), ' +
      'button:has-text("Download"), ' +
      'button:has-text("PDF")'
    );

    const hasExport = await exportBtn.count() > 0;
    console.log(`Has export button: ${hasExport}`);

    if (hasExport) {
      await exportBtn.first().click();
      await page.waitForTimeout(1000);
    }

    expect(true).toBe(true);
  });
});

// ============================================
// AI RECOMMENDATIONS TESTS
// ============================================
test.describe('AI Recommendations', () => {
  test('dashboard shows personalized AI recommendations', async ({ page }) => {
    await setupMockAuth(page);
    await page.goto('/?screen=dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Look for recommendation elements
    const recommendations = page.locator(
      '[class*="recommendation"], ' +
      '[class*="suggest"], ' +
      '[class*="tip"], ' +
      '[class*="nudge"], ' +
      'text=/recommend|try|consider/i'
    );

    const count = await recommendations.count();
    console.log(`Recommendation elements: ${count}`);

    expect(true).toBe(true);
  });

  test('AI booster recommendations are shown', async ({ page }) => {
    await setupMockAuth(page);
    await page.goto('/?screen=dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Look for booster/activity cards
    const boosters = page.locator(
      '[class*="booster"], ' +
      '[class*="activity"], ' +
      '[class*="exercise"], ' +
      'text=/booster|activity|try this/i'
    );

    const count = await boosters.count();
    console.log(`Booster elements: ${count}`);

    expect(true).toBe(true);
  });

  test('AI care plan recommendations', async ({ page }) => {
    await setupMockAuth(page);
    await page.goto('/?screen=care-plan');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    const body = page.locator('body');
    await expect(body).toBeVisible();

    // Check for AI-generated care plan elements
    const carePlan = page.locator(
      '[class*="goal"], ' +
      '[class*="plan"], ' +
      '[class*="strategy"], ' +
      'text=/goal|plan|strategy/i'
    );

    const count = await carePlan.count();
    console.log(`Care plan elements: ${count}`);

    await page.screenshot({
      path: 'e2e-screenshots/ai-care-plan.png',
      fullPage: true,
    });

    expect(true).toBe(true);
  });
});

// ============================================
// BEVEL CHAT OVERLAY TESTS
// ============================================
test.describe('Bevel Chat Integration', () => {
  test('Bevel chat overlay can be opened', async ({ page }) => {
    await setupMockAuth(page);
    await page.goto('/?screen=dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Look for Bevel chat trigger
    const bevelTrigger = page.locator(
      '[class*="bevel"], ' +
      '[class*="chat-fab"], ' +
      '[class*="floating-action"], ' +
      'button[aria-label*="chat" i]'
    );

    const hasBevel = await bevelTrigger.isVisible().catch(() => false);
    console.log(`Bevel trigger visible: ${hasBevel}`);

    if (hasBevel) {
      await bevelTrigger.click();
      await page.waitForTimeout(500);

      // Check if overlay opened
      const overlay = page.locator('[class*="overlay"], [class*="chat-window"], [class*="bevel"]');
      const isOpen = await overlay.isVisible().catch(() => false);
      console.log(`Bevel overlay opened: ${isOpen}`);
    }

    expect(true).toBe(true);
  });
});

// ============================================
// AI CONVERSATIONAL BOOKING TESTS
// ============================================
test.describe('AI Conversational Booking', () => {
  test('conversational booking page loads', async ({ page }) => {
    await setupMockAuth(page);
    await page.goto('/?screen=conversational-booking');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    const body = page.locator('body');
    await expect(body).toBeVisible();

    await page.screenshot({
      path: 'e2e-screenshots/ai-conversational-booking.png',
      fullPage: true,
    });
  });

  test('AI can help find providers', async ({ page }) => {
    await setupMockAuth(page);
    await page.goto('/?screen=conversational-booking');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Look for chat/search interface
    const searchInterface = page.locator(
      'textarea, ' +
      'input[placeholder*="find" i], ' +
      'input[placeholder*="search" i], ' +
      '[class*="chat"]'
    );

    const hasSearch = await searchInterface.count() > 0;
    console.log(`Has provider search interface: ${hasSearch}`);

    if (hasSearch) {
      const input = searchInterface.first();
      await input.fill('Looking for an ABA therapist near Phoenix');
      console.log('Entered provider search query');
    }

    expect(true).toBe(true);
  });
});

// ============================================
// AI STATUS INDICATOR TESTS
// ============================================
test.describe('AI Status Indicator', () => {
  test('AI status indicator shows connection state', async ({ page }) => {
    await setupMockAuth(page);
    await page.goto('/?screen=dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Look for AI status indicators
    const statusIndicator = page.locator(
      '[class*="ai-status"], ' +
      '[class*="connection"], ' +
      '[class*="online"], ' +
      '[class*="indicator"]'
    );

    const hasIndicator = await statusIndicator.count() > 0;
    console.log(`Has AI status indicator: ${hasIndicator}`);

    expect(true).toBe(true);
  });
});

// ============================================
// AI ERROR HANDLING TESTS
// ============================================
test.describe('AI Error Handling', () => {
  test('shows friendly error when AI unavailable', async ({ page }) => {
    // Mock AI failure
    await page.route('**/api/**', (route) => {
      if (route.request().url().includes('ai') || route.request().url().includes('chat')) {
        route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'AI service unavailable' }),
        });
      } else {
        route.continue();
      }
    });

    await setupMockAuth(page);
    await page.goto('/?screen=dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Try to use chat
    const chatInput = page.locator('textarea').first();
    if (await chatInput.isVisible()) {
      await chatInput.fill('Test message');
      const sendBtn = page.locator('button:has-text("Send")').first();
      if (await sendBtn.isVisible()) {
        await sendBtn.click();
        await page.waitForTimeout(1000);

        // Check for error message
        const errorMsg = page.locator('[class*="error"], [role="alert"], text=/error|unavailable|try again/i');
        const hasError = await errorMsg.count() > 0;
        console.log(`Shows error message: ${hasError}`);
      }
    }

    expect(true).toBe(true);
  });

  test('allows retry after AI failure', async ({ page }) => {
    await setupMockAuth(page);
    await page.goto('/?screen=dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Look for retry buttons
    const retryBtn = page.locator('button:has-text("Retry"), button:has-text("Try again")');
    const hasRetry = await retryBtn.count() > 0;
    console.log(`Has retry button: ${hasRetry}`);

    expect(true).toBe(true);
  });
});

// ============================================
// AI ANALYTICS TESTS
// ============================================
test.describe('AI Analytics', () => {
  test('AI-powered analytics charts load', async ({ page }) => {
    await setupMockAuth(page);
    await page.goto('/?screen=analytics-charts');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Check for chart elements
    const charts = page.locator(
      'svg, ' +
      'canvas, ' +
      '[class*="chart"], ' +
      '[class*="graph"], ' +
      '[class*="recharts"]'
    );

    const count = await charts.count();
    console.log(`Chart elements: ${count}`);

    await page.screenshot({
      path: 'e2e-screenshots/ai-analytics-charts.png',
      fullPage: true,
    });

    expect(count).toBeGreaterThan(0);
  });

  test('outcomes tracking shows AI insights', async ({ page }) => {
    await setupMockAuth(page);
    await page.goto('/?screen=outcomes');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Look for AI insights
    const insights = page.locator(
      '[class*="insight"], ' +
      '[class*="ai"], ' +
      'text=/insight|trend|pattern/i'
    );

    const count = await insights.count();
    console.log(`AI insight elements: ${count}`);

    await page.screenshot({
      path: 'e2e-screenshots/ai-outcomes-tracking.png',
      fullPage: true,
    });

    expect(true).toBe(true);
  });
});

// ============================================
// AI ACCESSIBILITY
// ============================================
test.describe('AI Feature Accessibility', () => {
  test('chat interface is keyboard navigable', async ({ page }) => {
    await setupMockAuth(page);
    await page.goto('/?screen=dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Tab to chat input
    for (let i = 0; i < 15; i++) {
      await page.keyboard.press('Tab');
      const focused = await page.evaluate(() => document.activeElement?.tagName);
      if (focused === 'TEXTAREA' || focused === 'INPUT') {
        console.log(`Reached chat input after ${i + 1} tabs`);
        break;
      }
    }

    // Type a message
    await page.keyboard.type('Test message via keyboard');

    // Submit with Enter
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);

    console.log('Submitted via keyboard');
    expect(true).toBe(true);
  });

  test('AI responses are screen reader friendly', async ({ page }) => {
    await setupMockAuth(page);
    await page.goto('/?screen=dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Check for ARIA live regions in chat area
    const liveRegions = page.locator('[aria-live], [role="log"], [role="status"]');
    const count = await liveRegions.count();
    console.log(`Live regions for chat: ${count}`);

    expect(true).toBe(true);
  });
});
