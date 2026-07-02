import { chromium } from '@playwright/test';

const OUT = '/tmp/claude-0/-home-user-Aminy-Final/9f362c82-800d-52d6-9e73-87548098b442/scratchpad/fixed';
const screens = [
  { name: 'dashboard', file: 'dashboard.png' },
  { name: 'crisis-resources', file: 'crisis-resources.png' },
  { name: 'community-hub', file: 'community-hub.png' },
  { name: 'credentialing-support', file: 'credentialing-support.png' },
  { name: 'forgot-password', file: 'forgot-password.png' },
];

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});
const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => typeof window.__navigateToScreen === 'function', { timeout: 30000 });
await page.waitForTimeout(2500);

for (const s of screens) {
  await page.evaluate((n) => window.__navigateToScreen(n), s.name);
  await page.waitForTimeout(3000);
  await page.screenshot({ path: `${OUT}/${s.file}` });
  if (s.name === 'dashboard') {
    // scroll to the bottom to verify schedule row clears the fixed bottom nav
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${OUT}/dashboard-bottom.png` });
    await page.evaluate(() => window.scrollTo(0, 0));
  }
  if (s.name === 'community-hub') {
    // scroll the tab row to its end to prove it scrolls and Ask-a-Behaviorist is reachable
    await page.evaluate(() => {
      const rows = [...document.querySelectorAll('div.overflow-x-auto')];
      for (const r of rows) r.scrollLeft = r.scrollWidth;
    });
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${OUT}/community-hub-tabs-scrolled.png` });
  }
  if (s.name === 'credentialing-support') {
    await page.evaluate(() => {
      const rows = [...document.querySelectorAll('div.overflow-x-auto')];
      for (const r of rows) r.scrollLeft = r.scrollWidth;
    });
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${OUT}/credentialing-support-tabs-scrolled.png` });
  }
  if (s.name === 'crisis-resources') {
    await page.evaluate(() => {
      const rows = [...document.querySelectorAll('div.overflow-x-auto')];
      for (const r of rows) r.scrollLeft = r.scrollWidth;
    });
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${OUT}/crisis-resources-tabs-scrolled.png` });
  }
}

await browser.close();
console.log('done');
