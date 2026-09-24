import { expect, test, type Page } from '@playwright/test'

const archiveIds = [
  'fforever-2026-10-06',
  'zhou-shen-2026-09-27',
  'wangsulong-2026-08-30',
  'wangsulong-2026-08-19',
  'xuezhiqian-2026-07-26',
  'zhoujielun-2026-06-26',
  'jd-summer-2026-05-31',
  'mayday-2026-05-15',
  'zhangjie-2026-04-19',
  'huangzihongfan-2026-03-14',
  'kpl-2025-11-08',
  'zhangyixing-2025-10-06',
  'taozhe-2025-09-19',
  'xietingfeng-2025-08-10',
  'zhangjie-2025-04-18',
  'dengziqi-2024-08-25'
]

const FIXED_NOW = new Date('2026-08-21T12:00:00+08:00')

async function gotoConcerts(page: Page, hash = '') {
  await page.clock.setFixedTime(FIXED_NOW)
  await page.goto(`/concerts/${hash}`)
}

async function gotoConcertRoute(page: Page, path: string) {
  await page.clock.setFixedTime(FIXED_NOW)
  await page.goto(path)
}

test('concert archive renders every show in one reverse-chronological horizontal rail', async ({ page }) => {
  await gotoConcerts(page)

  const archive = page.locator('#concert-archive')
  const rail = archive.locator('.concert-archive-rail')
  await expect(rail).toBeVisible()
  await expect(page.locator('.page-concerts > #concerts-overview + #concert-archive + #album-frequencies')).toHaveCount(1)

  const ids = await rail.locator('.concert-rail-card').evaluateAll((cards) => (
    cards.map((card) => card.getAttribute('data-concert-id'))
  ))
  expect(ids).toEqual(archiveIds)
  await expect(rail.locator('[data-concert-status="upcoming"]')).toHaveCount(3)
  await expect(rail.locator('[data-concert-status="attended"]')).toHaveCount(13)
  await expect(page.locator('.next-up')).toHaveCount(0)
  await expect(rail).toHaveCSS('scroll-snap-type', /x mandatory/)
})

test('concert archive keeps original posters out of the initial request set', async ({ page }) => {
  const originalRequests: string[] = []
  page.on('request', (request) => {
    if (request.url().match(/\/assets\/concerts\/[^/]+\.jpg$/)) originalRequests.push(request.url())
  })

  await gotoConcerts(page)
  const firstCard = page.locator('.concert-rail-card').first()
  await expect(firstCard).toBeVisible()
  expect(originalRequests).toEqual([])
  await expect(firstCard.locator('.poster-foreground')).toHaveAttribute('src', /\/assets\/concerts\/thumbs\/[^/]+\.jpg$/)
  await expect(firstCard.locator('.poster-backdrop')).toHaveAttribute('src', /\/assets\/concerts\/thumbs\/[^/]+\.jpg$/)

  await firstCard.locator('.poster-open').click()
  await expect(page.locator('.lightbox')).toBeVisible()
  await expect.poll(() => originalRequests.length).toBe(1)
})

test('concert archive keeps normal wheel native and maps Shift+wheel horizontally', async ({ page }) => {
  await gotoConcerts(page)
  const rail = page.locator('.concert-archive-rail')

  const wheelState = await rail.evaluate((element) => {
    const rail = element as HTMLElement
    rail.scrollLeft = 0

    const normal = new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: 160 })
    const normalDispatchResult = rail.dispatchEvent(normal)
    const normalScrollLeft = rail.scrollLeft

    const shifted = new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: 160, shiftKey: true })
    const shiftedDispatchResult = rail.dispatchEvent(shifted)

    return {
      clientWidth: rail.clientWidth,
      scrollWidth: rail.scrollWidth,
      normalDefaultPrevented: normal.defaultPrevented,
      normalDispatchResult,
      normalScrollLeft,
      shiftedDefaultPrevented: shifted.defaultPrevented,
      shiftedDispatchResult,
      shiftedScrollLeft: rail.scrollLeft,
      overflowX: getComputedStyle(rail).overflowX
    }
  })

  expect(wheelState.scrollWidth).toBeGreaterThan(wheelState.clientWidth)
  expect(wheelState.overflowX).toMatch(/auto|scroll/)
  expect(wheelState.normalDispatchResult).toBe(true)
  expect(wheelState.normalDefaultPrevented).toBe(false)
  expect(wheelState.normalScrollLeft).toBe(0)
  expect(wheelState.shiftedDispatchResult).toBe(false)
  expect(wheelState.shiftedDefaultPrevented).toBe(true)
  expect(wheelState.shiftedScrollLeft).toBeGreaterThan(0)

  const next = page.locator('.concert-rail-controls button[data-rail-direction="next"]')
  await next.click()
  await expect.poll(() => rail.evaluate((element) => (element as HTMLElement).scrollLeft)).toBeGreaterThan(0)
})

