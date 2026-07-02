import { chromium } from 'playwright';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(4000);
await page.evaluate(() => window.__navigateToScreen('profile'));
await page.waitForTimeout(2000);
const client = await page.context().newCDPSession(page);
await client.send('DOM.enable');
await client.send('CSS.enable');
const { root } = await client.send('DOM.getDocument');
const handle = await page.evaluateHandle(() => {
  const btns = [...document.querySelectorAll('button')];
  return btns.find(b => b.querySelector('svg.lucide-camera'));
});
const remote = handle.remoteObject ? handle.remoteObject() : handle._remoteObject;
const { nodeId } = await client.send('DOM.requestNode', { objectId: remote.objectId });
const { matchedCSSRules } = await client.send('CSS.getMatchedStylesForNode', { nodeId });
for (const m of matchedCSSRules) {
  const props = m.rule.style.cssProperties.filter(p => p.name === 'position');
  if (props.length) {
    console.log('SELECTOR:', m.rule.selectorList.text, '->', props.map(p=>`${p.name}:${p.value}`).join(','), '| origin:', m.rule.origin, '| styleSheet:', m.rule.styleSheetId);
  }
}
await browser.close();
