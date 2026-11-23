import { expect, test, type Page } from '@playwright/test'

test.describe.configure({ retries: 0 })

async function waitForReady(page: Page) {
  await expect(page.locator('.site-shell')).toHaveAttribute('data-page-load-state', 'ready')
}

async function scrollHeader(page: Page, top: number) {
  await expect(page.locator('html')).toHaveAttribute('data-fonts-ready', 'ready', { timeout: 10_000 })
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

async function waitForFloatingSurfaceSettled(page: Page) {
  const surface = page.locator('.site-nav-surface')

  await expect.poll(() => surface.evaluate((element) => element.getBoundingClientRect().width))
    .toBeLessThanOrEqual(1162)
  await expect.poll(() => surface.evaluate((element) => element.getBoundingClientRect().height))
    .toBeLessThanOrEqual(61)
  await expect.poll(() => page.locator('.wordmark').evaluate((element) => element.getBoundingClientRect().width))
    .toBe(44)
  await expect.poll(() => page.locator('.brand-mark-header').evaluate((element) => element.getBoundingClientRect().width))
    .toBe(40)
}

test('floating header uses translucent glass, compact geometry, and stable brand spacing', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/en/research/')
  await waitForReady(page)
  await scrollHeader(page, 260)
  await waitForFloatingSurfaceSettled(page)
  await expect.poll(() => page.locator('.site-nav-surface').evaluate((element) => element.getBoundingClientRect().height))
    .toBeLessThanOrEqual(61)
  await expect.poll(() => page.locator('.site-nav-surface').evaluate((element) => {
    const surface = element.getBoundingClientRect()
    const brandMark = element.querySelector<HTMLElement>('.brand-mark-header')?.getBoundingClientRect()
    return brandMark ? brandMark.top - surface.top : 0
  })).toBeGreaterThanOrEqual(9)
  await expect.poll(() => page.locator('.site-nav-surface').evaluate((element) => element.getBoundingClientRect().width))
    .toBeLessThanOrEqual(1162)

  const readSurfaceMetrics = () => page.locator('.site-nav-surface').evaluate((element) => {
    const surface = element.getBoundingClientRect()
    const wordmark = element.querySelector<HTMLElement>('.wordmark')?.getBoundingClientRect()
    const brandMark = element.querySelector<HTMLElement>('.brand-mark-header')?.getBoundingClientRect()
    const navLink = element.querySelector<HTMLElement>('.nav-rail a')
    const style = getComputedStyle(element)
    const parseAlpha = (color: string) => {
      const rgba = color.match(/rgba?\([^,]+,[^,]+,[^,]+,\s*([\d.]+)\)/)
      if (rgba?.[1]) return Number.parseFloat(rgba[1])
      const colorFunction = color.match(/\/\s*([\d.]+)\s*\)?$/)
      return colorFunction?.[1] ? Number.parseFloat(colorFunction[1]) : 1
    }

    if (!wordmark || !brandMark || !navLink) throw new Error('floating header metrics are incomplete')
    return {
      background: style.backgroundColor,
      backgroundToken: style.getPropertyValue('--nav-floating-bg').trim(),
      alpha: parseAlpha(style.backgroundColor),
      backdropFilter: style.backdropFilter,
      surfaceHeight: surface.height,
      surfaceWidth: surface.width,
      wordmarkLeftGap: wordmark.left - surface.left,
      brandTopGap: brandMark.top - surface.top,
      brandBottomGap: surface.bottom - brandMark.bottom,
      wordmarkWidth: wordmark.width,
      wordmarkHeight: wordmark.height,
      brandMarkWidth: brandMark.width,
      brandMarkHeight: brandMark.height,
      navColorTransition: Number.parseFloat(getComputedStyle(navLink).transitionDuration),
      navUnderlineTransition: Number.parseFloat(getComputedStyle(navLink, '::after').transitionDuration)
    }
  })

  const light = await readSurfaceMetrics()
  expect(light.backgroundToken).toMatch(/(?:250|#fafbf9)/i)
  expect(light.alpha).toBeGreaterThanOrEqual(.77)
  expect(light.alpha).toBeLessThanOrEqual(.79)
  expect(light.backdropFilter).toContain('blur(20px)')
  expect(light.backdropFilter).toMatch(/saturate\((?:125%|1\.25)\)/)
  expect(light.surfaceHeight).toBeGreaterThanOrEqual(59)
  expect(light.surfaceHeight).toBeLessThanOrEqual(61)
  expect(light.surfaceWidth).toBeLessThanOrEqual(1162)
  expect(light.wordmarkLeftGap).toBeGreaterThanOrEqual(20)
  expect(light.wordmarkLeftGap).toBeLessThanOrEqual(26)
  expect(light.brandTopGap).toBeGreaterThanOrEqual(9)
  expect(light.brandTopGap).toBeLessThanOrEqual(11)
  expect(light.brandBottomGap).toBeGreaterThanOrEqual(9)
  expect(light.brandBottomGap).toBeLessThanOrEqual(11)
  expect(light.wordmarkWidth).toBe(44)
  expect(light.wordmarkHeight).toBe(44)
  expect(light.brandMarkWidth).toBe(40)
  expect(light.brandMarkHeight).toBe(40)
  expect(light.navColorTransition).toBeGreaterThanOrEqual(.16)
  expect(light.navColorTransition).toBeLessThanOrEqual(.22)
  expect(light.navUnderlineTransition).toBeGreaterThanOrEqual(.16)
  expect(light.navUnderlineTransition).toBeLessThanOrEqual(.22)

  await page.locator('.theme-orbit').click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  const dark = await readSurfaceMetrics()
  expect(dark.backgroundToken).toMatch(/(?:14|#0e161b)/i)
  expect(dark.alpha).toBeGreaterThanOrEqual(.73)
  expect(dark.alpha).toBeLessThanOrEqual(.75)
})

test('floating header hover and focus preserve navigation geometry', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/en/research/')
  await waitForReady(page)
  await scrollHeader(page, 260)
  await waitForFloatingSurfaceSettled(page)

  const link = page.locator('.nav-rail a').first()
  const readGeometry = () => link.evaluate((element) => {
    const rect = element.getBoundingClientRect()
    return { left: rect.left, top: rect.top, width: rect.width, height: rect.height }
  })

  const resting = await readGeometry()
  await link.hover()
  const hovered = await readGeometry()
  await link.focus()
  const focused = await readGeometry()

  for (const state of [hovered, focused]) {
    expect(state.width).toBe(resting.width)
    expect(state.height).toBe(resting.height)
    expect(Math.abs(state.left - resting.left)).toBeLessThanOrEqual(.5)
    expect(Math.abs(state.top - resting.top)).toBeLessThanOrEqual(.5)
  }
})

test('desktop header morphs in place and reverses without changing outer geometry', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/en/research/')
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
    await page.goto('/en/research/')
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

test('desktop header uses left-aligned navigation next to the Logo and a right-hand control group', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/en/research/')
  await waitForReady(page)

  for (const width of [1440, 1280, 1100, 1050, 1024, 900, 821]) {
    await page.setViewportSize({ width, height: 900 })
    if ((await page.evaluate(() => window.scrollY)) > 0) await scrollHeader(page, 0)
    await expect(page.locator('.site-nav')).toHaveAttribute('data-header-state', 'resting')

    for (const state of ['resting', 'floating'] as const) {
      if (state === 'floating') {
        await scrollHeader(page, 260)
        await expect(page.locator('.site-nav')).toHaveAttribute('data-header-state', 'floating')
        await waitForFloatingSurfaceSettled(page)
      }

      const geometry = await page.evaluate(() => {
        const surface = document.querySelector<HTMLElement>('.site-nav-surface')
        const nav = document.querySelector<HTMLElement>('.nav-rail')
        const firstLink = document.querySelector<HTMLElement>('.nav-rail a')
        const brand = document.querySelector<HTMLElement>('.site-nav-brand')
        const wordmark = document.querySelector<HTMLElement>('.wordmark')
        const controls = document.querySelector<HTMLElement>('.site-nav-controls')
        if (!surface || !nav || !firstLink || !brand || !wordmark || !controls) throw new Error('header groups are incomplete')
        const surfaceRect = surface.getBoundingClientRect()
        const navRect = nav.getBoundingClientRect()
        const firstLinkRect = firstLink.getBoundingClientRect()
        const brandRect = brand.getBoundingClientRect()
        const wordmarkRect = wordmark.getBoundingClientRect()
        const controlsRect = controls.getBoundingClientRect()
        return {
          brandLeft: brandRect.left,
          brandRight: brandRect.right,
          brandNavGap: firstLinkRect.left - wordmarkRect.right,
          navLeft: navRect.left,
          navRight: navRect.right,
          controlsLeft: controlsRect.left,
          controlsRight: controlsRect.right,
          surfaceRight: surfaceRect.right
        }
      })

      const context = `${width}px ${state}`
      expect(geometry.brandLeft, `${context} brand position`).toBeGreaterThanOrEqual(0)
      expect(geometry.brandRight, `${context} brand/nav order`).toBeLessThanOrEqual(geometry.navLeft)
      expect(geometry.brandNavGap, `${context} brand to first nav gap min`).toBeGreaterThanOrEqual(24)
      expect(geometry.brandNavGap, `${context} brand to first nav gap max`).toBeLessThanOrEqual(40)
      expect(geometry.navRight, `${context} nav/control separation`).toBeLessThanOrEqual(geometry.controlsLeft)
      expect(geometry.controlsRight, `${context} controls position`).toBeLessThanOrEqual(geometry.surfaceRight)
      await expect(page.locator('.nav-status')).toHaveCount(0)
    }
  }
})

const midWidths = [821, 1024, 1050, 1100, 1280, 1440] as const
const midWidthLocales = [
  { name: 'en', route: '/en/research/', lang: 'en' },
  { name: 'zh-CN', route: '/research/', lang: 'zh-CN' },
  { name: 'zh-HK', route: '/zh-hk/research/', lang: 'zh-HK' }
] as const

for (const locale of midWidthLocales) {
  test(`mid-width header keeps nav clear of controls and keyboard reachable: ${locale.name}`, async ({ page }) => {
    await page.setViewportSize({ width: midWidths[0], height: 900 })
    await page.goto(locale.route)
    await waitForReady(page)
    await expect(page.locator('html')).toHaveAttribute('data-locale', locale.lang)

    for (const width of midWidths) {
      await page.setViewportSize({ width, height: 900 })
      if ((await page.evaluate(() => window.scrollY)) > 0) await scrollHeader(page, 0)

      for (const state of ['resting', 'floating'] as const) {
        if (state === 'floating') {
          await scrollHeader(page, 260)
          await expect(page.locator('.site-nav')).toHaveAttribute('data-header-state', 'floating')
        } else {
          await expect(page.locator('.site-nav')).toHaveAttribute('data-header-state', 'resting')
        }

        const context = `${locale.name} ${width}px ${state}`
        // The compact band keeps the inline rail; it must not collapse to the mobile menu.
        await expect(page.locator('.nav-rail'), `${context} inline rail`).toBeVisible()
        await expect(page.locator('.menu-trigger'), `${context} menu trigger`).toBeHidden()

        const geometry = await page.evaluate(() => {
          const rail = document.querySelector<HTMLElement>('.nav-rail')
          const controls = document.querySelector<HTMLElement>('.site-nav-controls')
          const localePill = document.querySelector<HTMLElement>('.locale-switcher-desktop')
          if (!rail || !controls || !localePill) throw new Error('header groups are incomplete')
          const links = [...rail.querySelectorAll<HTMLAnchorElement>('a')]
          const last = links[links.length - 1]
          if (!last) throw new Error('navigation rail is empty')
          const railRect = rail.getBoundingClientRect()
          const controlsRect = controls.getBoundingClientRect()
          const localeRect = localePill.getBoundingClientRect()
          const lastRect = last.getBoundingClientRect()
          const label = document.querySelector<HTMLElement>('.orbit-label')
          let labelSingleLine = true
          if (label && label.getBoundingClientRect().width > 0) {
            const labelRect = label.getBoundingClientRect()
            const lineHeight = Number.parseFloat(getComputedStyle(label).lineHeight) || labelRect.height
            labelSingleLine = label.getClientRects().length <= 1 && labelRect.height <= lineHeight * 1.4
          }
          const obscured = links.filter((link) => {
            const rect = link.getBoundingClientRect()
            const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2)
            return !(hit === link || link.contains(hit))
          }).map((link) => link.getAttribute('href'))
          return {
            navControlGap: controlsRect.left - railRect.right,
            lastNavLocaleGap: localeRect.left - lastRect.right,
            labelSingleLine,
            obscured,
            overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth
          }
        })

        expect(geometry.navControlGap, `${context} nav/control overlap`).toBeGreaterThanOrEqual(0)
        expect(geometry.lastNavLocaleGap, `${context} nav/locale overlap`).toBeGreaterThanOrEqual(0)
        expect(geometry.labelSingleLine, `${context} theme label wraps`).toBe(true)
        expect(geometry.obscured, `${context} obscured nav links`).toEqual([])
        expect(geometry.overflow, `${context} document overflow`).toBeLessThanOrEqual(0)

        const links = page.locator('.nav-rail a')
        await expect(links, `${context} nav count`).toHaveCount(6)
        // WebKit's sequential-focus start point can begin mid-header, so raw Tab
        // traversal is engine-dependent. Assert each link sits in the natural tab
        // order (tabIndex 0) and accepts keyboard focus directly instead.
        const tabbable = await links.evaluateAll((els) => els.every((el) => el.tabIndex === 0 && !el.closest('[inert]')))
        expect(tabbable, `${context} nav tabbable`).toBe(true)
        for (let index = 0; index < 6; index += 1) {
          await links.nth(index).focus()
          await expect(links.nth(index), `${context} nav ${index} focusable`).toBeFocused()
        }
      }
    }
  })
}

test('mid-width Concerts link is clickable and navigates', async ({ page }) => {
  await page.setViewportSize({ width: 1050, height: 900 })
  await page.goto('/en/research/')
  await waitForReady(page)

  const concerts = page.locator('.nav-rail a').last()
  await expect(concerts).toContainText('Concerts')
  await expect(concerts).toBeVisible()
  await concerts.click()
  await expect(page).toHaveURL(/\/en\/concerts\/$/)
})

test('floating header preserves light and dark themes and reduced-motion state changes', async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 900 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/en/research/')
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
  await page.goto('/en/research/')
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

test('adaptive header catches fragment scrolling after sentinel observation', async ({ page }) => {
  await page.addInitScript(() => {
    const NativeIntersectionObserver = window.IntersectionObserver

    Object.defineProperty(window, 'IntersectionObserver', {
      configurable: true,
      value: class DelayedSentinelObserver {
        private readonly observer: IntersectionObserver
        private readonly sentinels = new WeakSet<Element>()

        constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
          this.observer = new NativeIntersectionObserver((entries, observer) => {
            const updates = entries.filter((entry) => !this.sentinels.has(entry.target))
            if (updates.length) callback(updates, observer)
          }, options)
        }

        observe(target: Element) {
          if (target.matches('.site-nav-sentinel')) this.sentinels.add(target)
          this.observer.observe(target)
        }

        unobserve(target: Element) {
          this.observer.unobserve(target)
        }

        disconnect() {
          this.observer.disconnect()
        }

        takeRecords() {
          return this.observer.takeRecords()
        }
      }
    })
  })

  await page.goto('/')
  await waitForReady(page)

  const header = page.locator('.site-nav')
  const target = page.locator('#home-worlds')
  await expect(header).toHaveAttribute('data-header-state', 'resting')
  await expect(target).toBeAttached()
  await expect(page.locator('html')).toHaveAttribute('data-fonts-ready', 'ready', { timeout: 10_000 })
  const targetScrollTop = await target.evaluate((element) => element.getBoundingClientRect().top + window.scrollY)

  await page.evaluate(() => {
    history.replaceState(null, '', '#home-worlds')
  })
  await scrollHeader(page, targetScrollTop)

  await expect(header).toHaveAttribute('data-header-state', 'floating')
})

test('adaptive header tracks a cold fragment after the lazy page chunk mounts', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })

  let homePageChunkRequested = false
  let siteNavCountBeforePageChunk = 0

  await page.route('**/assets/vue/HomePage-*.js', async (route) => {
    homePageChunkRequested = true
    await page.locator('.site-nav').waitFor({ state: 'attached' })
    siteNavCountBeforePageChunk = await page.locator('.site-nav').count()
    await route.continue()
  })

  await page.goto('/#home-worlds')
  await waitForReady(page)

  await expect.poll(() => homePageChunkRequested).toBe(true)
  await expect.poll(() => siteNavCountBeforePageChunk, 'site nav must be present before the page chunk continues').toBe(1)

  const target = page.locator('#home-worlds')
  await expect(target).toBeAttached()
  // Observe a rendered frame within the original poll budget, then require
  // the restored fragment and final geometry together without scrolling it.
  let renderedFrame: Promise<Buffer> | undefined
  await expect.poll(async () => {
    renderedFrame ??= page.screenshot({ caret: 'initial', timeout: 5000 })
    await renderedFrame
    return target.evaluate((element) => {
      const header = document.querySelector<HTMLElement>('.site-nav')
      const rect = element.getBoundingClientRect()
      return {
        fonts: document.documentElement.dataset.fontsReady,
        hash: window.location.hash,
        pendingHash: document.documentElement.dataset.initialHash ?? '',
        header: header?.dataset.headerState,
        visible: rect.bottom > 0 && rect.top < window.innerHeight,
        clearsHeader: rect.top - (header?.getBoundingClientRect().bottom ?? 0) >= 8
      }
    })
  }).toEqual({
    fonts: 'ready',
    hash: '#home-worlds',
    pendingHash: '',
    header: 'floating',
    visible: true,
    clearsHeader: true
  })
})

