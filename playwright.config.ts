import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173';
const useManagedWebServer = !process.env.PLAYWRIGHT_BASE_URL;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
    ['json', { outputFile: 'test-results/results.json' }],
  ],
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'on',
    video: 'retain-on-failure',
    // Accessibility and visual testing settings
    actionTimeout: 15000,
    navigationTimeout: 30000,
  },
  // Increase timeout for visual audit tests
  timeout: 90000,
  expect: {
    timeout: 15000,
    // Visual regression settings
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.03,
      threshold: 0.2,
      animations: 'disabled',
    },
    toMatchSnapshot: {
      maxDiffPixelRatio: 0.03,
    },
  },
  // Output directories
  outputDir: 'test-results',
  snapshotDir: 'e2e/__snapshots__',
  snapshotPathTemplate: '{snapshotDir}/{testFileDir}/{testFileName}-snapshots/{arg}{-projectName}{ext}',
  projects: [
    // Desktop browsers
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 800 },
        launchOptions: {
          executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
        },
      },
    },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        viewport: { width: 1280, height: 800 },
      },
    },
    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        viewport: { width: 1280, height: 800 },
      },
    },
    // Mobile browsers
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
    {
      name: 'Mobile Safari SE',
      use: { ...devices['iPhone SE'] },
    },
    // Tablet
    {
      name: 'Tablet',
      use: { ...devices['iPad (gen 7)'] },
    },
  ],
  webServer: useManagedWebServer
    ? {
        command: 'npm run dev -- --host 0.0.0.0 --port 5173',
        url: 'http://localhost:5173',
        reuseExistingServer: !process.env.CI,
        timeout: 120 * 1000,
        stdout: 'pipe',
        stderr: 'pipe',
      }
    : undefined,
});
