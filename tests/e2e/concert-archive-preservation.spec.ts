import { expect, test } from '@playwright/test'

const concertRoutes = [
  { locale: 'zh-CN', path: '/concerts/' },
  { locale: 'zh-HK', path: '/zh-hk/concerts/' },
  { locale: 'en', path: '/en/concerts/' }
] as const

for (const route of concertRoutes) {
  test(`concert archive remains complete without album artwork: ${route.locale}`, async ({ page }) => {
    const albumRequests: string[] = []
    page.on('request', (request) => {
      if (new URL(request.url()).pathname.startsWith('/assets/albums/')) {
        albumRequests.push(request.url())
      }
    })

    await page.goto(route.path)
    await expect(page.locator('.page-concerts')).toBeVisible()
    await expect(page.locator('#concert-archive .concert-archive-rail')).toBeVisible()
    await expect(page.locator('.concert-rail-card').first()).toBeVisible()
    await expect(page.locator('.album-wall-section')).toHaveCount(0)
    await page.locator('.site-footer').scrollIntoViewIfNeeded()
    expect(albumRequests).toEqual([])
  })
}

test('the former album hash stays in the URL without scrolling or throwing', async ({ page }) => {
  const pageErrors: string[] = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  await page.goto('/concerts/?year=2026#album-frequencies')
  await page.locator('.site-shell[data-page-load-state="ready"]').waitFor()
  await page.evaluate(() => new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  }))

  await expect(page).toHaveURL(/\/concerts\/\?year=2026#album-frequencies$/)
  await expect(page.locator('.album-wall-section')).toHaveCount(0)
  await expect(page.locator('#concert-archive .concert-archive-rail')).toBeVisible()
  await expect(page.locator('.concert-rail-card').first()).toBeVisible()
  expect(await page.evaluate(() => window.scrollY)).toBeLessThanOrEqual(1)
  expect(pageErrors).toEqual([])
})
