import { expect, test, type Locator, type Page } from '@playwright/test'
import { resolve, sep } from 'node:path'
import { concerts } from '../../src/data/concerts'

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

async function gotoConcertFixture(page: Page, count: number) {
  const fixtureRoot = process.env.MEDIA_FIXTURE_ROOT ?? resolve(process.cwd(), process.env.PLAYWRIGHT_OUTPUT_DIR ?? 'test-results/local', 'media-fixture')
  await page.route('**/media-fixture/**', async route => {
    const relative = new URL(route.request().url()).pathname.slice('/media-fixture/'.length) || 'index.html'
    const file = resolve(fixtureRoot, relative)
    if (!file.startsWith(fixtureRoot + sep)) return route.abort()
    await route.fulfill({ path: file })
  })
  await page.goto('/media-fixture/?count=' + count)
  await expect(page.locator('.concert-archive-rail')).toHaveAttribute('data-rail-ready', 'true')
}

test('concert archive renders every show in one reverse-chronological horizontal rail', async ({ page }) => {
  await gotoConcerts(page)

  const archive = page.locator('#concert-archive')
  const rail = archive.locator('.concert-archive-rail')
  await expect(rail).toBeVisible()
  await expect(page.locator('.page-concerts > section')).toHaveCount(2)

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

  const opener = firstCard.locator('.poster-open')
  await opener.scrollIntoViewIfNeeded()
  // Firefox may return from automatic scrolling before the target stops moving.
  await expect.poll(() => opener.evaluate(async element => {
    const before = element.getBoundingClientRect()
    const scrollBefore = window.scrollY
    await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
    const after = element.getBoundingClientRect()
    return after.top >= 0 && after.bottom <= innerHeight
      && after.left >= 0 && after.right <= innerWidth
      && Math.abs(before.top - after.top) < .5
      && Math.abs(before.left - after.left) < .5
      && Math.abs(before.height - after.height) < .5
      && Math.abs(scrollBefore - window.scrollY) < .5
  })).toBe(true)
  expect(originalRequests).toEqual([])
  await opener.click()
  await expect(page.locator('.lightbox')).toBeVisible()
  await expect.poll(() => originalRequests.length).toBe(1)
})

test('concert archive leaves normal and Shift wheel input native', async ({ page }) => {
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
  expect(wheelState.shiftedDispatchResult).toBe(true)
  expect(wheelState.shiftedDefaultPrevented).toBe(false)
  expect(wheelState.shiftedScrollLeft).toBe(0)

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
  await expect.poll(() => centerError(rail, 0)).toBeLessThanOrEqual(2)

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

test('concert archive buttons use instant scrolling when motion is reduced', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.addInitScript(() => {
    const nativeScrollTo = Element.prototype.scrollTo
    Element.prototype.scrollTo = function (options?: ScrollToOptions | number, y?: number) {
      if (this.matches('.concert-archive-rail')) {
        this.setAttribute('data-test-scroll-behavior', typeof options === 'object' ? options.behavior ?? '' : '')
      }
      Reflect.apply(nativeScrollTo, this, typeof options === 'number' ? [options, y ?? 0] : [options])
    }
  })

  await gotoConcerts(page)

  const rail = page.locator('.concert-archive-rail')
  await expect(rail).toHaveCSS('scroll-behavior', 'auto')
  await expect(rail).toHaveCSS('scroll-snap-type', 'none')

  const next = page.locator('.concert-rail-controls button[data-rail-direction="next"]')
  await expect(page.locator('.site-shell[data-page-load-state="ready"]')).toBeVisible()
  await next.scrollIntoViewIfNeeded()
  await next.click()
  await expect(rail).toHaveAttribute('data-test-scroll-behavior', 'auto')
  await expect.poll(() => rail.evaluate((element) => (element as HTMLElement).scrollLeft)).toBeGreaterThan(0)
})

test('concert archive exposes a native horizontal scrolling contract', async ({ page }) => {
  await gotoConcerts(page)

  const rail = page.locator('.concert-archive-rail')
  await expect(rail).toBeVisible()
  await expect(rail).toHaveCSS('touch-action', 'auto')

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

test('concert archive scrolls through native Android touch input without opening the poster', async ({ page, context, browserName, isMobile }) => {
  test.skip(browserName !== 'chromium' || !isMobile, 'Native CDP touch input is verified in the Android Chromium project')
  await gotoConcerts(page)
  await page.evaluate(() => document.fonts.ready)
  await page.locator('.concert-rail-card').first().scrollIntoViewIfNeeded()
  const rail = page.locator('.concert-archive-rail')
  const start = await rail.evaluate(element => {
    const box = element.getBoundingClientRect()
    return { x: box.left + box.width * .8, y: Math.max(100, Math.min(innerHeight - 194, box.top + 120)) }
  })
  const client = await context.newCDPSession(page)
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [start] })
  for (let step = 1; step <= 12; step++) {
    await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: start.x - step * 20, y: start.y }] })
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => resolve())))
  }
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await expect.poll(() => rail.evaluate(element => element.scrollLeft)).toBeGreaterThan(0)
  await expect(page.locator('.lightbox')).toHaveCount(0)
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

