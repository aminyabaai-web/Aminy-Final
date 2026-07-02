import { chromium } from 'playwright';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
page.on('console', m => { const t = m.text(); if (!/vite|Download the React DevTools/i.test(t)) console.log('[console]', t.slice(0,200)); });
page.on('requestfinished', async r => { if (r.url().includes('coach/families')) console.log('[net-finished]', r.url(), (await r.response())?.status()); });
page.on('requestfailed', r => { if (r.url().includes('coach/families')) console.log('[net-failed]', r.url(), r.failure()?.errorText); });
await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => typeof window.__navigateToScreen === 'function', { timeout: 30000 });
await page.waitForTimeout(2000);
await page.evaluate(() => window.__navigateToScreen('bcba-portal'));
for (const s of [3, 8, 12, 20]) {
  await page.waitForTimeout(s === 3 ? 3000 : 5000);
  const spinner = await page.locator('.animate-spin').count();
  const empty = await page.getByText('No families assigned yet').count();
  console.log(`t=${s}s spinner=${spinner} emptyState=${empty}`);
}
await browser.close();
