import { chromium } from '@playwright/test';
const OUT = '/tmp/claude-0/-home-user-Aminy-Final/9f362c82-800d-52d6-9e73-87548098b442/scratchpad/live';
const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  proxy: { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' },
});
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, ignoreHTTPSErrors: true, storageState: `${OUT}/auth-state.json` });
await context.route('**://*.supabase.co/**', async (route) => {
  try { const resp = await context.request.fetch(route.request(), { ignoreHTTPSErrors: true, timeout: 45000 }); await route.fulfill({ status: resp.status(), headers: resp.headers(), body: await resp.body() }); }
  catch { await route.abort(); }
});
const page = await context.newPage();
await page.goto('http://localhost:3000/', { waitUntil: 'networkidle', timeout: 45000 });
await page.waitForTimeout(5000);

const diag = await page.evaluate(() => {
  const out = {};
  // 1. Side nav icon chip
  const chip = document.querySelector('nav[aria-label="Desktop navigation"] button div');
  if (chip) {
    const svg = chip.querySelector('svg');
    out.iconChip = {
      chipClass: chip.className,
      chipSize: `${chip.getBoundingClientRect().width}x${chip.getBoundingClientRect().height}`,
      hasSvg: !!svg,
      svgSize: svg ? `${svg.getBoundingClientRect().width}x${svg.getBoundingClientRect().height}` : null,
      svgColor: svg ? getComputedStyle(svg).color : null,
      svgStroke: svg ? svg.getAttribute('stroke') : null,
      svgDisplay: svg ? getComputedStyle(svg).display : null,
      svgVisibility: svg ? getComputedStyle(svg).visibility : null,
    };
  }
  // 2. Right pane: find main content boxes
  const main = document.querySelector('main#main');
  if (main) {
    out.mainChildCount = main.children.length;
    out.mainText = (main.innerText || '').slice(0, 300);
    // find first "card-looking" empty element
    const cards = [...main.querySelectorAll('div')].filter(d => {
      const r = d.getBoundingClientRect();
      const cs = getComputedStyle(d);
      return r.width > 150 && r.height > 60 && cs.backgroundColor === 'rgb(255, 255, 255)' && !d.innerText.trim();
    }).slice(0, 2);
    out.emptyCards = cards.map(c => ({
      class: c.className.slice(0, 120),
      html: c.innerHTML.slice(0, 250),
      size: `${Math.round(c.getBoundingClientRect().width)}x${Math.round(c.getBoundingClientRect().height)}`,
    }));
  }
  return out;
});
console.log(JSON.stringify(diag, null, 1));
await browser.close();