async function expectUniformCards(page: Page) {
  await page.evaluate(() => document.fonts.ready)
  const geometry = await page.locator('.concert-rail-card').evaluateAll(elements => elements.map(element => {
    const card = element.getBoundingClientRect()
    const poster = element.querySelector<HTMLElement>('.concert-poster')!.getBoundingClientRect()
    const info = element.querySelector<HTMLElement>('.concert-rail-card-info')!.getBoundingClientRect()
    const text = [...element.querySelectorAll<HTMLElement>('.concert-info > *, .concert-date')]
    return { id: element.getAttribute('data-concert-id'), width: card.width, height: card.height,
      posterWidth: poster.width, posterHeight: poster.height, infoStart: info.top - card.top, gap: info.top - poster.bottom,
      clipped: text.filter(node => {
        const box = node.getBoundingClientRect()
        return node.scrollWidth > node.clientWidth + 1 || node.scrollHeight > node.clientHeight + 1
          || box.bottom > card.bottom - 1 || box.right > card.right - 1 || box.left < card.left + 1
      }).map(node => node.textContent),
      fit: getComputedStyle(element.querySelector('.poster-foreground')!).objectFit }
  }))
  expect(geometry).toHaveLength(concerts.length)
  for (const key of ['width', 'height', 'infoStart', 'gap'] as const) {
    const values = geometry.map(card => card[key])
    expect(Math.max(...values) - Math.min(...values), `all cards have uniform ${key}`).toBeLessThanOrEqual(1)
  }
  for (const card of geometry) {
    expect(Math.abs(card.posterHeight - card.posterWidth * 4 / 3), `${card.id} poster ratio`).toBeLessThanOrEqual(1)
    expect(card.clipped, `${card.id} complete text`).toEqual([])
    expect(card.fit).toBe('contain')
  }
  expect(await page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - innerWidth)).toBeLessThanOrEqual(1)
}

