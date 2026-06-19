const { chromium } = require('playwright');
const fs = require('fs');

const screens = [
  'login', 'create-account', 'dashboard', 'care-plan', 'goals', 'progress',
  'journal', 'community', 'document-vault', 'shop', 'profile', 'settings',
  'support', 'privacy-policy', 'terms-of-service', 'benefits-coach',
  'conversational-booking', 'more', 'junior', 'weekly-insights',
  'analytics-charts', 'paywall', 'provider-portal', 'provider-landing',
  'provider-onboarding', 'telehealth', 'ask-bcba', 'aact-partner-setup', 'org-admin'
];

const consoleErrors = {};

(async () => {
  if (!fs.existsSync('/tmp/audit')) fs.mkdirSync('/tmp/audit');

  const browser = await chromium.launch({
    headless: true,
    executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
  });
  const page = await browser.newPage();

  // Set mobile viewport
  await page.setViewportSize({ width: 375, height: 812 });

  // Collect console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      const screenKey = page._currentScreen || 'unknown';
      if (!consoleErrors[screenKey]) consoleErrors[screenKey] = [];
      consoleErrors[screenKey].push(msg.text());
    }
  });

  // Load initial page
  await page.goto('http://localhost:3001', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  // Take initial screenshot
  await page.screenshot({ path: '/tmp/audit/00-initial.png' });

  for (const screenName of screens) {
    console.log(`Auditing: ${screenName}`);
    page._currentScreen = screenName;

    try {
      // Navigate to screen
      await page.evaluate((name) => {
        if (window.__navigateToScreen) {
          window.__navigateToScreen(name);
        }
      }, screenName);

      await page.waitForTimeout(1500);

      // Light mode screenshot
      await page.evaluate(() => {
        document.documentElement.classList.remove('dark');
      });
      await page.waitForTimeout(500);
      await page.screenshot({ path: `/tmp/audit/${screenName}-light.png`, fullPage: false });

      // Dark mode screenshot
      await page.evaluate(() => {
        document.documentElement.classList.add('dark');
      });
      await page.waitForTimeout(500);
      await page.screenshot({ path: `/tmp/audit/${screenName}-dark.png`, fullPage: false });

      // Reset to light
      await page.evaluate(() => {
        document.documentElement.classList.remove('dark');
      });

    } catch (err) {
      console.error(`Error on ${screenName}: ${err.message}`);
      fs.writeFileSync(`/tmp/audit/${screenName}-error.txt`, err.message);
    }
  }

  // Save console errors
  fs.writeFileSync('/tmp/audit/console-errors.json', JSON.stringify(consoleErrors, null, 2));
  console.log('Done! Screenshots saved to /tmp/audit/');

  await browser.close();
})();
