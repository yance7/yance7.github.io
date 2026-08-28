import { defineConfig, devices } from '@playwright/test'

const previewPort = process.env.PLAYWRIGHT_PORT ?? '4173'
const previewOrigin = `http://127.0.0.1:${previewPort}`
const usePreview = process.env.PLAYWRIGHT_USE_PREVIEW === '1'
const outputDir = process.env.PLAYWRIGHT_OUTPUT_DIR ?? 'test-results/local'
const webServerCommand = usePreview
  ? `npm run preview -- --host 127.0.0.1 --port ${previewPort}`
  : `npm run dev -- --host 127.0.0.1 --port ${previewPort}`

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL: previewOrigin,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },
  outputDir,
  snapshotPathTemplate: '{testDir}/visual-snapshots/{projectName}/{platform}/{testFilePath}/{arg}{ext}',
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], browserName: 'chromium' },
      testIgnore: /compatibility\.spec\.ts|visual-matrix\.spec\.ts/
    },
    {
      name: 'webkit-desktop',
      use: {
        ...devices['Desktop Safari'],
        browserName: 'webkit',
        viewport: { width: 1200, height: 900 },
        isMobile: false,
        hasTouch: false
      },
      testMatch: /(?:site|page-compass-desktop|ui-primitives|english-layout)\.spec\.ts/
    },
    {
      name: 'webkit-mobile',
      use: { ...devices['iPhone 13'], browserName: 'webkit' },
      testMatch: /(?:site|page-compass-mobile|ui-primitives|english-layout)\.spec\.ts/
    },
    { name: 'chromium-visual', use: { ...devices['Desktop Chrome'] }, testMatch: /visual-matrix\.spec\.ts/ },
    { name: 'firefox-desktop-smoke', use: { ...devices['Desktop Firefox'] }, testMatch: /compatibility\.spec\.ts/ },
    { name: 'chromium-android-smoke', use: { ...devices['Pixel 5'] }, testMatch: /compatibility\.spec\.ts/ }
  ],
  webServer: {
    command: webServerCommand,
    url: `${previewOrigin}/index.html`,
    reuseExistingServer: !process.env.CI && !usePreview,
    timeout: 120000
  }
})
