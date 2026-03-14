
const { chromium } = require("playwright");
const setups = {
  provider: { id:'test-provider-001', userId:'test-provider-001', parentName:'Dr. Test Provider', name:'Dr. Test Provider', childName:'Alex', childAge:8, childId:'11111111-1111-1111-1111-111111111111', activeChildId:'11111111-1111-1111-1111-111111111111', relationship:'provider', state:'AZ', email:'provider@example.com', hasCompletedOnboarding:true, tier:'pro', role:'provider', pilotEligible:true, pilotOrganization:'aact', pilotPayers:['bcba_of_az','mercycare'] },
  admin: { id:'test-admin-001', userId:'test-admin-001', parentName:'Admin User', name:'Admin User', childName:'Alex', childAge:8, childId:'11111111-1111-1111-1111-111111111111', activeChildId:'11111111-1111-1111-1111-111111111111', relationship:'admin', state:'AZ', email:'admin@example.com', hasCompletedOnboarding:true, tier:'pro', role:'admin', pilotEligible:true, pilotOrganization:'aact', pilotPayers:['bcba_of_az','mercycare'] },
};
(async() => {
  const browser = await chromium.launch({ headless: true });
  const pages = [
    { name: 'Provider Onboarding', path: 'http://127.0.0.1:4175/?screen=provider-onboarding&pilotState=AZ&pilotRole=provider&pilot=true&pilotOrg=aact', auth: 'provider' },
    { name: 'CentralReach Sync', path: 'http://127.0.0.1:4175/?screen=cr-sync&pilotState=AZ&pilotRole=admin&pilot=true&pilotOrg=aact', auth: 'admin' },
  ];
  for (const pageDef of pages) {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.addInitScript((data) => {
      localStorage.setItem('aminy-user', JSON.stringify(data));
    }, setups[pageDef.auth]);
    await page.goto(pageDef.path, { waitUntil: 'networkidle' });
    const small = await page.evaluate(() => {
      const items = [];
      document.querySelectorAll('button, a, [role="button"]').forEach((el, i) => {
        if (el.offsetParent !== null) {
          const rect = el.getBoundingClientRect();
          if (rect.width < 44 || rect.height < 44) {
            items.push({
              index: i,
              tag: el.tagName.toLowerCase(),
              text: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 80),
              aria: el.getAttribute('aria-label') || '',
              className: String(el.className).slice(0, 200),
              width: Math.round(rect.width),
              height: Math.round(rect.height),
            });
          }
        }
      });
      return items;
    });
    console.log(`\n## ${pageDef.name}`);
    console.log(JSON.stringify(small, null, 2));
    await context.close();
  }
  await browser.close();
})();
