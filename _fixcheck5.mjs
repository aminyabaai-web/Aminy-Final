import { chromium } from 'playwright';
const OUT = '/tmp/claude-0/-home-user-Aminy-Final/9f362c82-800d-52d6-9e73-87548098b442/scratchpad/fixed5';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
await page.goto('http://localhost:3000', { waitUntil: 'networkidle' }).catch(() => {});
await page.waitForFunction(() => typeof window.__navigateToScreen === 'function', { timeout: 20000 });
// dismiss cookie banner if present
const btn = page.getByRole('button', { name: 'Essential only' });
if (await btn.isVisible().catch(() => false)) await btn.click();
await page.evaluate(() => window.__navigateToScreen('provider-payout-setup'));
await page.waitForTimeout(2500);
await page.evaluate(() => { const el = document.querySelector('main'); (el ?? window).scrollTo?.(0, 400); window.scrollTo(0, 400); });
await page.waitForTimeout(600);
await page.screenshot({ path: `${OUT}/provider-payout-setup-schedule.png` });
console.log('done');
await browser.close();
