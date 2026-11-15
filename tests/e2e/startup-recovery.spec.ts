import { expect, test } from '@playwright/test'
import { waitForHydration } from './helpers/hydration'

for (const route of ['/concerts/', '/404.html'] as const) {
  test(`${route} keeps a readable startup shell and skip target when the entry script fails`, async ({ page }, testInfo) => {
    await page.route(/\/assets\/vue\/main-[^/]+\.js$/u, (route) => route.abort())
    await page.goto(route)

    await expect(page.locator('body')).toHaveAttribute('data-rendered', 'shell')
    await expect(page.locator('body')).not.toHaveAttribute('data-hydrated', 'true')
    await expect(page.locator('.startup-shell')).toBeVisible()

    const main = page.locator('main#main')
    await expect(main).toBeVisible()
    await expect(main).toHaveCount(1)
    await expect(main.locator('h1')).not.toBeEmpty()
    if (route === '/concerts/') await expect(main.locator('.shell-fallback-list li')).not.toHaveCount(0)
    await expect(page.locator('a.skip-link')).toHaveAttribute('href', '#main')

    const skipLink = page.locator('.skip-link')
    if (testInfo.project.name.startsWith('webkit-')) {
      await skipLink.focus()
    } else {
      await page.keyboard.press('Tab')
      await expect(skipLink).toBeFocused()
    }
    await page.keyboard.press('Enter')
    await expect(main).toBeFocused()
  })
}

test('an early theme choice survives takeover when storage is unavailable', async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => { throw new Error('storage blocked') }
    Storage.prototype.setItem = () => { throw new Error('storage blocked') }
  })

  let releaseEntry!: () => void
  const entryGate = new Promise<void>((resolve) => { releaseEntry = resolve })
  let entryRequested = false
  await page.route(/\/assets\/vue\/main-[^/]+\.js$/u, async (route) => {
    entryRequested = true
    await entryGate
    await route.continue()
  })

  try {
    await page.goto('/academics/', { waitUntil: 'commit' })
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
    await expect(page.locator('body')).not.toHaveAttribute('data-hydrated', 'true')
    await expect.poll(() => entryRequested).toBe(true)
    await page.locator('.theme-orbit').click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    await expect(page.locator('html')).toHaveAttribute('data-theme-source', 'user')
  } finally {
    releaseEntry()
  }

  await waitForHydration(page)
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect(page.locator('.theme-orbit')).toHaveAttribute('aria-pressed', 'true')
})

test('concerts keeps the query and poster hash on early locale links in every locale', async ({ page }) => {
  let releaseEntry!: () => void
  const entryGate = new Promise<void>((resolve) => { releaseEntry = resolve })
  let entryRequested = false
  await page.route(/\/assets\/vue\/main-[^/]+\.js$/u, async (route) => {
    entryRequested = true
    await entryGate
    await route.continue()
  })

  try {
    await page.goto('/concerts/?from=test#poster-example', { waitUntil: 'commit' })
    await expect(page.locator('body')).not.toHaveAttribute('data-hydrated', 'true')
    await expect.poll(() => entryRequested).toBe(true)
    for (const switcher of ['.locale-switcher-desktop', '.locale-switcher-mobile']) {
      const links = page.locator(`${switcher} a[href*="/concerts/"]`)
      await expect(links).toHaveCount(3)
      for (const link of await links.all()) {
        await expect(link).toHaveAttribute('href', /\/concerts\/\?from=test#poster-example$/)
      }
    }
    await expect(page.locator('main#main')).toBeVisible()
  } finally {
    releaseEntry()
  }
  await waitForHydration(page)
})

test('404 replaces the startup shell with a single main landmark on takeover', async ({ page }) => {
  await page.goto('/404.html')
  await waitForHydration(page)
  await expect(page.locator('#app main#main')).toHaveCount(1)
  await expect(page.locator('main#main h1')).not.toBeEmpty()
})