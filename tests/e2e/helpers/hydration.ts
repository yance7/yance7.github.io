import { expect, type Page } from '@playwright/test'

// WebKit mobile occasionally needs longer than the 5s expect default for the
// first hydration on a cold CI runner; the state is still observed, not slept.
const HYDRATION_TIMEOUT_MS = 10_000

export async function waitForHydration(page: Page, options?: { timeout?: number }) {
  await expect(page.locator('body')).toHaveAttribute('data-hydrated', 'true', { timeout: HYDRATION_TIMEOUT_MS, ...options })
}