test('adaptive header keeps localized controls and deep-link anchors stable', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 900 })

  const destinations = [
    ['/#home-worlds', '#home-worlds'],
    ['/academics/#sec-ap-archive', '#sec-ap-archive'],
    ['/honors/#sec-honors-archive', '#sec-honors-archive'],
    ['/research/#sec-toolchain', '#sec-toolchain'],
    ['/works/#project-fresheye', '#project-fresheye'],
    ['/concerts/#concert-archive', '#concert-archive'],
    ['/en/research/#sec-toolchain', '#sec-toolchain'],
    ['/zh-hk/honors/#sec-honors-archive', '#sec-honors-archive']
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

  await page.goto('/en/research/')
  await waitForReady(page)
  const zhHkLink = page.locator('.locale-switcher-desktop a[hreflang="zh-HK"]')
  await expect(zhHkLink).toHaveAttribute('href', '/zh-hk/research/')
  await zhHkLink.click()
  await expect(page).toHaveURL(/\/zh-hk\/research\/$/)
  await expect(page.locator('.site-nav')).toHaveAttribute('data-header-state', 'resting')
})

const tabletMenuWidths = [640, 641, 760, 761, 820] as const
const tabletLocales = [
  { name: 'en', route: '/en/research/', lang: 'en' },
  { name: 'zh-CN', route: '/research/', lang: 'zh-CN' },
  { name: 'zh-HK', route: '/zh-hk/research/', lang: 'zh-HK' }
] as const