for (const route of concertRoutes) for (const width of [320, 390, 768, 1024, 1440]) for (const theme of ['light', 'dark']) {
  test(`uniform card geometry: ${route.locale} ${width}px ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await gotoConcertRoute(page, route.path)
    await expect(page.locator('.concert-rail-card')).toHaveCount(concerts.length)
    await page.evaluate(theme => document.documentElement.setAttribute('data-theme', theme), theme)
    await expectUniformCards(page)
  })
}

test('uniform cards retain complete text at 200 percent text scaling and after resize', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.setViewportSize({ width: 1440, height: 1000 })
  await gotoConcertRoute(page, '/en/concerts/')
  // Double each text element's computed font size. This is text-only scaling,
  // not a viewport simulation or a claim of native browser page zoom coverage.
  await page.locator('.concert-rail-card').evaluateAll(cards => {
    const nodes = cards.flatMap(card => [...card.querySelectorAll<HTMLElement>('.concert-info > *, .concert-date')])
    const sizes = nodes.map(node => getComputedStyle(node).fontSize)
    nodes.forEach((node, index) => { node.style.fontSize = `${Number.parseFloat(sizes[index]!) * 2}px` })
  })
  await expectUniformCards(page)
  await page.setViewportSize({ width: 320, height: 844 })
  await expectUniformCards(page)
})

test('uniform adjacent cards retain default motion styling after reveal', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  await gotoConcerts(page)
  const cards = page.locator('.concert-rail-card')
  await cards.first().scrollIntoViewIfNeeded()
  await page.mouse.move(0, 0)
  const visibleIndices = await cards.evaluateAll(elements => elements.flatMap((element, index) => {
    const box = element.getBoundingClientRect()
    return box.right > 0 && box.left < innerWidth ? [index] : []
  }))
  expect(visibleIndices.length).toBeGreaterThan(0)
  for (const index of visibleIndices) {
    await expect(cards.nth(index)).toHaveClass(/revealed/)
    await expect.poll(() => cards.nth(index).evaluate(element => getComputedStyle(element).opacity)).toBe('1')
  }
  await expectUniformCards(page)
})

for (const [source, target] of [
  ['/concerts/', '/en/concerts/'],
  ['/en/concerts/', '/zh-hk/concerts/'],
  ['/zh-hk/concerts/', '/concerts/']
] as const) test(`uniform cards survive actual language navigation: ${source} to ${target}`, async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await gotoConcertRoute(page, source)
  await expectUniformCards(page)
  await page.locator(`.locale-switcher-desktop a[href="${target}"]`).click()
  await expect(page).toHaveURL(new URL(target, page.url()).href)
  await expect(page.locator('.concert-rail-card')).toHaveCount(concerts.length)
  await expectUniformCards(page)
})

for (const route of concertRoutes) {
  for (const width of [320, 390, 768, 1024, 1440]) {
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
async function centerError(rail: Locator, index: number) {
  return rail.evaluate((element, cardIndex) => {
    const card = element.querySelectorAll<HTMLElement>('.concert-rail-card')[cardIndex]!
    return Math.abs(card.offsetLeft + card.offsetWidth / 2 - element.scrollLeft - element.clientWidth / 2)
  }, index)
}

test('concert hash centers a fully visible off-center poster', async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 900 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.addInitScript(() => {
    const state = globalThis as typeof globalThis & { __holdCenterLayout?: boolean }
    state.__holdCenterLayout = true
    const nativeDataset = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'dataset')!.get!
    Object.defineProperty(HTMLElement.prototype, 'dataset', {
      configurable: true,
      get() {
        const dataset = nativeDataset.call(this) as DOMStringMap
        if (!this.matches('.concert-archive-rail')) return dataset
        return new Proxy(dataset, { get(target, key) {
          return key === 'railReady' && state.__holdCenterLayout ? undefined : Reflect.get(target, key)
        } })
      }
    })
  })
  await page.goto('/concerts/#concert-zhou-shen-2026-09-27')
  await expect(page.locator('.site-shell')).toHaveAttribute('data-page-load-state', 'ready')
  const rail = page.locator('.concert-archive-rail')
  await expect(rail).toHaveAttribute('data-rail-ready', 'true')
  await rail.evaluate(element => {
    const card = element.querySelectorAll<HTMLElement>('.concert-rail-card')[1]!
    element.scrollTo({ left: card.offsetLeft + card.offsetWidth / 2 - element.clientWidth / 2 + 30, behavior: 'instant' })
  })
  const target = rail.locator('.concert-rail-card').nth(1)
  expect(await target.evaluate(element => {
    const box = element.getBoundingClientRect()
    const bounds = element.closest('.concert-archive-rail')!.getBoundingClientRect()
    return box.left >= bounds.left && box.right <= bounds.right
  })).toBe(true)
  expect(await centerError(rail, 1)).toBeGreaterThan(20)
  await page.evaluate(() => { (globalThis as typeof globalThis & { __holdCenterLayout?: boolean }).__holdCenterLayout = false })
  await expect.poll(() => centerError(rail, 1)).toBeLessThanOrEqual(2)
})

test('concert resize fallback works without ResizeObserver', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.addInitScript(() => { Reflect.deleteProperty(window, 'ResizeObserver') })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/concerts/#concert-kpl-2025-11-08')
  const rail = page.locator('.concert-archive-rail')
  await expect.poll(() => centerError(rail, 10)).toBeLessThanOrEqual(2)
  await page.setViewportSize({ width: 390, height: 844 })
  await expect.poll(() => centerError(rail, 10)).toBeLessThanOrEqual(2)
  expect(errors).toEqual([])
})

test('concert pointer input cancels a queued button destination', async ({ page }) => {
  await page.goto('/concerts/')
  const rail = page.locator('.concert-archive-rail')
  const next = page.locator('[data-rail-direction="next"]')
  await next.scrollIntoViewIfNeeded()
  await next.click({ clickCount: 3 })
  await rail.evaluate(element => {
    element.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
    const card = element.querySelectorAll<HTMLElement>('.concert-rail-card')[6]!
    element.scrollTo({ left: card.offsetLeft + card.offsetWidth / 2 - element.clientWidth / 2, behavior: 'instant' })
  })
  await expect.poll(() => centerError(rail, 6)).toBeLessThanOrEqual(2)
  await next.click()
  await expect.poll(() => centerError(rail, 7)).toBeLessThanOrEqual(2)
})

test('concert edge centers and button movement preserve the document position', async ({ page }) => {
  await page.goto('/concerts/')
  await expect(page.locator('html')).toHaveAttribute('data-fonts-ready', 'ready')
  const rail = page.locator('.concert-archive-rail')
  const next = page.locator('[data-rail-direction="next"]')
  const previous = page.locator('[data-rail-direction="previous"]')
  await next.scrollIntoViewIfNeeded()
  await expect.poll(() => centerError(rail, 0)).toBeLessThanOrEqual(2)
  const initialY = await page.evaluate(() => scrollY)
  await next.click()
  await expect.poll(() => centerError(rail, 1)).toBeLessThanOrEqual(2)
  expect(Math.abs(await page.evaluate(() => scrollY) - initialY)).toBeLessThanOrEqual(2)
  await previous.click()
  await expect.poll(() => centerError(rail, 0)).toBeLessThanOrEqual(2)
  await rail.evaluate(element => element.scrollTo({ left: element.scrollWidth, behavior: 'instant' }))
  await expect.poll(() => centerError(rail, 15)).toBeLessThanOrEqual(2)
  await expect(next).toBeDisabled()
  await previous.click()
  await expect.poll(() => centerError(rail, 14)).toBeLessThanOrEqual(2)
})

test('concert external rail movement cancels an unfinished button destination', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.addInitScript(() => {
    const state = window as typeof window & { __interruptRailReturn?: boolean }
    const nativeScrollTo = Element.prototype.scrollTo
    Element.prototype.scrollTo = function (options?: ScrollToOptions | number, y?: number) {
      if (state.__interruptRailReturn && this.matches('.concert-archive-rail') && typeof options === 'object' && (options.left ?? Infinity) <= 2) {
        state.__interruptRailReturn = false
        // Reproduce the observed WebKit return that is still 2px short when
        // another positioning operation moves the rail before its next RAF.
        Reflect.apply(nativeScrollTo, this, [{ left: (options.left ?? 0) + 2, behavior: 'instant' }])
        queueMicrotask(() => Reflect.apply(nativeScrollTo, this, [{ left: this.scrollWidth, behavior: 'instant' }]))
        return
      }
      Reflect.apply(nativeScrollTo, this, typeof options === 'number' ? [options, y ?? 0] : [options])
    }
  })
  await gotoConcerts(page)
  await expect(page.locator('html')).toHaveAttribute('data-fonts-ready', 'ready')
  const rail = page.locator('.concert-archive-rail')
  const next = page.locator('[data-rail-direction="next"]')
  const previous = page.locator('[data-rail-direction="previous"]')
  await next.scrollIntoViewIfNeeded()
  await next.click()
  await expect.poll(() => centerError(rail, 1)).toBeLessThanOrEqual(2)
  await page.evaluate(() => { (window as typeof window & { __interruptRailReturn?: boolean }).__interruptRailReturn = true })
  await previous.click()
  await expect.poll(() => centerError(rail, 15)).toBeLessThanOrEqual(2)
  await expect(next).toBeDisabled()
  await previous.click()
  await expect.poll(() => centerError(rail, 14)).toBeLessThanOrEqual(2)
})

test('concert rapid button clicks advance the pending destination', async ({ page }) => {
  await page.goto('/concerts/')
  const next = page.locator('[data-rail-direction="next"]')
  await next.scrollIntoViewIfNeeded()
  await next.click({ clickCount: 3 })
  await expect.poll(() => centerError(page.locator('.concert-archive-rail'), 3)).toBeLessThanOrEqual(2)
})

test('concert resize keeps the same centered poster', async ({ page }) => {
  await page.goto('/concerts/')
  const next = page.locator('[data-rail-direction="next"]')
  await next.scrollIntoViewIfNeeded()
  await next.click({ clickCount: 3 })
  const rail = page.locator('.concert-archive-rail')
  await expect.poll(() => centerError(rail, 3)).toBeLessThanOrEqual(2)
  await page.setViewportSize({ width: 900, height: 800 })
  await expect.poll(() => centerError(rail, 3)).toBeLessThanOrEqual(2)
})

test('concert reduced-motion resize keeps a deep-linked poster centered', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/concerts/#concert-kpl-2025-11-08')
  const rail = page.locator('.concert-archive-rail')
  await expect.poll(() => centerError(rail, 10)).toBeLessThanOrEqual(2)
  await page.setViewportSize({ width: 390, height: 844 })
  await expect.poll(() => centerError(rail, 10)).toBeLessThanOrEqual(2)
})

for (const route of ['/concerts/', '/zh-hk/concerts/', '/en/concerts/']) {
  test(`concert hash centers its target in ${route}`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto(`${route}#concert-kpl-2025-11-08`)
    await expect(page.locator('.site-shell')).toHaveAttribute('data-page-load-state', 'ready')
    await expect.poll(() => centerError(page.locator('.concert-archive-rail'), 10)).toBeLessThanOrEqual(2)
  })
}

