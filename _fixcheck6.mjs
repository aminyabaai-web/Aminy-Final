// Temporary visual-check script — delete after use.
import { chromium } from 'playwright';
import fs from 'node:fs';

const OUT = '/tmp/claude-0/-home-user-Aminy-Final/9f362c82-800d-52d6-9e73-87548098b442/scratchpad/fixed6';
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});
const page = await browser.newPage({ viewport: { width: 375, height: 812 } });

page.on('console', (m) => {
  if (m.type() === 'error') console.log('[console.error]', m.text().slice(0, 200));
});

await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
await page.waitForTimeout(2500);

async function nav(screen, file, extra) {
  await page.evaluate((s) => window.__navigateToScreen?.(s), screen);
  await page.waitForTimeout(2000);
  if (extra) await extra();
  await page.screenshot({ path: `${OUT}/${file}.png`, fullPage: false });
  console.log('captured', file);
}

// 1. Settings — scroll to the AI Personality card
await nav('settings', 'settings-personality', async () => {
  const el = await page.getByText('Aminy AI Personality').first();
  if (await el.count?.() !== 0) {
    try { await el.scrollIntoViewIfNeeded(); await page.waitForTimeout(500); } catch {}
  }
});

// 2. Paywall — scroll so a "Current Plan" button is visible
await nav('paywall', 'paywall-current-plan', async () => {
  try {
    const btn = page.getByRole('button', { name: 'Current Plan' }).first();
    await btn.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
  } catch (e) { console.log('current-plan scroll skipped:', String(e).slice(0, 120)); }
});

// 3. Care plan
await nav('care-plan', 'care-plan');
// scroll down to catch the coaching card too
await page.mouse.wheel(0, 500);
await page.waitForTimeout(600);
await page.screenshot({ path: `${OUT}/care-plan-scrolled.png` });
console.log('captured care-plan-scrolled');

// 4. Store
await nav('store', 'store');
await page.mouse.wheel(0, 700);
await page.waitForTimeout(600);
await page.screenshot({ path: `${OUT}/store-scrolled.png` });
console.log('captured store-scrolled');

await browser.close();
console.log('done');
