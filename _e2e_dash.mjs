import { chromium } from '@playwright/test';
const OUT = '/tmp/claude-0/-home-user-Aminy-Final/9f362c82-800d-52d6-9e73-87548098b442/scratchpad/live';

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  proxy: { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' },
});
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, ignoreHTTPSErrors: true });
await context.route('**://*.supabase.co/**', async (route) => {
  try {
    const resp = await context.request.fetch(route.request(), { ignoreHTTPSErrors: true, timeout: 45000 });
    const body = await resp.body();
    if (resp.status() >= 400 && route.request().method() !== 'GET') {
      console.log('4XX:', resp.status(), route.request().method(), route.request().url().split('.co')[1]?.slice(0, 70));
      console.log('  REQ:', (route.request().postData() || '').slice(0, 200));
      console.log('  RESP:', body.toString().slice(0, 250));
    }
    await route.fulfill({ status: resp.status(), headers: resp.headers(), body });
  } catch (e) { await route.abort(); }
});
const page = await context.newPage();
page.on('console', (m) => { if (m.type() === 'error' || /error|failed/i.test(m.text())) console.log('CON:', m.text().slice(0, 220)); });
await page.goto('http://localhost:3000/', { waitUntil: 'networkidle', timeout: 45000 });
await page.waitForTimeout(1500);
try { await page.getByText('Accept all').click({ timeout: 2500 }); } catch {}
await page.evaluate(() => window.__navigateToScreen('login'));
await page.waitForTimeout(1000);
await page.locator('input[type="email"]').fill('edgar.staren+aminytest1@gmail.com');
await page.locator('input[type="password"]').fill('AminyDemo!2026#Test');
await page.getByRole('button', { name: /^Sign in$/i }).click();
await page.waitForTimeout(7000);

const text0 = await page.evaluate(() => document.body.innerText);
if (/Setting up your profile/i.test(text0)) {
  const answers = [
    'Kai',
    '6 years',
    'Meltdowns during transitions, especially mornings and leaving the playground',
    'Autism',
    'No services yet',
  ];
  for (const ans of answers) {
    const input = page.locator('input:visible').last();
    await input.fill(ans);
    await input.press('Enter');
    await page.waitForTimeout(2500);
  }
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/23-onboarding-complete.png` });
  await page.getByRole('button', { name: /Let's go/i }).click({ timeout: 8000 });
  await page.waitForTimeout(15000);
}
await page.screenshot({ path: `${OUT}/24-dashboard-desktop.png`, fullPage: false });
const body = await page.evaluate(() => document.body.innerText.slice(0, 350));
console.log('FINAL:', body.replace(/\n+/g, ' | ').slice(0, 330));
await context.storageState({ path: `${OUT}/auth-state.json` });
await browser.close();
console.log('DONE');
