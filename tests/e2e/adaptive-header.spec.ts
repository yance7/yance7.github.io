import { expect, test, type Page } from '@playwright/test'

test.describe.configure({ retries: 0 })

async function waitForReady(page: Page) {
  await expect(page.locator('.site-shell')).toHaveAttribute('data-page-load-state', 'ready')
}

async function scrollHeader(page: Page, top: number) {
  const baseline = await page.locator('.site-nav-sentinel').evaluate((element) => ({
    scrollY: window.scrollY,
    sentinelTop: element.getBoundingClientRect().top
  }))

  await page.evaluate((scrollTop) => {
    const root = document.documentElement
    const body = document.body
    const previousRootBehavior = root.style.scrollBehavior
    const previousBodyBehavior = body.style.scrollBehavior

    root.style.scrollBehavior = 'auto'
    body.style.scrollBehavior = 'auto'
    window.scrollTo({ top: scrollTop, left: 0, behavior: 'auto' })
    root.style.scrollBehavior = previousRootBehavior
    body.style.scrollBehavior = previousBodyBehavior
  }, top)

  await expect.poll(() => page.locator('.site-nav-sentinel').evaluate((element, expected) => {
    const scrollY = window.scrollY
    const sentinelTop = element.getBoundingClientRect().top
    const expectedSentinelTop = expected.sentinelTop - (expected.scrollTop - expected.initialScrollY)
    return {
      scrollY,
      sentinelTop,
      settled: Math.abs(scrollY - expected.scrollTop) <= 1
        && Math.abs(sentinelTop - expectedSentinelTop) <= 1
    }
  }, {
    initialScrollY: baseline.scrollY,
    sentinelTop: baseline.sentinelTop,
    scrollTop: top
  })).toMatchObject({ settled: true })

  await page.evaluate(() => new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  }))
}

async function expectFloatingSurface(page: Page) {
  const surface = page.locator('.site-nav-surface')

  await expect.poll(() => surface.evaluate((element) => {
    const rect = element.getBoundingClientRect()
    return {
      left: rect.left,
      rightGap: window.innerWidth - rect.right,
      width: rect.width
    }
  })).toMatchObject({
    left: expect.any(Number),
    rightGap: expect.any(Number),
    width: expect.any(Number)
  })

  await expect.poll(() => surface.evaluate((element) => element.getBoundingClientRect().left))
    .toBeGreaterThanOrEqual(12)
  await expect.poll(() => surface.evaluate((element) => window.innerWidth - element.getBoundingClientRect().right))
    .toBeGreaterThanOrEqual(12)
  await expect.poll(() => surface.evaluate((element) => element.getBoundingClientRect().width))
    .toBeLessThan(page.viewportSize()?.width ?? 0)
  await expect.poll(() => surface.evaluate((element) => Number.parseFloat(getComputedStyle(element).borderTopLeftRadius)))
    .toBeGreaterThanOrEqual(24)
}

test('desktop header morphs in place and reverses without changing outer geometry', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/en/research.html')
  await waitForReady(page)

  const header = page.locator('.site-nav')
  await expect(header).toHaveCount(1)
  await expect(header.locator('.nav-rail')).toHaveCount(1)
  await expect(header).toHaveAttribute('data-header-state', 'resting')

  const resting = await header.evaluate((element) => {
    const rect = element.getBoundingClientRect()
    const surface = element.querySelector<HTMLElement>('.site-nav-surface')?.getBoundingClientRect()
    return {
      bottom: rect.bottom,
      surfaceLeft: surface?.left ?? 0,
      surfaceRadius: getComputedStyle(element.querySelector<HTMLElement>('.site-nav-surface')!).borderTopLeftRadius
    }
  })

  expect(resting.surfaceLeft).toBeLessThanOrEqual(1)
  expect(Number.parseFloat(resting.surfaceRadius)).toBeLessThan(24)

  await scrollHeader(page, 260)
  await expect(header).toHaveAttribute('data-header-state', 'floating')
  await expectFloatingSurface(page)

  const floating = await header.evaluate((element) => {
    const rect = element.getBoundingClientRect()
    const surface = element.querySelector<HTMLElement>('.site-nav-surface')!
    const surfaceStyle = getComputedStyle(surface)
    return {
      bottom: rect.bottom,
      surfaceRadius: Number.parseFloat(surfaceStyle.borderTopLeftRadius),
      surfaceShadow: surfaceStyle.boxShadow
    }
  })

  expect(Math.abs(resting.bottom - floating.bottom)).toBeLessThanOrEqual(2)
  expect(floating.surfaceRadius).toBeGreaterThanOrEqual(24)
  expect(floating.surfaceShadow).not.toBe('none')

  await scrollHeader(page, 0)
  await expect(header).toHaveAttribute('data-header-state', 'resting')
})

