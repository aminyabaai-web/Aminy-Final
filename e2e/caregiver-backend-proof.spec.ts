import { test, expect, type Page, type Browser } from '@playwright/test';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const requiredEnvMissing = !supabaseUrl || !serviceRoleKey;

type AdminUser = {
  id: string;
  email: string;
};

type PostgrestRow = Record<string, unknown>;

async function adminCreateUser(email: string, password: string): Promise<AdminUser> {
  const response = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: serviceRoleKey as string,
      Authorization: `Bearer ${serviceRoleKey}`,
    },
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: 'Caregiver Proof User' },
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to create test user: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  return { id: data.id, email: data.email };
}

async function fetchRows(
  table: string,
  filters: Record<string, string>,
  select = '*',
): Promise<PostgrestRow[]> {
  const params = new URLSearchParams({ select });
  for (const [column, value] of Object.entries(filters)) {
    params.set(column, value);
  }

  const response = await fetch(`${supabaseUrl}/rest/v1/${table}?${params.toString()}`, {
    headers: {
      apikey: serviceRoleKey as string,
      Authorization: `Bearer ${serviceRoleKey}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${table}: ${response.status} ${await response.text()}`);
  }

  return await response.json() as PostgrestRow[];
}

async function fetchSingle(
  table: string,
  filters: Record<string, string>,
  select = '*',
): Promise<PostgrestRow | null> {
  const rows = await fetchRows(table, { ...filters, limit: '1' }, select);
  return rows[0] || null;
}


async function acceptCookieBanner(page: Page) {
  const acceptButton = page.getByRole('button', { name: /accept all/i });
  if (await acceptButton.isVisible().catch(() => false)) {
    await acceptButton.click();
  }
}

async function signIn(page: Page, email: string, password: string) {
  await page.goto('/?screen=login', { waitUntil: 'networkidle' });
  await acceptCookieBanner(page);
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').first().fill(password);
  await page.getByRole('button', { name: /sign in/i }).click();
}

async function completeOnboarding(page: Page, childName: string) {
  await expect(page.getByText('Tell me about your child')).toBeVisible({ timeout: 20000 });
  await acceptCookieBanner(page);
  await page.getByPlaceholder('Their first name').fill(childName);
  await page.locator('select').selectOption('6');
  await page.getByRole('button', { name: /let's talk/i }).click();

  await expect(page.getByText(new RegExp(`what's the hardest part right now.*${childName}`, 'i'))).toBeVisible({ timeout: 15000 });
  await page.locator('textarea').fill('He loves trains. Transitions are really hard. What helps is a visual schedule.');
  await page.locator('textarea').press('Enter');
  await expect(page.getByRole('button', { name: /i'm ready/i })).toBeVisible({ timeout: 20000 });
  await page.getByRole('button', { name: /i'm ready/i }).click();
}

async function dismissPaywallIfVisible(page: Page) {
  const clicked = await page.evaluate(() => {
    const closeButton = document.querySelector('[data-testid="close-paywall"], button[title="Close pricing and return to dashboard"]');
    if (closeButton instanceof HTMLButtonElement) {
      closeButton.click();
      return true;
    }
    return false;
  });

  if (clicked) {
    await page.waitForTimeout(500);
  }
}

async function ensureDashboardReady(page: Page) {
  await acceptCookieBanner(page);

  const askAminyInput = page.getByPlaceholder('Ask Aminy anything...');
  const openChatButton = page.getByLabel('Open chat with Aminy');

  const ensureChatOpen = async () => {
    if (!(await askAminyInput.isVisible().catch(() => false)) && await openChatButton.isVisible().catch(() => false)) {
      await openChatButton.click();
      await page.waitForTimeout(300);
    }
  };

  for (let attempt = 0; attempt < 6; attempt += 1) {
    await dismissPaywallIfVisible(page);
    await ensureChatOpen();
    if (await askAminyInput.isVisible().catch(() => false)) {
      return;
    }
    await page.waitForTimeout(1000);
  }

  await navigateToScreen(page, 'dashboard');

  for (let attempt = 0; attempt < 6; attempt += 1) {
    await dismissPaywallIfVisible(page);
    await ensureChatOpen();
    if (await askAminyInput.isVisible().catch(() => false)) {
      return;
    }
    await page.waitForTimeout(1000);
  }

  await expect(askAminyInput).toBeVisible({ timeout: 20000 });
}

async function minimizeChatIfOpen(page: Page) {
  const minimizeButton = page.getByLabel('Minimize chat');
  if (await minimizeButton.isVisible().catch(() => false)) {
    await minimizeButton.click();
    await page.waitForTimeout(300);
  }
}

async function navigateToScreen(page: Page, screen: string) {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(300);
  await page.evaluate((name) => {
    (window as { __navigateToScreen?: (screenName: string) => void }).__navigateToScreen?.(name);
  }, screen);
  await page.waitForTimeout(1000);
}

async function navigateToWorkflowScreen(page: Page, screen: string) {
  await navigateToScreen(page, screen);
  for (let attempt = 0; attempt < 4; attempt += 1) {
    await dismissPaywallIfVisible(page);
    if (!(await page.getByTestId('close-paywall').isVisible().catch(() => false))) {
      return;
    }
    await page.waitForTimeout(500);
  }
}

async function buildMemoryContextInBrowser(page: Page): Promise<string> {
  return await page.evaluate(async () => {
    const [{ buildWorkflowMemoryContext }, { supabase }] = await Promise.all([
      import('/src/lib/caregiver-workflow.ts'),
      import('/src/utils/supabase/client.ts'),
    ]);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return '';
    return await buildWorkflowMemoryContext(user.id);
  });
}

async function regenerateDailyPlanInBrowser(page: Page, childId: string) {
  return await page.evaluate(async (id) => {
    const mod = await import('/src/lib/caregiver-workflow.ts');
    return await mod.generateDailyPlan({ childId: id, forceRegenerate: true });
  }, childId);
}

async function openSecondSession(browser: Browser, email: string, password: string) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await signIn(page, email, password);
  await dismissPaywallIfVisible(page);
  return { context, page };
}

test.describe('Caregiver Core Backend Proof', () => {
  test.skip(requiredEnvMissing, 'Requires VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');

  test('persists onboarding, memory, daily plan, junior progress, summary, and provider PDF on a real backend', async ({ page, browser }) => {
    const runId = Date.now();
    const email = `caregiver-proof-${runId}@example.com`;
    const password = `Caregiver!${runId}`;
    const childName = 'Ava Proof';

    const user = await adminCreateUser(email, password);

    await signIn(page, email, password);
    await completeOnboarding(page, childName);

    const childRow = await expect.poll(async () => {
      return await fetchSingle('children', { parent_id: `eq.${user.id}` }, 'id,name,is_primary');
    }, { timeout: 20000 }).not.toBeNull();

    const child = await fetchSingle('children', { parent_id: `eq.${user.id}` }, 'id,name,is_primary');
    expect(child?.name).toBe(childName);
    const childId = String(child?.id);

    await expect.poll(async () => (await fetchRows('profiles', { id: `eq.${user.id}` }, 'id,has_completed_onboarding,child_name')).length).toBe(1);
    const profile = await fetchSingle('profiles', { id: `eq.${user.id}` }, 'has_completed_onboarding,child_name');
    expect(profile?.has_completed_onboarding).toBe(true);
    expect(profile?.child_name).toBe(childName);

    await expect.poll(async () => (await fetchRows('treatment_goals', { user_id: `eq.${user.id}`, child_id: `eq.${childId}` }, 'id')).length, { timeout: 20000 }).toBeGreaterThanOrEqual(3);

    await ensureDashboardReady(page);
    const askAminyInput = page.getByPlaceholder('Ask Aminy anything...');
    await askAminyInput.fill('Ava loves trains and transitions are really hard. What helps is a visual schedule.');
    await askAminyInput.press('Enter');
    await expect(page.getByText(/visual schedule/i)).toBeVisible({ timeout: 20000 });

    await expect.poll(async () => (await fetchRows('ai_conversations', {
      user_id: `eq.${user.id}`,
      child_id: `eq.${childId}`,
      order: 'last_message_at.desc',
    }, 'id,child_id,message_count,last_message_at')).length, { timeout: 20000 }).toBeGreaterThanOrEqual(1);

    const matchingConversations = await fetchRows('ai_conversations', {
      user_id: `eq.${user.id}`,
      child_id: `eq.${childId}`,
      order: 'last_message_at.desc',
    }, 'id,child_id,message_count,last_message_at');
    const aiConversation = matchingConversations[0];
    expect(aiConversation?.child_id).toBe(childId);

    await expect.poll(async () => {
      const rows = await fetchRows('ai_messages', {
        conversation_id: `eq.${aiConversation?.id}`,
        role: 'eq.user',
        order: 'created_at.asc',
      }, 'id,content');
      return rows.some((row) => String(row.content || '').toLowerCase().includes('visual schedule'));
    }, { timeout: 30000 }).toBe(true);
    const userMessages = await fetchRows('ai_messages', {
      conversation_id: `eq.${aiConversation?.id}`,
      role: 'eq.user',
      order: 'created_at.asc',
    }, 'id,content');
    expect(String(userMessages[userMessages.length - 1]?.content || '')).toContain('visual schedule');

    await expect.poll(async () => (await fetchRows('conversation_compat_map', { ai_conversation_id: `eq.${aiConversation?.id}` }, 'ai_conversation_id,conversation_id')).length).toBe(1);
    const compatMap = await fetchSingle('conversation_compat_map', { ai_conversation_id: `eq.${aiConversation?.id}` }, 'conversation_id');

    await expect.poll(async () => (await fetchRows('messages', { conversation_id: `eq.${compatMap?.conversation_id}` }, 'id,role')).length, { timeout: 20000 }).toBeGreaterThanOrEqual(1);
    await expect.poll(async () => (await fetchRows('memory_facts', { user_id: `eq.${user.id}`, child_id: `eq.${childId}` }, 'id,category,value')).length, { timeout: 20000 }).toBeGreaterThanOrEqual(2);

    const { context: secondContext, page: secondPage } = await openSecondSession(browser, email, password);
    try {
      const memoryContext = await expect.poll(async () => await buildMemoryContextInBrowser(secondPage), { timeout: 20000 }).not.toEqual('');
      const resolvedContext = await buildMemoryContextInBrowser(secondPage);
      expect(resolvedContext.toLowerCase()).toContain('trains');
      expect(resolvedContext.toLowerCase()).toContain('visual schedule');
    } finally {
      await secondContext.close();
    }

    await navigateToWorkflowScreen(page, 'dashboard');
    await expect.poll(async () => (await fetchRows('daily_plan_snapshots', {
      user_id: `eq.${user.id}`,
      child_id: `eq.${childId}`,
      status: 'eq.active',
    }, 'id,version,status,items,plan_date')).length, { timeout: 20000 }).toBe(1);

    await regenerateDailyPlanInBrowser(page, childId);
    await expect.poll(async () => (await fetchRows('daily_plan_snapshots', {
      user_id: `eq.${user.id}`,
      child_id: `eq.${childId}`,
      status: 'eq.superseded',
    }, 'id')).length, { timeout: 20000 }).toBeGreaterThanOrEqual(1);

    const activePlan = await fetchSingle('daily_plan_snapshots', {
      user_id: `eq.${user.id}`,
      child_id: `eq.${childId}`,
      status: 'eq.active',
      order: 'version.desc',
    }, 'id,items');
    const activeItems = Array.isArray(activePlan?.items) ? activePlan?.items as Array<Record<string, unknown>> : [];
    expect(activeItems.length).toBeGreaterThan(0);

    await ensureDashboardReady(page);
    await dismissPaywallIfVisible(page);
    await minimizeChatIfOpen(page);
    const activeRoutineCard = page.getByTestId('active-routine-card');
    await expect(activeRoutineCard).toHaveAttribute('data-plan-snapshot-id', String(activePlan?.id), { timeout: 20000 });

    const visibleRoutineTask = activeRoutineCard.locator('[data-plan-item-id]').first();
    await expect(visibleRoutineTask).toBeVisible({ timeout: 20000 });
    const clickedPlanItemId = await visibleRoutineTask.getAttribute('data-plan-item-id');
    expect(clickedPlanItemId).not.toBeNull();
    await visibleRoutineTask.click();

    await expect.poll(async () => (await fetchRows('routine_completions', {
      user_id: `eq.${user.id}`,
      plan_snapshot_id: `eq.${activePlan?.id}`,
      routine_id: `eq.${clickedPlanItemId}`,
    }, 'id,status,completion_status,metadata')).length, { timeout: 20000 }).toBeGreaterThanOrEqual(1);

    await navigateToWorkflowScreen(page, 'junior');
    await expect(page.getByText(new RegExp(`Hi ${childName}!`, 'i'))).toBeVisible({ timeout: 20000 });
    await page.getByRole('button', { name: /count today/i }).click();

    await expect.poll(async () => (await fetchRows('jr_sessions', {
      parent_id: `eq.${user.id}`,
      child_id: `eq.${childId}`,
    }, 'id,activity_name,data,completed')).length, { timeout: 20000 }).toBeGreaterThanOrEqual(1);

    await navigateToWorkflowScreen(page, 'weekly-insights');
    await expect(page.getByRole('button', { name: /generate weekly summary/i })).toBeVisible({ timeout: 20000 });
    await page.getByRole('button', { name: /generate weekly summary/i }).click();

    await expect.poll(async () => (await fetchRows('caregiver_summaries', {
      user_id: `eq.${user.id}`,
      child_id: `eq.${childId}`,
    }, 'id,summary_text,period_end')).length, { timeout: 20000 }).toBeGreaterThanOrEqual(1);

    await navigateToWorkflowScreen(page, 'clinical-reports');
    await expect(page.getByRole('button', { name: /review & download/i })).toBeVisible({ timeout: 20000 });
    await page.getByRole('button', { name: /review & download/i }).click();
    await expect(page.getByRole('button', { name: /download clinical report pdf/i })).toBeVisible({ timeout: 20000 });

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /download clinical report pdf/i }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename().toLowerCase()).toContain('ava-proof');
  });
});
