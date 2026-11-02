import { expect, type Page } from '@playwright/test'

export async function waitForHydration(page: Page) {
  await expect(page.locator('body')).toHaveAttribute('data-hydrated', 'true')
}
