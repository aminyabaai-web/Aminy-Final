import { chromium } from '@playwright/test';
const OUT = '/tmp/claude-0/-home-user-Aminy-Final/9f362c82-800d-52d6-9e73-87548098b442/scratchpad/live';
const EMAIL = 'edgar.staren+aminytest1@gmail.com';
const PASS = 'AminyDemo!2026#Test';

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  proxy: { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' },
});
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, ignoreHTTPSErrors: true });
await context.route('**://*.supabase.co/**', async (route) => {
  try {
    const resp = await context.request.fetch(route.request(), { ignoreHTTPSErrors: true, timeout: 30000 });
    await route.fulfill({ status: resp.status(), headers: resp.headers(), body: await resp.body() });
  } catch (e) { console.log('RELAY FAIL:', route.request().url().slice(0,80)); await route.abort(); }
});
const page = await context.newPage();
page.on('pageerror', (e) => console.log('PAGEERROR:', String(e).slice(0, 150)));
page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE-ERR:', m.text().slice(0, 150)); });

await page.goto('http://localhost:3000/', { waitUntil: 'networkidle', timeout: 45000 });
await page.waitForTimeout(1200);
try { await page.getByText('Accept all').click({ timeout: 2500 }); } catch {}
await page.evaluate(() => window.__navigateToScreen('create-account'));
await page.waitForTimeout(1200);

await page.getByPlaceholder('Your name').fill('Demo Parent');
await page.getByPlaceholder('you@example.com').fill(EMAIL);
await page.getByPlaceholder('At least 8 characters').fill(PASS);
await page.getByPlaceholder('Re-enter password').fill(PASS);
// Custom div checkbox — toggled by clicking the consent label text
try { await page.getByText('I am 18+ and the parent', { exact: false }).click({ timeout: 3000, position: { x: 5, y: 5 } }); console.log('consent clicked'); } catch (e) { console.log('consent click failed:', String(e).slice(0,80)); }
// Probe supabase reachability from the page context
const probe = await page.evaluate(async () => {
  try {
    const r = await fetch('https://qpzsvafwcwyrkdolrjbu.supabase.co/auth/v1/health', { method: 'GET' });
    return 'supabase reachable: ' + r.status;
  } catch (e) { return 'supabase UNREACHABLE: ' + String(e).slice(0, 100); }
});
console.log(probe);
await page.screenshot({ path: `${OUT}/02-filled.png` });
await page.getByRole('button', { name: 'Create account', exact: true }).click();
await page.waitForTimeout(6000);
await page.screenshot({ path: `${OUT}/03-after-submit.png` });
const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 600));
console.log('AFTER SUBMIT:\n', bodyText);
await browser.close();
