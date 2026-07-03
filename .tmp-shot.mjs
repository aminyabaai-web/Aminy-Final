import { chromium } from "@playwright/test";
const OUT = '/tmp/claude-0/-home-user-Aminy-Final/9f362c82-800d-52d6-9e73-87548098b442/scratchpad';
const base = 'http://localhost:5173';
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const ctx = await b.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2 });
const p = await ctx.newPage();
const errs = [];
p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
await p.goto(base, { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(3500);
// dismiss cookie banner
try { await p.getByRole('button', { name: /Accept all/i }).click({ timeout: 3000 }); await p.waitForTimeout(500); } catch {}
async function nav(s){ await p.evaluate(x=>window.__navigateToScreen && window.__navigateToScreen(x), s); await p.waitForTimeout(1800); }
await nav('calm-tools');
try { await p.getByRole('button', { name: /Accessibility settings/i }).click({ timeout: 3000 }); await p.waitForTimeout(700);
  await p.screenshot({ path: `${OUT}/calm-tools-settings.png` }); } catch(e){ console.log('settings fail', e.message); }
try { await p.getByRole('button', { name: /Breathe Glow/i }).click({ timeout: 3000 }); await p.waitForTimeout(2600);
  await p.screenshot({ path: `${OUT}/calm-tools-breathe.png` }); } catch(e){ console.log('breathe fail', e.message); }
console.log('ERRORS', errs.length); errs.slice(0,15).forEach(e=>console.log(' -',e));
await b.close();