test('concert archive deep links position the requested card', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const targetId = 'concert-kpl-2025-11-08'
  await gotoConcerts(page, `#${targetId}`)

  const rail = page.locator('.concert-archive-rail')
  const target = rail.locator(`[data-anchor-id="${targetId}"]`)
  await expect(page.locator('.site-shell[data-page-load-state="ready"]')).toBeVisible()
  await expect(target).toBeInViewport()
  await expect(target).toHaveAttribute('data-hash-target', 'true')

  const position = await rail.evaluate((element, id) => {
    const rail = element as HTMLElement
    const target = rail.querySelector<HTMLElement>(`[data-anchor-id="${id}"]`)!
    const railRect = rail.getBoundingClientRect()
    const targetRect = target.getBoundingClientRect()
    return {
      scrollLeft: rail.scrollLeft,
      railLeft: railRect.left,
      railRight: railRect.right,
      targetLeft: targetRect.left,
      targetRight: targetRect.right
    }
  }, targetId)

  expect(position.scrollLeft).toBeGreaterThan(0)
  expect(position.targetLeft).toBeGreaterThanOrEqual(position.railLeft)
  expect(position.targetRight).toBeLessThanOrEqual(position.railRight)
  expect(page.url()).toContain(`#${targetId}`)
})

test('concert archive deep links do not overwrite a newer hash', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })

  await page.addInitScript(() => {
    const nativeScrollWidth = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollWidth')?.get
    const state = globalThis as typeof globalThis & { __holdHashLayout?: boolean }
    state.__holdHashLayout = true
    Object.defineProperty(Element.prototype, 'scrollWidth', {
      configurable: true,
      get() {
        if (this.matches('[data-horizontal-scroll]') && state.__holdHashLayout) return this.clientWidth
        return nativeScrollWidth?.call(this) ?? 0
      },
    })
  })

  await page.goto('/concerts/#concert-kpl-2025-11-08')
  const originalTarget = page.locator('[data-anchor-id="concert-kpl-2025-11-08"]')
  await expect(originalTarget).toHaveAttribute('data-hash-target', 'true')
  await page.evaluate(() => { window.location.hash = '#concert-archive' })
  await expect(originalTarget).not.toHaveAttribute('data-hash-target', 'true')
  await page.evaluate(() => {
    (globalThis as typeof globalThis & { __holdHashLayout?: boolean }).__holdHashLayout = false
  })

  await expect(page).toHaveURL(/concerts\/#concert-archive$/)
  await expect(originalTarget).not.toHaveAttribute('data-hash-target', 'true')
})

test('concert archive buttons stay synchronized at both rail edges', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await gotoConcerts(page)

  const rail = page.locator('.concert-archive-rail')
  const previous = page.locator('.concert-rail-controls button[data-rail-direction="previous"]')
  const next = page.locator('.concert-rail-controls button[data-rail-direction="next"]')

  await expect(page.locator('.site-shell[data-page-load-state="ready"]')).toBeVisible()
  await expect(previous).toBeDisabled()
  await expect(next).toBeEnabled()
  await next.scrollIntoViewIfNeeded()
  await next.click()
  await expect(previous).toBeEnabled()
  await expect.poll(() => rail.evaluate((element) => (element as HTMLElement).scrollLeft)).toBeGreaterThan(0)

  await previous.click()
  await expect(previous).toBeDisabled()
  await expect.poll(() => rail.evaluate((element) => (element as HTMLElement).scrollLeft)).toBe(0)

  await rail.evaluate((element) => {
    const archiveRail = element as HTMLElement
    archiveRail.scrollLeft = archiveRail.scrollWidth
  })
  await expect(next).toBeDisabled()
  await expect(previous).toBeEnabled()

  const endScrollLeft = await rail.evaluate((element) => (element as HTMLElement).scrollLeft)
  await previous.click()
  await expect(next).toBeEnabled()
  await expect.poll(() => rail.evaluate((element) => (element as HTMLElement).scrollLeft)).toBeLessThan(endScrollLeft)
})

