import { chromium } from '@playwright/test';
const OUT = '/tmp/claude-0/-home-user-Aminy-Final/9f362c82-800d-52d6-9e73-87548098b442/scratchpad';
const EXE = '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell';
const browser = await chromium.launch({ executablePath: EXE });
const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
await page.goto('http://localhost:3000/?demo=true', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(2500);
await page.waitForFunction(() => typeof window.__navigateToScreen === 'function', { timeout: 30000 });
await page.evaluate(() => window.__navigateToScreen('outcomes-story'));
await page.waitForTimeout(2500);
async function shot(name) {
  const el = page.locator('section', { hasText: 'Weekly check-in trend' }).first();
  await el.scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  await el.screenshot({ path: `${OUT}/chart-${name}.png` });
  // also behavior chart
  const b = page.locator('section', { hasText: 'logged each week' }).first();
  if (await b.count()) { await b.scrollIntoViewIfNeeded(); await page.waitForTimeout(300); await b.screenshot({ path: `${OUT}/behavior-${name}.png` }); }
}
await page.evaluate(() => document.documentElement.classList.remove('dark'));
await page.waitForTimeout(300);
await shot('light');
await page.evaluate(() => document.documentElement.classList.add('dark'));
await page.waitForTimeout(400);
await shot('dark');
console.log('done');
await browser.close();
