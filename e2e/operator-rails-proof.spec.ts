import { test, expect, type Page } from '@playwright/test';

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
      user_metadata: { full_name: 'Operator Proof User' },
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to create operator proof user: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  return { id: data.id, email: data.email };
}

async function insertRows(table: string, rows: PostgrestRow[]): Promise<PostgrestRow[]> {
  const response = await fetch(`${supabaseUrl}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      apikey: serviceRoleKey as string,
      Authorization: `Bearer ${serviceRoleKey}`,
    },
    body: JSON.stringify(rows),
  });

  if (!response.ok) {
    throw new Error(`Failed to insert ${table}: ${response.status} ${await response.text()}`);
  }

  return await response.json() as PostgrestRow[];
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
  await page.locator('textarea').fill('Transitions are hard. Visual schedules and sensory breaks help.');
  await page.locator('textarea').press('Enter');
  await expect(page.getByRole('button', { name: /i'm ready/i })).toBeVisible({ timeout: 20000 });
  await page.getByRole('button', { name: /i'm ready/i }).click();
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

async function navigateToScreen(page: Page, screen: string) {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(300);
  await page.evaluate((name) => {
    (window as { __navigateToScreen?: (screenName: string) => void }).__navigateToScreen?.(name);
  }, screen);
  await page.waitForTimeout(1000);
}

test.describe('Operator rails backend proof', () => {
  test.skip(requiredEnvMissing, 'Requires VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');

  test('renders persisted claim-ready, EVV, and CentralReach operator state', async ({ page }) => {
    const runId = Date.now();
    const email = `operator-proof-${runId}@example.com`;
    const password = `Operator!${runId}`;
    const childName = `Mila Operator ${runId}`;
    const claimPatients = {
      ready: `Mila Operator ${runId}`,
      blocked: `Blocked Operator ${runId}`,
      submitted: `Submitted Operator ${runId}`,
      denied: `Denied Operator ${runId}`,
    } as const;
    const user = await adminCreateUser(email, password);

    await signIn(page, email, password);
    await completeOnboarding(page, childName);

    const childRow = await expect.poll(async () => (
      await fetchSingle('children', { parent_id: `eq.${user.id}` }, 'id,name,is_primary')
    ), { timeout: 20000 }).not.toBeNull();

    const child = await fetchSingle('children', { parent_id: `eq.${user.id}` }, 'id,name,is_primary');
    const childId = String(child?.id);

    await page.evaluate(({ userId, childId, childName }) => {
      const existing = JSON.parse(window.localStorage.getItem('aminy-user') || '{}');
      window.localStorage.setItem('__e2e_auth', 'bypass');
    localStorage.setItem('aminy-user', JSON.stringify({
        ...existing,
        id: userId,
        userId,
        role: 'admin',
        state: 'AZ',
        organization: 'aact',
        pilotEligible: true,
        activeChildId: childId,
        childId,
        childName,
      }));
      window.localStorage.setItem('aminy-pilot-context', JSON.stringify({
        role: 'admin',
        state: 'AZ',
        organization: 'aact',
        pilotEligible: true,
      }));
    }, { userId: user.id, childId, childName });

    await insertRows('claim_ready_cases', [
      {
        patient_name: claimPatients.ready,
        child_id: childId,
        state: 'AZ',
        payer_id: 'bcbs-az',
        payer_name: 'Blue Cross Blue Shield of Arizona',
        provider_name: 'AACT Telehealth Team',
        visit_type: 'Quick Consult',
        service_date: '2026-03-10',
        queue_status: 'ready_for_biller',
        issues: [],
        route: 'insured_partner_billed',
        submission_mode: 'clearinghouse',
        auth_required: true,
        amount_cents: 7900,
      },
      {
        patient_name: claimPatients.blocked,
        child_id: childId,
        state: 'AZ',
        payer_id: 'mercy-care',
        payer_name: 'Mercy Care',
        provider_name: 'AACT Telehealth Team',
        visit_type: 'Standard Session',
        service_date: '2026-03-11',
        queue_status: 'missing_auth',
        issues: ['Prior authorization is required for this payer and service line.'],
        route: 'insured_partner_billed',
        submission_mode: 'partner_billing',
        auth_required: true,
        amount_cents: 14900,
      },
      {
        patient_name: claimPatients.submitted,
        child_id: childId,
        state: 'AZ',
        payer_id: 'uhc',
        payer_name: 'UnitedHealthcare',
        provider_name: 'AACT Telehealth Team',
        visit_type: 'Diagnostic / Deep Review',
        service_date: '2026-03-12',
        queue_status: 'submitted',
        issues: [],
        route: 'insured_partner_billed',
        submission_mode: 'clearinghouse',
        auth_required: true,
        amount_cents: 22900,
      },
      {
        patient_name: claimPatients.denied,
        child_id: childId,
        state: 'AZ',
        payer_id: 'aetna',
        payer_name: 'Aetna',
        provider_name: 'AACT Telehealth Team',
        visit_type: 'Standard Session',
        service_date: '2026-03-13',
        queue_status: 'denied',
        issues: ['Medical necessity packet missing supporting documentation.'],
        route: 'insured_partner_billed',
        submission_mode: 'clearinghouse',
        auth_required: true,
        amount_cents: 14900,
      },
    ]);

    await insertRows('evv_reconciliation_runs', [
      {
        child_id: childId,
        label: 'Cycle 1',
        system_of_record: 'spokchoice',
        payroll_date: '2026-03-01',
        records_compared: 100,
        accuracy: 99.8,
        critical_exceptions: 0,
        export_batch_ids: [],
      },
      {
        child_id: childId,
        label: 'Cycle 2',
        system_of_record: 'spokchoice',
        payroll_date: '2026-03-08',
        records_compared: 120,
        accuracy: 99.7,
        critical_exceptions: 0,
        export_batch_ids: [],
      },
      {
        child_id: childId,
        label: 'Cycle 3',
        system_of_record: 'dci',
        payroll_date: '2026-03-15',
        records_compared: 140,
        accuracy: 99.9,
        critical_exceptions: 0,
        export_batch_ids: [],
      },
    ]);

    await insertRows('cr_sync_log', [
      {
        user_id: user.id,
        child_id: childId,
        data_type: 'sessions',
        direction: 'pull',
        status: 'success',
        records_processed: 5,
        records_failed: 0,
        error_message: null,
        error_code: null,
        duration_ms: 900,
        sync_metadata: { source: 'centralreach', proof: true },
        completed_at: new Date().toISOString(),
      },
      {
        user_id: user.id,
        child_id: childId,
        data_type: 'goals',
        direction: 'pull',
        status: 'success',
        records_processed: 8,
        records_failed: 0,
        error_message: null,
        error_code: null,
        duration_ms: 1200,
        sync_metadata: { source: 'centralreach', proof: true },
        completed_at: new Date().toISOString(),
      },
      {
        user_id: user.id,
        child_id: childId,
        data_type: 'insurance',
        direction: 'pull',
        status: 'success',
        records_processed: 2,
        records_failed: 0,
        error_message: null,
        error_code: null,
        duration_ms: 1000,
        sync_metadata: { source: 'centralreach', proof: true },
        completed_at: new Date().toISOString(),
      },
      {
        user_id: user.id,
        child_id: childId,
        data_type: 'auth_status',
        direction: 'pull',
        status: 'success',
        records_processed: 2,
        records_failed: 0,
        error_message: null,
        error_code: null,
        duration_ms: 1000,
        sync_metadata: { source: 'centralreach', proof: true },
        completed_at: new Date().toISOString(),
      },
      {
        user_id: user.id,
        child_id: childId,
        data_type: 'routine_completions',
        direction: 'push',
        status: 'error',
        records_processed: 3,
        records_failed: 1,
        error_message: 'Proof retry required for routine export.',
        error_code: 'CR_PUSH_RETRY',
        duration_ms: 1800,
        sync_metadata: { source: 'aminy', proof: true },
        completed_at: new Date().toISOString(),
      },
    ]);

    const failedLog = await fetchSingle(
      'cr_sync_log',
      {
        user_id: `eq.${user.id}`,
        data_type: 'eq.routine_completions',
        direction: 'eq.push',
        status: 'eq.error',
      },
      'id',
    );

    await insertRows('cr_sync_errors', [
      {
        user_id: user.id,
        sync_log_id: String(failedLog?.id),
        data_type: 'routine_completions',
        direction: 'push',
        record_id: `routine-proof-${runId}`,
        error_code: 'CR_PUSH_RETRY',
        error_message: 'Routine export needs a retry before reconciliation can close.',
        retry_count: 1,
        max_retries: 3,
        next_retry_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        resolved: false,
      },
    ]);

    await dismissPaywallIfVisible(page);
    await page.goto('/?screen=payer-dashboard', { waitUntil: 'networkidle' });
    await page.getByRole('tab', { name: 'Claims Ops' }).click();

    console.log('operator-proof: claims-dashboard');
    await expect(page.getByRole('heading', { name: 'Claim-Ready Queue' })).toBeVisible({ timeout: 20000 });
    await expect(page.getByText(claimPatients.ready)).toBeVisible();
    await expect(page.getByText(claimPatients.blocked)).toBeVisible();
    await expect(page.getByText(claimPatients.submitted)).toBeVisible();
    await expect(page.getByText(claimPatients.denied)).toBeVisible();

    console.log('operator-proof: evv-dashboard');
    await navigateToScreen(page, 'evv-dashboard');
    await expect(page.getByText('Ready for primary EVV cutover')).toBeVisible({ timeout: 20000 });
    await expect(page.getByText('99.8%')).toBeVisible();

    console.log('operator-proof: cr-sync');
    await navigateToScreen(page, 'cr-sync');
    await expect.poll(async () => page.evaluate(() => document.body.innerText), { timeout: 20000 }).toContain('Sync Dashboard');
    const refreshButton = page.getByRole('button', { name: 'Refresh dashboard' });
    if (await refreshButton.isVisible().catch(() => false)) {
      await refreshButton.click();
    }
    await expect.poll(async () => page.evaluate(() => document.body.innerText), { timeout: 20000 }).toContain('Clinic Workflow Proof');
    await expect.poll(async () => page.evaluate(() => document.body.innerText), { timeout: 20000 }).toContain('Needs review');
    await expect.poll(async () => page.evaluate(() => document.body.innerText), { timeout: 20000 }).toContain('Operator Reconciliation Queue');
    await expect.poll(async () => page.evaluate(() => document.body.innerText), { timeout: 20000 }).toContain('1 jobs need review');
    await expect.poll(async () => page.evaluate(() => document.body.innerText), { timeout: 20000 }).toContain('Routine Completions');
    await expect.poll(async () => page.evaluate(() => document.body.innerText), { timeout: 20000 }).toContain('Retry required');
  });
});
