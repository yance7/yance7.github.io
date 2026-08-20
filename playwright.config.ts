import { defineConfig, devices } from '@playwright/test'

const previewPort = process.env.PLAYWRIGHT_PORT ?? '4173'
const previewOrigin = `http://127.0.0.1:${previewPort}`

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL: previewOrigin,
    trace: 'retain-on-failure'
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] }, testIgnore: /compatibility\.spec\.ts/ },
    { name: 'webkit-mobile', use: { ...devices['iPhone 13'] }, testIgnore: /compatibility\.spec\.ts/ },
    { name: 'firefox-desktop-smoke', use: { ...devices['Desktop Firefox'] }, testMatch: /compatibility\.spec\.ts/ },
    { name: 'chromium-android-smoke', use: { ...devices['Pixel 5'] }, testMatch: /compatibility\.spec\.ts/ }
  ],
  webServer: {
    command: process.env.CI
      ? `npm run preview -- --host 127.0.0.1 --port ${previewPort}`
      : `npm run build && npm run preview -- --host 127.0.0.1 --port ${previewPort}`,
    url: `${previewOrigin}/index.html`,
    reuseExistingServer: !process.env.CI,
    timeout: 120000
  }
})
