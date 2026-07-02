import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const OUT = '/tmp/claude-0/-home-user-Aminy-Final/9f362c82-800d-52d6-9e73-87548098b442/scratchpad/fixed4';
mkdirSync(OUT, { recursive: true });

const SCREENS = [
  'parent-approval',
  'parent-intake',
  'profile',
  'wins-journal',
  'vault',
  'referral-dashboard',
  'resource-library',
  'share-viewer',
  'reset-password',
  'outcomes',
];

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});
const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
page.on('pageerror', (e) => console.log('PAGEERROR:', e.message.slice(0, 200)));

await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(4000);
// Clear intake draft so parent-intake shows pristine step 1 (disabled Continue)
await page.evaluate(() => localStorage.removeItem('aminy_intake_progress'));

for (const s of SCREENS) {
  try {
    const ok = await page.evaluate((name) => {
      if (typeof window.__navigateToScreen !== 'function') return false;
      window.__navigateToScreen(name);
      return true;
    }, s);
    if (!ok) {
      console.log(`SKIP ${s}: __navigateToScreen unavailable`);
      continue;
    }
    await page.waitForTimeout(2200);
    await page.screenshot({ path: `${OUT}/${s}.png` });
    console.log(`OK ${s}`);
  } catch (e) {
    console.log(`FAIL ${s}: ${e.message.slice(0, 150)}`);
  }
}

await browser.close();
console.log('done');
