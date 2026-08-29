import { expect, test, type Page } from '@playwright/test'

async function openLocaleNav(page: Page) {
  const desktop = page.locator('.locale-switcher-desktop')
  if ((page.viewportSize()?.width ?? 1280) > 640) {
    await expect(desktop).toBeVisible()
    return desktop
  }

  const mobile = page.locator('.locale-switcher-mobile')
  await expect(mobile).toBeVisible()
  if (await mobile.getAttribute('open') === null) await mobile.locator('summary').click()
  return mobile.locator('nav')
}

test('Simplified Chinese chrome is single-language and exposes the current locale', async ({ page }) => {
  await page.goto('/')

  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN')
  await expect(page.locator('html')).toHaveAttribute('data-locale', 'zh-CN')
  await expect(page.locator('.nav-rail .nav-label')).toHaveText(['首页', '学业', '荣誉', '研究', '作品', '演唱会'])
  await expect(page.locator('.nav-en')).toHaveCount(0)
  await expect((await openLocaleNav(page)).locator('a[aria-current="page"]')).toHaveAttribute('hreflang', 'zh-CN')
  await expect(page.locator('.theme-orbit')).toHaveAttribute('aria-label', '切换到暗色主题: 亮色')
})

test('Hong Kong Traditional Chinese localizes the core chrome', async ({ page }) => {
  await page.goto('/zh-hk/')

  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-HK')
  await expect(page.locator('html')).toHaveAttribute('data-locale', 'zh-HK')
  await expect(page.locator('.nav-rail .nav-label')).toHaveText(['首頁', '學業', '榮譽', '研究', '作品', '演唱會'])
  await expect(page.locator('.nav-en')).toHaveCount(0)
  await expect((await openLocaleNav(page)).locator('a[aria-current="page"]')).toHaveAttribute('hreflang', 'zh-HK')
  await expect(page.locator('.home-worlds')).toContainText('小世界')
})

test('English chrome is localized without Chinese navigation fallbacks', async ({ page }) => {
  await page.goto('/en/')

  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(page.locator('html')).toHaveAttribute('data-locale', 'en')
  await expect(page.locator('.nav-rail .nav-label')).toHaveText(['Home', 'Academics', 'Honors', 'Research', 'Works', 'Concerts'])
  await expect(page.locator('.nav-en')).toHaveCount(0)
  await expect(page.locator('.nav-rail')).not.toContainText('首页')
  await expect((await openLocaleNav(page)).locator('a[aria-current="page"]')).toHaveAttribute('hreflang', 'en')
  await expect(page.locator('.theme-orbit')).toHaveAttribute('aria-label', 'Switch to dark theme: Light')
})

test('language switching preserves the current page and section hash', async ({ page }) => {
  await page.goto('/research.html#sec-toolchain')
  await (await openLocaleNav(page)).locator('a[hreflang="en"]').click()
  await expect(page).toHaveURL(/\/en\/research\.html#sec-toolchain$/)
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await page.locator('.page-compass-trigger').click()
  await expect(page.locator('.page-compass-link[aria-current="location"]')).toBeVisible()

  await (await openLocaleNav(page)).locator('a[hreflang="zh-HK"]').click()
  await expect(page).toHaveURL(/\/zh-hk\/research\.html#sec-toolchain$/)
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-HK')

  await (await openLocaleNav(page)).locator('a[hreflang="zh-CN"]').click()
  await expect(page).toHaveURL(/\/research\.html#sec-toolchain$/)
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN')
})

test('theme preference survives a full locale navigation', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => localStorage.setItem('yance-theme', 'dark'))
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await (await openLocaleNav(page)).locator('a[hreflang="en"]').click()
  await expect(page).toHaveURL(/\/en\/$/)
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
})

test('desktop locale orbit exposes three real language anchors and one active segment', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/en/research.html?tab=tools#sec-toolchain')
  const control = page.locator('.locale-switcher-desktop')

  await expect(control).toBeVisible()
  await expect(control.locator('a')).toHaveCount(3)
  await expect(control).toHaveAttribute('data-current-locale', 'en')
  await expect(control.locator('a[aria-current="page"]')).toHaveAttribute('hreflang', 'en')
  await expect(control.locator('a[hreflang="zh-CN"]')).toHaveAttribute('href', '/research.html?tab=tools#sec-toolchain')
  await expect(control.locator('a[hreflang="zh-HK"]')).toHaveAttribute('href', '/zh-hk/research.html?tab=tools#sec-toolchain')
})

test('locale intent registers one same-origin prefetch without intercepting the anchor', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/en/research.html')
  const target = page.locator('.locale-switcher-desktop a[hreflang="zh-HK"]')

  await target.hover()
  await expect.poll(() => page.locator('link[rel="prefetch"]').evaluateAll((links) => links
    .map((link) => (link as HTMLLinkElement).href)
    .some((href) => /\/zh-hk\/research\.html(?:$|[?#])/.test(href))))
    .toBe(true)
  await target.focus()
  await expect(page.locator('link[rel="prefetch"]')).toHaveCount(1)
  await page.locator('.locale-switcher-desktop a[hreflang="en"]').focus()
  await expect(page.locator('link[rel="prefetch"]')).toHaveCount(1)
})

test('mobile locale pill keeps three real links inside narrow viewports', async ({ page }) => {
  for (const width of [320, 390, 640]) {
    await page.setViewportSize({ width, height: 844 })
    await page.goto('/en/research.html?tab=tools#sec-toolchain')

    const mobile = page.locator('.locale-switcher-mobile')
    await expect(mobile).toBeVisible()
    const summary = mobile.locator('summary')
    const summaryBox = await summary.boundingBox()
    expect(summaryBox?.width ?? 0, `${width}px locale summary width`).toBeGreaterThanOrEqual(44)
    expect(summaryBox?.height ?? 0, `${width}px locale summary height`).toBeGreaterThanOrEqual(44)

    if (await mobile.getAttribute('open') === null) await summary.click()
    await expect(mobile.locator('nav')).toBeVisible()
    await expect(mobile.locator('nav a')).toHaveCount(3)
    await expect(mobile.locator('nav a[aria-current="page"]')).toHaveAttribute('hreflang', 'en')

    const geometry = await page.evaluate(() => ({
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: document.documentElement.clientWidth
    }))
    expect(geometry.documentWidth, `${width}px mobile document overflow`).toBeLessThanOrEqual(geometry.viewportWidth)
  }
})

test('localized not-found pages keep the locale and return to that home', async ({ page }) => {
  await page.goto('/en/does-not-exist')
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(page.locator('.page-404')).toContainText('This page wandered off')
  await expect(page.locator('.page-404 a[href="/en/"]')).toHaveCount(1)

  await page.goto('/zh-hk/does-not-exist')
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-HK')
  await expect(page.locator('.page-404')).toContainText('這一頁走失了')
  await expect(page.locator('.page-404 a[href="/zh-hk/"]')).toHaveCount(1)
})
