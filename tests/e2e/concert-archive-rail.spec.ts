import { expect, test, type Page } from '@playwright/test'

const attendedIds = [
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
  await page.goto(`/concerts.html${hash}`)
}

async function gotoConcertRoute(page: Page, path: string) {
  await page.clock.setFixedTime(FIXED_NOW)
  await page.goto(path)
}

test('attended concert archive renders every past show in one horizontal rail', async ({ page }) => {
  await gotoConcerts(page)

  const archive = page.locator('#concert-archive')
  const rail = archive.locator('.concert-archive-rail')
  await expect(rail).toBeVisible()
  await expect(page.locator('.page-concerts > #concerts-overview + #concert-archive + #album-frequencies')).toHaveCount(1)

  const ids = await rail.locator('.concert-rail-card').evaluateAll((cards) => (
    cards.map((card) => card.getAttribute('data-concert-id'))
  ))
  expect(ids).toEqual(attendedIds)
  await expect(rail.locator('[data-concert-id="wangsulong-2026-08-30"]')).toHaveCount(0)
  await expect(page.locator('.next-up-card[href^="#concert-"]')).toHaveCount(0)
  await expect(page.locator('.next-up-card')).toHaveCount(1)
  await expect(page.locator('.next-up-card [aria-hidden="true"]')).toHaveCount(0)
  await expect(rail).toHaveCSS('scroll-snap-type', /x mandatory/)
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

test('concert archive buttons stay synchronized at both rail edges', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await gotoConcerts(page)

  const rail = page.locator('.concert-archive-rail')
  const previous = page.locator('.concert-rail-controls button[data-rail-direction="previous"]')
  const next = page.locator('.concert-rail-controls button[data-rail-direction="next"]')

  await expect(page.locator('.site-shell[data-page-load-state="ready"]')).toBeVisible()
  await expect(previous).toBeDisabled()
  await expect(next).toBeEnabled()
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

test('concert archive preserves poster carousel and lightbox interactions', async ({ page }) => {
  await gotoConcerts(page)
  const card = page.locator('[data-concert-id="kpl-2025-11-08"]')
  const counter = card.locator('.carousel-controls span')

  await expect(counter).toHaveText('1 / 3')
  await card.locator('button[aria-label="下一张"]').click()
  await expect(counter).toHaveText('2 / 3')
  await card.locator('.poster-open').click()
  await expect(page.locator('.lightbox')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.locator('.lightbox')).toHaveCount(0)
})

const concertRoutes = [
  { locale: 'zh-CN', path: '/concerts.html' },
  { locale: 'zh-HK', path: '/zh-hk/concerts.html' },
  { locale: 'en', path: '/en/concerts.html' }
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
