// Login fold measurement — deleted after use.
import { chromium } from 'playwright';

const OUT = '/tmp/claude-0/-home-user-Aminy-Final/9f362c82-800d-52d6-9e73-87548098b442/scratchpad/fixed3';

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});
const page = await browser.newPage({ viewport: { width: 375, height: 812 } });

await page.goto('http://localhost:3000/', { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(2500);

// Dismiss cookie banner if present
const consent = page.getByRole('button', { name: /essential only/i });
if (await consent.count()) {
  await consent.first().click();
  await page.waitForTimeout(500);
}

await page.evaluate(() => window.__navigateToScreen('login'));
await page.waitForTimeout(2500);

const box = await page.locator('button[type="submit"]').boundingBox();
console.log('Sign in button box:', JSON.stringify(box));
console.log('Fully visible at 812:', box && box.y + box.height <= 812);

await page.screenshot({ path: `${OUT}/login.png` });
await browser.close();