test('concert native horizontal wheel settles at a poster center', async ({ page, isMobile }) => {
  test.skip(isMobile, 'wheel input belongs to desktop devices')
  await page.goto('/concerts/')
  const rail = page.locator('.concert-archive-rail')
  await rail.scrollIntoViewIfNeeded()
  await rail.hover()
  await page.mouse.wheel(640, 0)
  await expect.poll(() => rail.evaluate(element => element.scrollLeft)).toBeGreaterThan(0)
  await expect.poll(() => rail.evaluate(element => {
    const center = element.scrollLeft + element.clientWidth / 2
    return Math.min(...[...element.querySelectorAll<HTMLElement>('.concert-rail-card')].map(card => Math.abs(card.offsetLeft + card.offsetWidth / 2 - center)))
  })).toBeLessThanOrEqual(2)
})

test('concert native vertical wheel over the rail scrolls the page', async ({ page, isMobile }) => {
  test.skip(isMobile, 'wheel input belongs to desktop devices')
  await page.goto('/concerts/')
  await expect(page.locator('html')).toHaveAttribute('data-fonts-ready', 'ready')
  await page.locator('.concert-archive-rail').hover()
  await expect.poll(() => page.evaluate(async () => {
    const before = scrollY
    await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
    return Math.abs(scrollY - before) < .5
  })).toBe(true)
  const initialY = await page.evaluate(() => scrollY)
  expect(initialY).toBeGreaterThan(0)
  await page.mouse.wheel(0, -180)
  await expect.poll(() => page.evaluate(() => scrollY)).toBeLessThan(initialY)
})

