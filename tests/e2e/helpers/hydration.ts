import { expect, type Page } from '@playwright/test'

export async function waitForHydration(page: Page, options?: { timeout?: number }) {
  await expect(page.locator('body')).toHaveAttribute('data-hydrated', 'true', options)
}
