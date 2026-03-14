import { test, expect } from '@playwright/test';

function seedAuthenticatedCaregiver() {
  return {
    id: 'test-user-123',
    userId: 'test-user-123',
    parentName: 'Test Parent',
    childName: 'Alex',
    childAge: 8,
    childId: 'child-test-123',
    activeChildId: 'child-test-123',
    relationship: 'parent',
    state: 'AZ',
    email: 'test@example.com',
    hasCompletedOnboarding: true,
    tier: 'core',
    role: 'parent',
  };
}

async function setupAuthenticatedCaregiver(page: import('@playwright/test').Page) {
  await page.addInitScript((user) => {
    localStorage.setItem('aminy-user', JSON.stringify(user));
  }, seedAuthenticatedCaregiver());
}

async function navigateToScreen(page: import('@playwright/test').Page, screen: string) {
  await page.evaluate((name) => {
    (window as { __navigateToScreen?: (screenName: string) => void }).__navigateToScreen?.(name);
  }, screen);
  await page.waitForTimeout(800);
}

test.describe('Caregiver Workflow Routing', () => {
  test('clinical reports screen remains reachable and shows the caregiver-summary-backed empty state', async ({ page }) => {
    await setupAuthenticatedCaregiver(page);
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    await navigateToScreen(page, 'clinical-reports');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/screen=clinical-reports/);
    await expect(page.getByRole('heading', { name: 'No caregiver summary available yet' })).toBeVisible();
    await expect(page.getByText('Complete onboarding, ask Aminy a question, or finish a daily-plan item before generating a provider report.')).toBeVisible();
  });

  test('weekly insights remains reachable and does not dead-end on dashboard', async ({ page }) => {
    await setupAuthenticatedCaregiver(page);
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    await navigateToScreen(page, 'weekly-insights');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/screen=weekly-insights/);
    await expect(page.getByRole('heading', { name: 'Weekly Insights' })).toBeVisible();
    await expect(page.getByText('No summary available yet')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Generate Weekly Summary' })).toBeVisible();
  });
});
