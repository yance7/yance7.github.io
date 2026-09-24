import { expect, test, type Page } from '@playwright/test'

const pageRoutes = [
  { route: '/', page: 'home', locale: 'zh-CN' },
  { route: '/academics/', page: 'academics', locale: 'zh-CN' },
  { route: '/honors/', page: 'honors', locale: 'zh-CN' },
  { route: '/research/', page: 'research', locale: 'zh-CN' },
  { route: '/works/', page: 'works', locale: 'zh-CN' },
  { route: '/concerts/', page: 'concerts', locale: 'zh-CN' },
  { route: '/zh-hk/', page: 'home', locale: 'zh-HK' },
  { route: '/zh-hk/academics/', page: 'academics', locale: 'zh-HK' },
  { route: '/zh-hk/honors/', page: 'honors', locale: 'zh-HK' },
  { route: '/zh-hk/research/', page: 'research', locale: 'zh-HK' },
  { route: '/zh-hk/works/', page: 'works', locale: 'zh-HK' },
  { route: '/zh-hk/concerts/', page: 'concerts', locale: 'zh-HK' },
  { route: '/en/', page: 'home', locale: 'en' },
  { route: '/en/academics/', page: 'academics', locale: 'en' },
  { route: '/en/honors/', page: 'honors', locale: 'en' },
  { route: '/en/research/', page: 'research', locale: 'en' },
  { route: '/en/works/', page: 'works', locale: 'en' },
  { route: '/en/concerts/', page: 'concerts', locale: 'en' }
] as const

const useProductionPreview = process.env.PLAYWRIGHT_USE_PREVIEW === '1'

test('canonical directory pages load directly in all three locales', async ({ page }) => {
  for (const { route, page: pageKey, locale } of pageRoutes) {
    const response = await page.goto(route)
    expect(response?.status(), route).toBe(200)
    await expect(page.locator('body'), route).toHaveAttribute('data-page', pageKey)
    await expect(page.locator('html'), route).toHaveAttribute('lang', locale)
    if (useProductionPreview) {
      await expect(page.locator('link[rel="canonical"]'), route).toHaveAttribute(
        'href',
        `https://www.yance777.com${route}`
      )
    }
  }
})

test('direct refresh keeps a localized directory page address', async ({ page }) => {
  await page.goto('/zh-hk/concerts/')
  await page.reload()

  await expect(page).toHaveURL(/\/zh-hk\/concerts\/$/)
  await expect(page.locator('body')).toHaveAttribute('data-page', 'concerts')
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-HK')
})

test('legacy HTML URLs redirect to canonical pages and preserve query and hash', async ({ page }) => {
  test.skip(!useProductionPreview, 'Legacy redirect documents are generated for production output')
  await page.goto('/concerts.html?year=2026#album-frequencies')

  await expect(page).toHaveURL(/\/concerts\/\?year=2026#album-frequencies$/)
  await expect(page.locator('body')).toHaveAttribute('data-page', 'concerts')
})

const legacyHomeRoutes = [
  { legacy: '/index.html', canonical: '/' },
  { legacy: '/zh-hk/index.html', canonical: '/zh-hk/' },
  { legacy: '/en/index.html', canonical: '/en/' }
] as const

for (const route of legacyHomeRoutes) {
  test(`legacy home URL ${route.legacy} redirects and preserves query and hash`, async ({ page }) => {
    await page.goto(`${route.legacy}?year=2026#selected-work`)

    const currentUrl = new URL(page.url())
    expect(`${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`).toBe(
      `${route.canonical}?year=2026#selected-work`
    )
    await expect(page.locator('body')).toHaveAttribute('data-page', 'home')
    await expect(page.locator('.home-hero')).toBeVisible()
    if (useProductionPreview) {
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
        'href',
        `https://www.yance777.com${route.canonical}`
      )
    }
  })
}

async function localeLink(page: Page, hreflang: string) {
  const desktop = page.locator('.locale-switcher-desktop')
  if (await desktop.isVisible()) return desktop.locator(`a[hreflang="${hreflang}"]`)

  const mobile = page.locator('.locale-switcher-mobile')
  if (await mobile.getAttribute('open') === null) await mobile.locator('summary').click()
  return mobile.locator(`nav a[hreflang="${hreflang}"]`)
}

test('locale switching keeps the current page on directory URLs', async ({ page }) => {
  await page.goto('/en/research/')
  const zhHkLink = await localeLink(page, 'zh-HK')
  await expect(zhHkLink)
    .toHaveAttribute('href', '/zh-hk/research/')
  await zhHkLink.click()
  await expect(page).toHaveURL(/\/zh-hk\/research\/$/)
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-HK')
})

test('unknown localized routes show the localized static 404 page', async ({ page }) => {
  await page.goto('/en/does-not-exist')

  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(page.locator('body')).toHaveAttribute('data-page', '404')
  await expect(page.locator('h1')).not.toHaveText('')
})
