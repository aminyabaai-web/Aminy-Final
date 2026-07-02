import { chromium } from '@playwright/test';
const OUT = '/tmp/claude-0/-home-user-Aminy-Final/9f362c82-800d-52d6-9e73-87548098b442/scratchpad/live';
const EMAIL = 'edgar.staren+aminytest1@gmail.com';
const PASS = 'AminyDemo!2026#Test';

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  proxy: { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' },
});
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, ignoreHTTPSErrors: true });
await context.route('**://*.supabase.co/**', async (route) => {
  try {
    const resp = await context.request.fetch(route.request(), { ignoreHTTPSErrors: true, timeout: 45000 });
    await route.fulfill({ status: resp.status(), headers: resp.headers(), body: await resp.body() });
  } catch (e) { await route.abort(); }
});
const page = await context.newPage();

// LOGIN
await page.goto('http://localhost:3000/', { waitUntil: 'networkidle', timeout: 45000 });
await page.waitForTimeout(1200);
try { await page.getByText('Accept all').click({ timeout: 2500 }); } catch {}
await page.evaluate(() => window.__navigateToScreen('login'));
await page.waitForTimeout(1000);
await page.locator('input[type="email"]').fill(EMAIL);
await page.locator('input[type="password"]').fill(PASS);
await page.getByRole('button', { name: /^Sign in$/i }).click();
await page.waitForTimeout(6000);
await page.screenshot({ path: `${OUT}/10-after-login.png` });
let body = await page.evaluate(() => document.body.innerText.slice(0, 400));
console.log('AFTER LOGIN:\n', body.replace(/\n+/g, ' | ').slice(0, 350));

// If we're in onboarding, answer the conversational steps
for (let step = 0; step < 8; step++) {
  const text = await page.evaluate(() => document.body.innerText);
  if (!/Step \d of 5|child's name|Setting up your profile/i.test(text)) break;
  const input = page.locator('input:visible, textarea:visible').last();
  const answers = ['Kai', '6', 'Autism', 'Meltdowns during transitions', 'Calmer mornings'];
  const q = text.slice(-400);
  let ans = answers[Math.min(step, 4)];
  if (/how old|age/i.test(q)) ans = '6';
  else if (/diagnos|condition/i.test(q)) ans = 'Autism';
  else if (/challenge|struggle|hardest|concern/i.test(q)) ans = 'Meltdowns during transitions';
  else if (/goal|hope|success|90 day/i.test(q)) ans = 'Calmer mornings';
  else if (/name/i.test(q)) ans = 'Kai';
  try {
    await input.fill(ans);
    await input.press('Enter');
  } catch {
    // maybe multiple-choice buttons
    const btn = page.getByRole('button').filter({ hasText: /continue|next|that's right|sounds good/i }).first();
    try { await btn.click({ timeout: 2000 }); } catch {}
  }
  await page.waitForTimeout(4500);
  await page.screenshot({ path: `${OUT}/11-onboarding-step${step}.png` });
  console.log(`step ${step} answered: ${ans}`);
}

await page.waitForTimeout(3000);
await page.screenshot({ path: `${OUT}/12-post-onboarding.png`, fullPage: false });
body = await page.evaluate(() => document.body.innerText.slice(0, 300));
console.log('POST-ONBOARDING:\n', body.replace(/\n+/g, ' | ').slice(0, 280));

// Save session for reuse
await context.storageState({ path: `${OUT}/auth-state.json` });
await browser.close();
console.log('DONE');
