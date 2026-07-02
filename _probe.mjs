import { chromium } from 'playwright';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(4000);
await page.evaluate(() => window.__navigateToScreen('profile'));
await page.waitForTimeout(2000);
const hits = await page.evaluate(() => {
  const cam = [...document.querySelectorAll('button')].find(b => b.querySelector('svg.lucide-camera'));
  const out = [];
  const walk = (list) => {
    for (const r of list) {
      if (r.cssRules && r.cssRules.length) { walk(r.cssRules); continue; }
      if (r.selectorText && r.style && r.style.position) {
        try {
          if (cam.matches(r.selectorText)) {
            out.push({ sel: r.selectorText.slice(0, 160), pos: r.style.position, important: r.style.getPropertyPriority('position') });
          }
        } catch { /* invalid selector for matches */ }
      }
    }
  };
  for (const sheet of document.styleSheets) {
    let rules; try { rules = sheet.cssRules; } catch { continue; }
    walk(rules);
  }
  return out;
});
console.log(JSON.stringify(hits, null, 2));
await browser.close();
