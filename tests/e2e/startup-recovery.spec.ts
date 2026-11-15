import { expect, test } from '@playwright/test'
import { waitForHydration } from './helpers/hydration'

for (const route of ['/concerts/', '/404.html'] as const) {
  test(`${route} keeps readable content and a skip target when the entry script fails`, async ({ page }) => {
    await page.route(/\/assets\/vue\/main-[^/]+\.js$/u, (route) => route.abort())
    await page.goto(route)

    const main = page.locator('main#main')
    await expect(main).toBeVisible()
    await expect(main.locator('h1')).not.toBeEmpty()
    await expect(page.locator('#main')).toHaveCount(1)
    await expect(page.locator('a.skip-link')).toHaveAttribute('href', '#main')
  })
}

test('an early theme choice survives takeover when storage is unavailable', async ({ page }) => {
  await page.addInitScript(() => {
    const blocked = () => { throw new Error('storage blocked') }
    Storage.prototype.getItem = blocked
    Storage.prototype.setItem = blocked
  })

  let releaseEntry!: () => void
  const entryGate = new Promise<void>((resolve) => { releaseEntry = resolve })
  await page.route(/\/assets\/vue\/main-[^/]+\.js$/u, async (route) => {
    await entryGate
    await route.continue()
  })

  try {
    await page.goto('/academics/', { waitUntil: 'commit' })
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
    await page.locator('.theme-orbit').click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  } finally {
    releaseEntry()
  }

  await waitForHydration(page)
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect(page.locator('.theme-orbit')).toHaveAttribute('aria-pressed', 'true')
})

test('concerts keeps the query and poster hash on early locale links', async ({ page }) => {
  let releaseEntry!: () => void
  const entryGate = new Promise<void>((resolve) => { releaseEntry = resolve })
  await page.route(/\/assets\/vue\/main-[^/]+\.js$/u, async (route) => {
    await entryGate
    await route.continue()
  })

  try {
    await page.goto('/concerts/?from=test#poster-example', { waitUntil: 'commit' })
    const english = page.locator('.locale-switcher-desktop a[href*="/en/concerts"]').first()
    await expect(english).toBeAttached()
    await expect(english).toHaveAttribute('href', /\/en\/concerts\/\?from=test#poster-example$/)
    await expect(page.locator('main#main')).toBeVisible()
  } finally {
    releaseEntry()
  }
  await waitForHydration(page)
})