for (const locale of tabletLocales) {
  test(`tablet menu keeps navigation and controls clear: ${locale.name}`, async ({ page }) => {
    await page.setViewportSize({ width: tabletMenuWidths[0], height: 900 })
    await page.goto(locale.route)
    await waitForReady(page)

    for (const width of tabletMenuWidths) {
      await page.setViewportSize({ width, height: 900 })
      await expect(page.locator('html')).toHaveAttribute('data-locale', locale.lang)

      for (const state of ['resting', 'floating'] as const) {
        if (state === 'floating') {
          await scrollHeader(page, 260)
          await expect(page.locator('.site-nav')).toHaveAttribute('data-header-state', 'floating')
        } else {
          await expect(page.locator('.site-nav')).toHaveAttribute('data-header-state', 'resting')
        }
        const context = `${locale.name} ${width}px ${state}`
        await expect(page.locator('.menu-trigger'), `${context} menu trigger`).toBeVisible()
        await expect(page.locator('.nav-rail'), `${context} inline rail`).toBeHidden()
        await expect(page.locator('.locale-switcher-mobile'), `${context} locale menu`).toBeVisible()
        await expect(page.locator('.locale-switcher-desktop'), `${context} desktop locale`).toBeHidden()
        await expect(page.locator('.theme-orbit'), `${context} theme control`).toBeVisible()

        const geometry = await page.evaluate(() => {
          const rect = (selector: string) => {
            const element = document.querySelector<HTMLElement>(selector)
            if (!element) throw new Error(`Missing ${selector}`)
            return element.getBoundingClientRect()
          }
          const surface = rect('.site-nav-surface')
          const localeMenu = rect('.locale-switcher-mobile')
          const theme = rect('.theme-orbit')
          const trigger = rect('.menu-trigger')
          return {
            surfaceLeft: surface.left,
            surfaceRight: surface.right,
            localeLeft: localeMenu.left,
            localeRight: localeMenu.right,
            themeLeft: theme.left,
            themeRight: theme.right,
            triggerLeft: trigger.left,
            triggerRight: trigger.right,
            overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth
          }
        })
        expect(geometry.localeLeft, `${context} locale start`).toBeGreaterThanOrEqual(geometry.surfaceLeft)
        expect(geometry.localeRight, `${context} locale/theme overlap`).toBeLessThanOrEqual(geometry.themeLeft)
        expect(geometry.themeRight, `${context} theme/trigger overlap`).toBeLessThanOrEqual(geometry.triggerLeft)
        expect(geometry.triggerRight, `${context} trigger inside surface`).toBeLessThanOrEqual(geometry.surfaceRight)
        expect(geometry.overflow, `${context} horizontal overflow`).toBeLessThanOrEqual(0)
      }

      await page.evaluate(() => window.scrollTo(0, 0))
      const trigger = page.locator('.menu-trigger')
      await trigger.focus()
      await expect(trigger, `${locale.name} ${width}px trigger focus`).toBeFocused()
      await page.keyboard.press('Enter')
      await expect(trigger).toHaveAttribute('aria-expanded', 'true')
      const dialog = page.locator('.mobile-menu-overlay')
      await expect(dialog).toBeVisible()
      const links = dialog.locator('.mobile-menu a')
      await expect(links).toHaveCount(6)
      await links.first().focus()
      await expect(links.first(), `${locale.name} ${width}px first nav link focus`).toBeFocused()
      await page.keyboard.press('Escape')
      await expect(dialog).toHaveCount(0)
      await expect(trigger).toHaveAttribute('aria-expanded', 'false')
    }
  })
}

