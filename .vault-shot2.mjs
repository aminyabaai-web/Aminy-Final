import { chromium } from '@playwright/test';
const OUT = '/tmp/claude-0/-home-user-Aminy-Final/9f362c82-800d-52d6-9e73-87548098b442/scratchpad';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
await page.goto('http://localhost:3001/');
await page.waitForFunction(() => typeof window.__navigateToScreen === 'function', { timeout: 15000 });
await page.evaluate(() => window.__navigateToScreen?.('vault'));
await page.waitForTimeout(1200);

// Open the Add Record sheet (forced — motion/react animation frames keep the button "unstable")
await page.getByRole('button', { name: /add your first record/i }).click({ force: true, timeout: 5000 }).catch(async () => {
  await page.getByRole('button', { name: /add record/i }).first().click({ force: true, timeout: 5000 });
});
await page.waitForSelector('[data-testid="vault-dropzone"]', { timeout: 8000 });
await page.waitForTimeout(700);
await page.screenshot({ path: `${OUT}/vault-2-sheet.png` });

const zone = page.getByTestId('vault-dropzone');
await zone.scrollIntoViewIfNeeded().catch(() => {});
await page.waitForTimeout(300);
await page.screenshot({ path: `${OUT}/vault-3-dropzone.png` });

const attrs = await page.evaluate(() => {
  const cam = document.querySelector('[data-testid="vault-camera-input"]');
  const file = document.querySelector('[data-testid="vault-file-input"]');
  return {
    camera: cam ? { accept: cam.getAttribute('accept'), capture: cam.getAttribute('capture') } : null,
    file: file ? { accept: file.getAttribute('accept'), multiple: file.hasAttribute('multiple') } : null,
  };
});
console.log(JSON.stringify(attrs));
for (const id of ['vault-take-photo', 'vault-choose-file']) {
  const box = await page.getByTestId(id).boundingBox();
  console.log(id, box ? `${Math.round(box.width)}x${Math.round(box.height)}` : 'not visible');
}
await browser.close();