test('English navigation stays inside the viewport across desktop widths', async ({ page }) => {
  for (const width of [768, 900, 1024, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/en/research.html')
    await waitForReady(page)

    const geometry = await page.evaluate(() => {
      const header = document.querySelector<HTMLElement>('.site-nav')
      const surface = document.querySelector<HTMLElement>('.site-nav-surface')
      const nav = document.querySelector<HTMLElement>('.nav-rail')
      if (!header || !surface || !nav) throw new Error('adaptive header geometry is incomplete')
      const surfaceRect = surface.getBoundingClientRect()
      const navRect = nav.getBoundingClientRect()
      return {
        documentWidth: document.documentElement.scrollWidth,
        bodyWidth: document.body.scrollWidth,
        viewportWidth: document.documentElement.clientWidth,
        headerWidth: header.getBoundingClientRect().width,
        surfaceLeft: surfaceRect.left,
        surfaceRight: surfaceRect.right,
        navLeft: navRect.left,
        navRight: navRect.right
      }
    })

    expect(geometry.documentWidth, `${width}px document overflow`).toBeLessThanOrEqual(geometry.viewportWidth)
    expect(geometry.bodyWidth, `${width}px body overflow`).toBeLessThanOrEqual(geometry.viewportWidth)
    expect(geometry.surfaceLeft, `${width}px surface left`).toBeGreaterThanOrEqual(0)
    expect(geometry.surfaceRight, `${width}px surface right`).toBeLessThanOrEqual(geometry.viewportWidth)
    expect(geometry.navLeft, `${width}px nav left`).toBeGreaterThanOrEqual(0)
    expect(geometry.navRight, `${width}px nav right`).toBeLessThanOrEqual(geometry.viewportWidth)
    expect(geometry.headerWidth).toBeGreaterThan(0)
    expect(geometry.headerWidth).toBeLessThanOrEqual(geometry.viewportWidth)
  }
})

test('floating header preserves light and dark themes and reduced-motion state changes', async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 900 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/en/research.html')
  await waitForReady(page)

  const surface = page.locator('.site-nav-surface')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await scrollHeader(page, 260)
  await expect(page.locator('.site-nav')).toHaveAttribute('data-header-state', 'floating')

  const light = await surface.evaluate((element) => {
    const style = getComputedStyle(element)
    return {
      background: style.backgroundColor,
      transitionDuration: style.transitionDuration
    }
  })
  expect(light.background).not.toBe('rgba(0, 0, 0, 0)')
  expect(Number.parseFloat(light.transitionDuration)).toBeLessThanOrEqual(.02)

  await page.locator('.theme-orbit').click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  const dark = await surface.evaluate((element) => getComputedStyle(element).backgroundColor)
  expect(dark).not.toBe(light.background)

  await scrollHeader(page, 0)
  await expect(page.locator('.site-nav')).toHaveAttribute('data-header-state', 'resting')
})

test('mobile floating header keeps controls touchable and preserves the existing modal menu', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/en/research.html')
  await waitForReady(page)

  const header = page.locator('.site-nav')
  await expect(header).toHaveAttribute('data-header-state', 'resting')
  await expect(header.locator('.nav-rail')).toHaveCount(1)
  await expect(header.locator('.nav-rail')).toBeHidden()

  const controls = header.locator('.locale-switcher-mobile summary, .theme-orbit, .menu-trigger')
  for (const control of await controls.all()) {
    const box = await control.boundingBox()
    expect(box, 'mobile header control').not.toBeNull()
    expect(box?.width ?? 0).toBeGreaterThanOrEqual(44)
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44)
  }

  await scrollHeader(page, 260)
  await expect(header).toHaveAttribute('data-header-state', 'floating')
  await expectFloatingSurface(page)

  await header.locator('.menu-trigger').click()
  await expect(page.locator('.mobile-menu-overlay')).toBeVisible()
  await expect(page.locator('.mobile-menu-close')).toBeFocused()
  await expect(page.locator('.site-shell')).toHaveAttribute('inert', '')
  await expect(page.locator('.site-nav')).toHaveCount(1)
  await expect(page.locator('.nav-rail')).toHaveCount(1)

  await page.locator('.mobile-menu-close').click()
  await expect(page.locator('.mobile-menu-overlay')).toHaveCount(0)
  await expect(header.locator('.menu-trigger')).toBeFocused()
})

test('adaptive header keeps localized controls and deep-link anchors stable', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 900 })

  const destinations = [
    ['/index.html#home-worlds', '#home-worlds'],
    ['/academics.html#sec-ap-archive', '#sec-ap-archive'],
    ['/honors.html#sec-honors-archive', '#sec-honors-archive'],
    ['/research.html#sec-toolchain', '#sec-toolchain'],
    ['/works.html#project-fresheye', '#project-fresheye'],
    ['/concerts.html#concert-archive', '#concert-archive'],
    ['/en/research.html#sec-toolchain', '#sec-toolchain'],
    ['/zh-hk/honors.html#sec-honors-archive', '#sec-honors-archive']
  ] as const

  for (const [route, targetSelector] of destinations) {
    await page.goto(route)
    await waitForReady(page)
    const target = page.locator(targetSelector)
    await expect(target).toBeAttached()

    await expect(page.locator('.site-nav')).toHaveAttribute('data-header-state', 'floating')
    await expect.poll(() => target.evaluate((element) => {
      const header = document.querySelector<HTMLElement>('.site-nav')
      return element.getBoundingClientRect().top - (header?.getBoundingClientRect().bottom ?? 0)
    })).toBeGreaterThanOrEqual(8)
  }

  await page.goto('/en/research.html')
  await waitForReady(page)
  const zhHkLink = page.locator('.locale-switcher-desktop a[hreflang="zh-HK"]')
  await expect(zhHkLink).toHaveAttribute('href', '/zh-hk/research.html')
  await zhHkLink.click()
  await expect(page).toHaveURL(/\/zh-hk\/research\.html$/)
  await expect(page.locator('.site-nav')).toHaveAttribute('data-header-state', 'resting')
})
