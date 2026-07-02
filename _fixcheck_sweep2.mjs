import { chromium } from 'playwright';
import fs from 'node:fs';

const OUT = '/tmp/claude-0/-home-user-Aminy-Final/9f362c82-800d-52d6-9e73-87548098b442/scratchpad/fixed2';
fs.mkdirSync(OUT, { recursive: true });

const screens = [
  'ask-aminy',
  'calm-tools',
  'analytics-charts',
  'account-settings',
  'benefits',
  'aact-partner-setup',
  'bcba-portal',
  'caregivers',
];

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});
const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));

await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => typeof window.__navigateToScreen === 'function', { timeout: 30000 });
await page.waitForTimeout(2500);

// Dismiss cookie banner if present
const essential = page.getByRole('button', { name: /essential only/i });
if (await essential.count()) await essential.first().click().catch(() => {});
await page.waitForTimeout(500);

for (const screen of screens) {
  await page.evaluate((s) => window.__navigateToScreen(s), screen);
  // let data fetches settle / abort-timeouts fire where relevant
  await page.waitForTimeout(screen === 'bcba-portal' || screen === 'aact-partner-setup' ? 9500 : 2500);
  await page.screenshot({ path: `${OUT}/${screen}.png`, fullPage: false });
  console.log('captured', screen);
}

// extra: benefits "Your Coverage" section (scrolled)
await page.evaluate((s) => window.__navigateToScreen(s), 'benefits');
await page.waitForTimeout(2000);
await page.evaluate(() => window.scrollTo(0, 700));
await page.waitForTimeout(600);
await page.screenshot({ path: `${OUT}/benefits-coverage.png` });
console.log('captured benefits-coverage');

// extra: calm-tools scrolled to see remaining cards
await page.evaluate((s) => window.__navigateToScreen(s), 'calm-tools');
await page.waitForTimeout(2000);
await page.evaluate(() => window.scrollTo(0, 600));
await page.waitForTimeout(600);
await page.screenshot({ path: `${OUT}/calm-tools-scrolled.png` });
console.log('captured calm-tools-scrolled');

// extra: bcba-portal scrolled to Your Families empty state
await page.evaluate((s) => window.__navigateToScreen(s), 'bcba-portal');
await page.waitForTimeout(9500);
await page.evaluate(() => window.scrollTo(0, 700));
await page.waitForTimeout(600);
await page.screenshot({ path: `${OUT}/bcba-portal-families.png` });
console.log('captured bcba-portal-families');

await browser.close();
console.log('done');
