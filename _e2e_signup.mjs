import { chromium } from '@playwright/test';
const OUT = '/tmp/claude-0/-home-user-Aminy-Final/9f362c82-800d-52d6-9e73-87548098b442/scratchpad/live';
const EMAIL = 'edgar.staren+aminytest1@gmail.com';
const PASS = 'AminyDemo!2026#Test';

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on('pageerror', (e) => console.log('PAGEERROR:', String(e).slice(0, 150)));

await page.goto('http://localhost:3000/', { waitUntil: 'networkidle', timeout: 45000 });
await page.waitForTimeout(1500);
try { await page.getByText('Accept all').click({ timeout: 2500 }); } catch {}
await page.evaluate(() => { if (window.__navigateToScreen) window.__navigateToScreen('create-account'); });
await page.waitForTimeout(1500);
await page.screenshot({ path: `${OUT}/01-create-account.png` });

const form = await page.evaluate(() => {
  const inputs = [...document.querySelectorAll('input')].map(i => ({ type: i.type, placeholder: i.placeholder }));
  const buttons = [...document.querySelectorAll('button')].map(b => (b.textContent || '').trim()).filter(Boolean).slice(0, 15);
  return { inputs, buttons };
});
console.log(JSON.stringify(form, null, 1));
await browser.close();