test('concert archive buttons use instant scrolling when motion is reduced', async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  if (testInfo.project.name === 'webkit-mobile') {
    await page.addInitScript(() => {
      const nativeScrollIntoView = Element.prototype.scrollIntoView
      Element.prototype.scrollIntoView = function (options) {
        const element = this as HTMLElement
        if (element.matches('.concert-rail-card')) {
          element.dataset.testScrollBehavior = typeof options === 'object' && options ? options.behavior ?? '' : ''
        }
        nativeScrollIntoView.call(this, options)
      }
    })
  }

  await gotoConcerts(page)

  const rail = page.locator('.concert-archive-rail')
  if (testInfo.project.name !== 'webkit-mobile') {
    await expect(rail).toHaveCSS('scroll-behavior', 'auto')
    await expect(rail).toHaveCSS('scroll-snap-type', 'none')
  }

  const next = page.locator('.concert-rail-controls button[data-rail-direction="next"]')
  await expect(page.locator('.site-shell[data-page-load-state="ready"]')).toBeVisible()
  await next.scrollIntoViewIfNeeded()
  await next.click()
  if (testInfo.project.name === 'webkit-mobile') {
    await expect(rail.locator('.concert-rail-card').nth(1)).toHaveAttribute('data-test-scroll-behavior', 'auto')
  } else {
    await expect.poll(() => rail.evaluate((element) => (element as HTMLElement).scrollLeft)).toBeGreaterThan(0)
  }
})

test('concert archive exposes a native horizontal scrolling contract', async ({ page }) => {
  await gotoConcerts(page)

  const rail = page.locator('.concert-archive-rail')
  await expect(rail).toBeVisible()
  await expect(rail).toHaveCSS('touch-action', 'pan-x pan-y')

  const scrollState = await rail.evaluate((element) => {
    const rail = element as HTMLElement
    return {
      clientWidth: rail.clientWidth,
      scrollWidth: rail.scrollWidth,
      overflowX: getComputedStyle(rail).overflowX
    }
  })

  expect(scrollState.scrollWidth).toBeGreaterThan(scrollState.clientWidth)
  expect(scrollState.overflowX).toMatch(/auto|scroll/)
})

test('concert poster hover feedback is disabled on coarse pointers', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'webkit-mobile', 'Coarse-pointer contract is verified on the mobile WebKit project')
  await gotoConcerts(page)
  const poster = page.locator('.concert-poster').first()
  const state = await poster.evaluate((element) => ({
    coarse: window.matchMedia('(hover: none), (pointer: coarse)').matches,
    posterTransition: getComputedStyle(element).transitionDuration,
    imageTransition: getComputedStyle(element.querySelector('img')!).transitionDuration
  }))

  expect(state.coarse).toBe(true)
  expect(state.posterTransition).toBe('0s')
  expect(state.imageTransition).toBe('0s')
})

test('concert archive opens each single poster in the lightbox', async ({ page }) => {
  await gotoConcerts(page)
  const card = page.locator('[data-concert-id="kpl-2025-11-08"]')

  await expect(card.locator('.carousel-controls')).toHaveCount(0)
  await card.locator('.poster-open').click()
  await expect(page.locator('.lightbox')).toBeVisible()
  await expect(page.locator('.lb-meta-index')).toHaveText('1 / 1')
  await expect(page.locator('.lb-nav')).toHaveCount(0)
  await page.keyboard.press('Escape')
  await expect(page.locator('.lightbox')).toHaveCount(0)
})

const concertRoutes = [
  { locale: 'zh-CN', path: '/concerts/' },
  { locale: 'zh-HK', path: '/zh-hk/concerts/' },
  { locale: 'en', path: '/en/concerts/' }
]

for (const route of concertRoutes) {
  for (const width of [390, 768, 1024, 1440]) {
    test(`concert archive stays inside the viewport: ${route.locale} ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await gotoConcertRoute(page, route.path)
      await expect(page.locator('html')).toHaveAttribute('data-locale', route.locale)
      await expect(page.locator('.concert-archive-rail')).toBeVisible()
      const layout = await page.evaluate(() => {
        const rail = document.querySelector<HTMLElement>('.concert-archive-rail')!
        return {
          documentWidth: document.documentElement.scrollWidth,
          bodyWidth: document.body.scrollWidth,
          viewportWidth: window.innerWidth,
          railWidth: rail.getBoundingClientRect().width,
          railScrollWidth: rail.scrollWidth
        }
      })

      expect(layout.documentWidth, `${route.locale} document at ${width}px`).toBeLessThanOrEqual(layout.viewportWidth)
      expect(layout.bodyWidth, `${route.locale} body at ${width}px`).toBeLessThanOrEqual(layout.viewportWidth)
      expect(layout.railWidth).toBeLessThanOrEqual(layout.viewportWidth)
      expect(layout.railScrollWidth).toBeGreaterThan(layout.railWidth)
    })
  }
}