for (const count of [0, 1, 2]) {
  test('concert fitting rail has no invented overflow with ' + count + ' posters', async ({ page }) => {
    if (count === 2) await page.setViewportSize({ width: 1200, height: 900 })
    await gotoConcertFixture(page, count)
    const rail = page.locator('.concert-archive-rail')
    await expect(rail).toHaveAttribute('data-rail-ready', 'true')
    await page.evaluate(() => document.fonts.ready)
    await expect(rail.locator('.concert-rail-card')).toHaveCount(count)
    expect(await rail.evaluate(element => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1)
    await expect(page.locator('[data-rail-direction="previous"]')).toBeDisabled()
    await expect(page.locator('[data-rail-direction="next"]')).toBeDisabled()
    if (count === 1) await expect.poll(() => centerError(rail, 0)).toBeLessThanOrEqual(2)
  })
}

test('concert narrow two-card rail preserves natural overflow and edge centers', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await gotoConcertFixture(page, 2)
  const rail = page.locator('.concert-archive-rail')
  expect(await rail.evaluate(element => element.scrollWidth - element.clientWidth)).toBeGreaterThan(1)
  await expect.poll(() => centerError(rail, 0)).toBeLessThanOrEqual(2)
  const next = page.locator('[data-rail-direction="next"]')
  await next.click()
  await expect.poll(() => centerError(rail, 1)).toBeLessThanOrEqual(2)
  await expect(next).toBeDisabled()
})

test('concert data shrink discards an out-of-range pending destination', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.addInitScript(() => {
    const nativeScrollTo = Element.prototype.scrollTo
    Element.prototype.scrollTo = function (options?: ScrollToOptions | number, y?: number) {
      if (this.matches('.concert-archive-rail') && typeof options === 'object' && options.behavior === 'smooth') return
      Reflect.apply(nativeScrollTo, this, typeof options === 'number' ? [options, y ?? 0] : [options])
    }
  })
  await gotoConcertFixture(page, 16)
  const next = page.locator('[data-rail-direction="next"]')
  await next.click({ clickCount: 10 })
  await page.getByRole('button', { name: 'Keep three shows', exact: true }).click()
  const rail = page.locator('.concert-archive-rail')
  await expect(rail.locator('.concert-rail-card')).toHaveCount(3)
  await expect(page.locator('[data-rail-direction="previous"]')).toBeDisabled()
  await expect(next).toBeEnabled()
})
