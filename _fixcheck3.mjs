// Visual verification of design-fix sweep — deleted after use.
import { chromium } from 'playwright';

const OUT = '/tmp/claude-0/-home-user-Aminy-Final/9f362c82-800d-52d6-9e73-87548098b442/scratchpad/fixed3';
const SCREENS = [
  'grant-navigator',
  'group-sessions',
  'impact-metrics',
  'join',
  'login',
  'marketplace',
  'medications',
  'memory-settings',
  'mfa-enrollment',
  'mfa-verification',
];

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});
const page = await browser.newPage({ viewport: { width: 375, height: 812 } });

page.on('pageerror', e => console.log('PAGEERROR:', e.message.slice(0, 200)));

await page.goto('http://localhost:3000/', { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(3000);

for (const screen of SCREENS) {
  try {
    await page.evaluate(s => window.__navigateToScreen(s), screen);
    await page.waitForTimeout(2500);
    await page.screenshot({ path: `${OUT}/${screen}.png` });
    console.log('OK', screen);
  } catch (e) {
    console.log('FAIL', screen, e.message.slice(0, 150));
  }
}

await browser.close();