test('tablet header returns to the inline rail at 821px and keeps controls separate', async ({ page }) => {
  for (const width of [821, 900]) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/en/research/')
    await waitForReady(page)

    for (const state of ['resting', 'floating'] as const) {
      if (state === 'floating') {
        await scrollHeader(page, 260)
        await expect(page.locator('.site-nav')).toHaveAttribute('data-header-state', 'floating')
      } else {
        await expect(page.locator('.site-nav')).toHaveAttribute('data-header-state', 'resting')
      }
      const context = `inline ${width}px ${state}`
      await expect(page.locator('.nav-rail'), `${context} rail`).toBeVisible()
      await expect(page.locator('.menu-trigger'), `${context} menu trigger`).toBeHidden()
      await expect(page.locator('.locale-switcher-desktop'), `${context} locale`).toBeVisible()
      await expect(page.locator('.theme-orbit'), `${context} theme`).toBeVisible()
      await expect(page.locator('.theme-orbit .orbit-label'), `${context} theme label`).toBeHidden()

      const geometry = await page.evaluate(() => {
        const rail = document.querySelector<HTMLElement>('.nav-rail')
        const controls = document.querySelector<HTMLElement>('.site-nav-controls')
        if (!rail || !controls) throw new Error('header groups are incomplete')
        const links = [...rail.querySelectorAll<HTMLAnchorElement>('a')]
        const obscured = links.filter((link) => {
          const rect = link.getBoundingClientRect()
          const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2)
          return !(hit === link || link.contains(hit))
        }).map((link) => link.getAttribute('href'))
        return {
          gap: controls.getBoundingClientRect().left - rail.getBoundingClientRect().right,
          obscured,
          overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth
        }
      })
      expect(geometry.gap, `${context} nav/control overlap`).toBeGreaterThanOrEqual(0)
      expect(geometry.obscured, `${context} obscured links`).toEqual([])
      expect(geometry.overflow, `${context} horizontal overflow`).toBeLessThanOrEqual(0)

      const links = page.locator('.nav-rail a')
      await expect(links).toHaveCount(6)
      const tabbable = await links.evaluateAll((els) => els.every((el) => el.tabIndex === 0 && !el.closest('[inert]')))
      expect(tabbable, `${context} nav tabbable`).toBe(true)
      for (let index = 0; index < 6; index += 1) {
        await links.nth(index).focus()
        await expect(links.nth(index), `${context} nav ${index} focusable`).toBeFocused()
      }
      await page.locator('.theme-orbit').focus()
      await expect(page.locator('.theme-orbit'), `${context} theme focusable`).toBeFocused()
    }
  }

  await page.goto('/en/research/')
  await waitForReady(page)
  const themeBefore = await page.locator('html').getAttribute('data-theme')
  await page.locator('.theme-orbit').click()
  await expect(page.locator('html')).not.toHaveAttribute('data-theme', themeBefore ?? '')
  await page.locator('.locale-switcher-desktop a[hreflang="zh-HK"]').click()
  await expect(page).toHaveURL(/\/zh-hk\/research\/$/)
})

