import { chromium } from '@playwright/test';

const OUT = '/tmp/claude-0/-home-user-Aminy-Final/9f362c82-800d-52d6-9e73-87548098b442/scratchpad/fixed';
const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});
const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => typeof window.__navigateToScreen === 'function', { timeout: 30000 });
await page.waitForTimeout(2000);

// Dismiss cookie banner
const essential = page.getByRole('button', { name: /essential only/i });
if (await essential.count()) await essential.first().click().catch(() => {});
await page.waitForTimeout(500);

await page.evaluate(() => window.__navigateToScreen('dashboard'));
await page.waitForTimeout(3000);

// Scroll every plausible scroller to the bottom
await page.mouse.move(187, 400);
for (let i = 0; i < 12; i++) {
  await page.mouse.wheel(0, 600);
  await page.waitForTimeout(150);
}
await page.waitForTimeout(1000);
await page.screenshot({ path: `${OUT}/dashboard-bottom.png` });
await browser.close();
console.log('done');