test('tablet menu Concerts link navigates to the English archive at 641px', async ({ page }) => {
  await page.setViewportSize({ width: 641, height: 900 })
  await page.goto('/en/research/')
  await waitForReady(page)
  await page.locator('.menu-trigger').click()

  const concerts = page.locator('.mobile-menu a').filter({ hasText: 'Concerts' })
  await expect(concerts).toHaveCount(1)
  await concerts.click()
  await expect(page).toHaveURL(/\/en\/concerts\/$/)
})

test('tablet navigation stays available without JavaScript at 641px', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 641, height: 900 } })
  const page = await context.newPage()
  await page.goto('/en/research/')

  const links = page.locator('.nav-rail a')
  await expect(page.locator('.nav-rail')).toBeVisible()
  await expect(links).toHaveCount(6)
  await expect(page.locator('.menu-trigger')).toBeHidden()
  await expect(page.locator('.locale-switcher-mobile')).toBeVisible()
  await expect(page.locator('.theme-orbit')).toBeHidden()
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow).toBeLessThanOrEqual(0)

  await links.last().click()
  await expect(page).toHaveURL(/\/en\/concerts\/$/)
  await context.close()
})

test('tablet prerendered navigation switches to the menu after delayed takeover', async ({ page }) => {
  await page.setViewportSize({ width: 641, height: 900 })
  let markEntryRequested!: () => void
  let releaseEntry!: () => void
  const entryRequested = new Promise<void>((resolve) => { markEntryRequested = resolve })
  const entryGate = new Promise<void>((resolve) => { releaseEntry = resolve })
  await page.route(/\/assets\/vue\/main-[^/]+\.js$/u, async (route) => {
    markEntryRequested()
    await entryGate
    await route.continue()
  })

  try {
    await page.goto('/en/research/', { waitUntil: 'commit' })
    await entryRequested
    await expect(page.locator('.nav-rail')).toBeVisible()
    await expect(page.locator('.nav-rail a')).toHaveCount(6)
    await expect(page.locator('.menu-trigger')).toBeHidden()
  } finally {
    releaseEntry()
  }

  await expect(page.locator('body')).toHaveAttribute('data-hydrated', 'true')
  await expect(page.locator('.menu-trigger')).toBeVisible()
  await expect(page.locator('.nav-rail')).toBeHidden()
})
