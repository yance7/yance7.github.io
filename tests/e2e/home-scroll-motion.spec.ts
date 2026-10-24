import { expect, test, type Page } from '@playwright/test'
import { startFontReadinessObservation, type FontReadinessObservation } from './helpers/fontReadiness'

const fontAssertions = new WeakMap<Page, {
  startedAt: number, finishedAt?: number, observation?: FontReadinessObservation
}[]>()

// Passive evidence for readiness failures: preserve the original assertion and timing.
test.beforeEach(async ({ page }) => {
  fontAssertions.set(page, [])
  await page.addInitScript(() => {
    const timeline: Record<string, unknown>[] = []
    const record = (event: string, details: Record<string, unknown> = {}) => {
      if (timeline.length < 100) timeline.push({
        event, time: performance.now(), wallTime: Date.now(),
        visibility: document.visibilityState, ...details
      })
    }
    Object.defineProperty(window, '__fontReadinessTimeline', { value: timeline })
    const scrollTimeline: Record<string, unknown>[] = []
    Object.defineProperty(window, '__homeScrollTimeline', { value: scrollTimeline })
    const recordScroll = (event: string, key?: string) => {
      if (scrollTimeline.length === 100) scrollTimeline.shift()
      scrollTimeline.push({ event, key, time: performance.now(), wallTime: Date.now(), scrollY })
    }
    document.addEventListener('keydown', event => {
      if (event.key === 'Home' || event.key === 'End') recordScroll('keydown', event.key)
    })
    document.addEventListener('scroll', () => recordScroll('scroll'), { passive: true })
    document.addEventListener('scrollend', () => recordScroll('scrollend'), { passive: true })
    const observer = new MutationObserver(records => {
      for (const mutation of records) {
        if (mutation.target !== document.documentElement) continue
        record('fonts-ready-attribute', {
          oldValue: mutation.oldValue,
          value: document.documentElement.getAttribute('data-fonts-ready')
        })
      }
    })
    observer.observe(document, {
      subtree: true, attributes: true, attributeOldValue: true,
      attributeFilter: ['data-fonts-ready']
    })
    const recordReadyPromise = () => {
      void document.fonts.ready.then(() => record('font-set-ready-promise'))
    }
    document.fonts.addEventListener('loading', () => {
      record('font-set-loading')
      recordReadyPromise()
    })
    document.fonts.addEventListener('loadingdone', () => record('font-set-loadingdone'))
    document.fonts.addEventListener('loadingerror', () => record('font-set-loadingerror'))
    document.addEventListener('visibilitychange', () => record('visibilitychange'))
    window.addEventListener('pageshow', event => record('pageshow', { persisted: event.persisted }))
    record('init')
    recordReadyPromise()
  })
})

test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.status === testInfo.expectedStatus) return
  await testInfo.attach('font-readiness-assertions', {
    body: JSON.stringify(fontAssertions.get(page) ?? [], null, 2),
    contentType: 'application/json'
  })
  const browser = await page.evaluate(() => ({
    timeOrigin: performance.timeOrigin,
    time: performance.now(), wallTime: Date.now(), visibility: document.visibilityState,
    state: document.documentElement.dataset.fontsReady,
    fontStatus: document.fonts.status,
    fontFaces: Array.from(document.fonts)
      .filter(face => face.status !== 'unloaded')
      .map(face => ({ family: face.family, weight: face.weight, style: face.style, status: face.status })),
    hash: location.hash,
    initialHash: document.documentElement.dataset.initialHash, scrollY,
    timeline: (window as Window & { __fontReadinessTimeline?: unknown }).__fontReadinessTimeline,
    scrollTimeline: (window as Window & { __homeScrollTimeline?: unknown }).__homeScrollTimeline,
    geometry: {
      scrollHeight: document.documentElement.scrollHeight, viewportHeight: innerHeight,
      nativeScrollEnded: document.documentElement.dataset.nativeScrollEnded,
      snap: getComputedStyle(document.documentElement).scrollSnapType,
      focusedTag: document.activeElement?.tagName,
      focusedClass: document.activeElement?.className,
      footer: document.querySelector('.site-footer')?.getBoundingClientRect().toJSON(),
      sections: Array.from(document.querySelectorAll('.page-home > section')).map(element => ({
        id: element.id, ...element.getBoundingClientRect().toJSON()
      }))
    },
    resources: performance.getEntriesByType('resource')
      .filter(entry => /(?:fonts[^/]*\.css|\.woff2?(?:\?|$))/.test(entry.name))
      .map(entry => entry.toJSON())
  })).catch(error => ({ unavailable: String(error) }))
  await testInfo.attach('font-readiness-timeline', {
    body: JSON.stringify({ assertions: fontAssertions.get(page), browser }, null, 2),
    contentType: 'application/json'
  })
})

async function openHome(page: Page, path = '/') {
  await page.goto(path)
  await expect(page.locator('.site-shell')).toHaveAttribute('data-page-load-state', 'ready')
  const assertion: { startedAt: number, finishedAt?: number, observation?: FontReadinessObservation } = {
    startedAt: Date.now()
  }
  fontAssertions.get(page)?.push(assertion)
  try {
    // Observe strictly ready inside the original five-second window. The
    // browser witness survives a delayed protocol reply; the test's existing
    // total timeout still bounds receipt. Do not restart the observation clock.
    const deadline = assertion.startedAt + 5000
    const observation = await page.evaluateHandle(startFontReadinessObservation, deadline)
    try {
      assertion.observation = await observation.evaluate(holder => holder.result)
    } finally {
      await observation.dispose()
    }
    expect(assertion.observation.state, JSON.stringify(assertion.observation)).toBe('ready')
    expect(assertion.observation.observedAt).toBeLessThanOrEqual(deadline)
  } finally {
    assertion.finishedAt = Date.now()
  }
}

async function hasDesktopInput(page: Page) {
  return page.evaluate(() => matchMedia('(min-width: 1025px) and (hover: hover) and (pointer: fine)').matches)
}

test.describe('font readiness observation', () => {
  const start = Date.UTC(2026, 9, 19)

  test.beforeEach(async ({ page }) => {
    await page.clock.install({ time: start })
    await page.clock.pauseAt(start)
    await page.setContent('<html data-fonts-ready="loading"><body></body></html>')
  })

  test('retains an in-window ready witness when consumed after the deadline', async ({ page }) => {
    const observation = await page.evaluateHandle(startFontReadinessObservation, start + 5000)
    try {
      await page.clock.runFor(4472)
      await page.evaluate(() => { document.documentElement.dataset.fontsReady = 'ready' })
      await page.clock.runFor(1000)
      expect(await observation.evaluate(holder => holder.result))
        .toEqual({ state: 'ready', observedAt: start + 4472, deadline: start + 5000 })
    } finally {
      await observation.dispose()
    }
  })

  test('rejects late ready even before a delayed deadline timer runs', async ({ page }) => {
    const observation = await page.evaluateHandle(startFontReadinessObservation, start + 5000)
    try {
      // Changing wall time does not execute the pending timer.
      await page.clock.setSystemTime(start + 5001)
      await page.evaluate(() => { document.documentElement.dataset.fontsReady = 'ready' })
      expect(await observation.evaluate(holder => holder.result))
        .toEqual({ state: 'timeout', observedAt: start + 5001, deadline: start + 5000 })
    } finally {
      await observation.dispose()
    }
  })

  test('rejects fallback rather than accepting a terminal font state as ready', async ({ page }) => {
    const observation = await page.evaluateHandle(startFontReadinessObservation, start + 5000)
    try {
      await page.clock.runFor(100)
      await page.evaluate(() => { document.documentElement.dataset.fontsReady = 'fallback' })
      expect(await observation.evaluate(holder => holder.result))
        .toEqual({ state: 'fallback', observedAt: start + 100, deadline: start + 5000 })
    } finally {
      await observation.dispose()
    }
  })

  test('rejects fonts that remain loading at the original deadline', async ({ page }) => {
    const observation = await page.evaluateHandle(startFontReadinessObservation, start + 5000)
    try {
      await page.clock.runFor(5000)
      expect(await observation.evaluate(holder => holder.result))
        .toEqual({ state: 'timeout', observedAt: start + 5000, deadline: start + 5000 })
    } finally {
      await observation.dispose()
    }
  })

  test('accepts fonts already ready when observation starts within the window', async ({ page }) => {
    await page.evaluate(() => { document.documentElement.dataset.fontsReady = 'ready' })
    const observation = await page.evaluateHandle(startFontReadinessObservation, start + 5000)
    try {
      expect(await observation.evaluate(holder => holder.result))
        .toEqual({ state: 'ready', observedAt: start, deadline: start + 5000 })
    } finally {
      await observation.dispose()
    }
  })

  test('rejects an initial ready read when installation itself misses the window', async ({ page }) => {
    await page.clock.setSystemTime(start + 5001)
    await page.evaluate(() => { document.documentElement.dataset.fontsReady = 'ready' })
    const observation = await page.evaluateHandle(startFontReadinessObservation, start + 5000)
    try {
      expect(await observation.evaluate(holder => holder.result))
        .toEqual({ state: 'timeout', observedAt: start + 5001, deadline: start + 5000 })
    } finally {
      await observation.dispose()
    }
  })
})

test('home native snap follows desktop input, width and runtime motion preferences', async ({ page }) => {
  await openHome(page)
  const desktop = await hasDesktopInput(page)
  expect(await page.evaluate(() => scrollY)).toBe(0)
  // Browsers serialize the default proximity keyword as just "y".
  await expect(page.locator('html')).toHaveCSS('scroll-snap-type', desktop ? /^y(?: proximity)?$/ : 'none')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect(page.locator('html')).toHaveCSS('scroll-snap-type', 'none')
  await expect(page.locator('.reveal:not(.revealed)')).toHaveCount(0)
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await expect(page.locator('html')).toHaveCSS('scroll-snap-type', desktop ? /^y(?: proximity)?$/ : 'none')
  await page.setViewportSize({ width: 640, height: 844 })
  await expect(page.locator('html')).toHaveCSS('scroll-snap-type', 'none')
})

test('native proximity aligns near a stable section and permits reading between targets', async ({ page }) => {
  await openHome(page)
  test.skip(!await hasDesktopInput(page), 'Native snapping is reserved for desktop fine pointers')
  const target = page.locator('#home-worlds')
  await page.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto' })
  await target.evaluate(element => {
    const top = scrollY + element.getBoundingClientRect().top
    const offset = parseFloat(getComputedStyle(element).scrollMarginTop)
    scrollTo({ top: top - offset - 24, behavior: 'instant' })
  })
  await expect.poll(() => target.evaluate(element => Math.abs(
    element.getBoundingClientRect().top - parseFloat(getComputedStyle(element).scrollMarginTop)
  ))).toBeLessThan(3)
  await expect(target).toHaveCSS('transform', 'none')
  const middle = await target.evaluate(element => {
    const rect = element.getBoundingClientRect()
    const top = Math.round(scrollY + rect.top + rect.height * 0.5)
    scrollTo({ top, behavior: 'instant' })
    return top
  })
  await expect.poll(() => page.evaluate(() => scrollY)).toBeCloseTo(middle, 0)
  await page.mouse.wheel(0, 1800)
  await expect.poll(() => page.locator('#home-beyond').evaluate(element =>
    element.getBoundingClientRect().top <= parseFloat(getComputedStyle(element).scrollMarginTop) + 1
  )).toBe(true)
  await page.locator('.site-footer').scrollIntoViewIfNeeded()
  await expect(page.locator('.site-footer')).toBeInViewport()
})

test('home direct hash opens below navigation with its content already revealed', async ({ page }) => {
  await openHome(page, '/#home-beyond')
  await expect(page.locator('#home-beyond .reveal:not(.revealed)')).toHaveCount(0)
  await expect.poll(() => page.locator('#home-beyond .section-head').evaluate(element => {
    const header = document.querySelector('.site-nav')!.getBoundingClientRect()
    return element.getBoundingClientRect().top >= Math.max(0, header.bottom)
  })).toBe(true)
  await expect(page.locator('html')).toHaveCSS('scroll-snap-type', 'none')
})

test('focus reveals a pending home card synchronously and preserves native keyboard scrolling', async ({ page }) => {
  await openHome(page)
  const card = page.locator('.world-card').last()
  await expect(card).not.toHaveClass(/revealed/)
  const opacity = await card.evaluate(element => {
    element.focus({ preventScroll: true })
    return getComputedStyle(element).opacity
  })
  expect(opacity).toBe('1')
  await expect(card).toHaveClass(/revealed/)
  await expect(page.locator('html')).toHaveCSS('scroll-snap-type', 'none')
  // Reaching the last pixel precedes Chromium's native scroll completion.
  // Wait for the End operation itself before issuing the opposite operation.
  await page.evaluate(() => {
    document.documentElement.dataset.nativeScrollEnded = 'false'
    document.addEventListener('scrollend', () => {
      document.documentElement.dataset.nativeScrollEnded = 'true'
    }, { once: true })
  })
  await page.keyboard.press('End')
  await expect(page.locator('.site-footer')).toBeInViewport()
  await expect.poll(() => page.evaluate(() => Math.abs(
    scrollY - (document.documentElement.scrollHeight - innerHeight)
  ))).toBeLessThan(2)
  await expect(page.locator('html')).toHaveAttribute('data-native-scroll-ended', 'true')
  await page.keyboard.press('Home')
  await expect(page.locator('.home-hero')).toBeInViewport()
})

test('native home scrolling reaches the entire natural footer', async ({ page }) => {
  await openHome(page)
  test.skip(!await hasDesktopInput(page), 'Desktop native proximity tail must allow footer access')
  await expect(page.locator('html')).toHaveClass(/home-scroll-snap/)
  await expect(page.locator('.site-footer')).toHaveCSS('scroll-snap-align', 'end')
  await page.locator('#home-beyond').evaluate(element => element.scrollIntoView({ behavior: 'instant', block: 'start' }))
  await page.mouse.wheel(0, 1200)
  await page.mouse.wheel(0, 1200)
  await expect.poll(() => page.evaluate(() => Math.abs(
    scrollY - (document.documentElement.scrollHeight - innerHeight)
  ))).toBeLessThan(2)
  await expect.poll(() => page.locator('.site-footer').evaluate(element => element.getBoundingClientRect().bottom))
    .toBeLessThanOrEqual(await page.evaluate(() => innerHeight + 1))
})

test('home reveals remain visible after scrolling up and changing theme', async ({ page }) => {
  await openHome(page)
  await page.locator('.site-footer').scrollIntoViewIfNeeded()
  await expect(page.locator('.reveal:not(.revealed)')).toHaveCount(0)
  await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }))
  await page.locator('.theme-orbit').click()
  await expect(page.locator('.reveal:not(.revealed)')).toHaveCount(0)
  await expect.poll(() => page.locator('.page-home .reveal').evaluateAll(elements => elements.every(
    element => getComputedStyle(element).opacity === '1'
  ))).toBe(true)
})

test('home Hero anchors and history navigation preserve their native target', async ({ page }) => {
  await openHome(page)
  const action = page.locator('.home-hero-actions a[href="#home-worlds"]')
  await action.focus()
  await action.click()
  await expect(page).toHaveURL(/#home-worlds$/)
  await expect(page.locator('#home-worlds .reveal:not(.revealed)')).toHaveCount(0)
  await expect(page.locator('html')).toHaveCSS('scroll-snap-type', 'none')
  // URL and reveal state change before the native anchor scroll completes.
  await expect(page.locator('#home-worlds .section-head')).toBeInViewport()
  await page.goto('/research/')
  await page.goBack()
  await expect(page).toHaveURL(/#home-worlds$/)
  await expect(page.locator('#home-worlds .section-head')).toBeInViewport()
  await page.goForward()
  await expect(page).toHaveURL(/\/research\/$/)
  await expect(page.locator('html')).not.toHaveClass(/home-scroll-snap/)
})

test('home snap yields to scroll locks and resumes after unlock', async ({ page }) => {
  await openHome(page)
  test.skip(!await hasDesktopInput(page), 'Desktop input is required for snap lifecycle')
  await page.evaluate(() => { document.body.style.overflow = 'hidden' })
  await expect(page.locator('html')).toHaveCSS('scroll-snap-type', 'none')
  await page.evaluate(() => { document.body.style.removeProperty('overflow') })
  await expect(page.locator('html')).toHaveCSS('scroll-snap-type', /^y(?: proximity)?$/)
})

test('home history restores a reading position without snapping to a chapter', async ({ page }) => {
  await openHome(page)
  await page.locator('.theme-orbit').focus()
  const position = await page.locator('#home-worlds').evaluate(element => {
    const top = Math.round(scrollY + element.getBoundingClientRect().top + element.getBoundingClientRect().height * 0.4)
    scrollTo({ top, behavior: 'instant' })
    return Math.round(top)
  })
  await expect.poll(() => page.evaluate(() => Math.round(scrollY))).toBe(position)
  await page.goto('/research/')
  await page.goBack()
  await expect(page.locator('.site-shell')).toHaveAttribute('data-page-load-state', 'ready')
  await expect.poll(() => page.evaluate(() => Math.round(scrollY))).toBe(position)
  await expect(page.locator('html')).toHaveCSS('scroll-snap-type', 'none')
})

for (const cancelWithTouch of [false, true]) {
  test(`home history ${cancelWithTouch ? 'yields to touch input' : 'waits for locale fonts'} during cold restoration`, async ({ page }) => {
    await openHome(page)
    await page.locator('.theme-orbit').focus()
    await page.evaluate(() => scrollTo({ top: 700, behavior: 'instant' }))
    await expect.poll(() => page.evaluate(() => Math.round(scrollY))).toBe(700)
    await page.goto('/research/')
    let releaseFonts = () => {}
    const heldFonts = new Promise<void>(resolve => { releaseFonts = resolve })
    let pendingFonts = 0
    await page.route('**/assets/vue/fonts-*.css', async route => {
      pendingFonts += 1
      await heldFonts
      await route.continue()
    })
    try {
      await page.goBack({ waitUntil: 'domcontentloaded' })
      await expect(page.locator('.site-shell')).toHaveAttribute('data-page-load-state', 'ready')
      await expect.poll(() => pendingFonts).toBeGreaterThan(0)
      await expect(page.locator('html')).toHaveAttribute('data-fonts-ready', 'loading')
      await expect(page.locator('html')).toHaveAttribute('data-home-scroll-restore', 'true')
      await expect(page.locator('html')).toHaveCSS('scroll-behavior', 'auto')
      if (cancelWithTouch) {
        await page.locator('.home-hero-particles').dispatchEvent('pointerdown', { pointerType: 'touch' })
        await expect(page.locator('html')).not.toHaveAttribute('data-home-scroll-restore')
        await page.evaluate(() => scrollTo({ top: 200, behavior: 'instant' }))
      }
      releaseFonts()
      await expect(page.locator('html')).toHaveAttribute('data-fonts-ready', 'ready')
      await expect(page.locator('html')).not.toHaveAttribute('data-home-scroll-restore')
      await expect.poll(() => page.evaluate(() => Math.round(scrollY))).toBe(cancelWithTouch ? 200 : 700)
    } finally {
      releaseFonts()
    }
  })
}

test('home cold history restores without foreground animation frame delivery', async ({ page }) => {
  await openHome(page)
  await page.locator('.theme-orbit').focus()
  await page.evaluate(() => scrollTo({ top: 700, behavior: 'instant' }))
  await expect.poll(() => page.evaluate(() => Math.round(scrollY))).toBe(700)
  await page.goto('/research/')
  let releaseFonts = () => {}
  const heldFonts = new Promise<void>(resolve => { releaseFonts = resolve })
  await page.route('**/assets/vue/fonts-*.css', async route => {
    await heldFonts
    await route.continue()
  })
  try {
    await page.goBack({ waitUntil: 'domcontentloaded' })
    await expect(page.locator('.site-shell')).toHaveAttribute('data-page-load-state', 'ready')
    await expect(page.locator('html')).toHaveAttribute('data-home-scroll-restore', 'true')
    await page.evaluate(() => { window.requestAnimationFrame = () => 0 })
    releaseFonts()
    await expect(page.locator('html')).toHaveAttribute('data-fonts-ready', 'ready')
    await expect(page.locator('html')).not.toHaveAttribute('data-home-scroll-restore')
    await expect.poll(() => page.evaluate(() => Math.round(scrollY))).toBe(700)
  } finally {
    releaseFonts()
  }
})

test('home loading failure keeps native document scrolling available', async ({ page }) => {
  await page.route('**/assets/vue/HomePage-*.js', route => route.abort())
  await page.goto('/')
  await expect(page.locator('.site-shell')).toHaveAttribute('data-page-load-state', 'error')
  await expect(page.locator('.home-hero')).toBeVisible()
  await expect(page.locator('html')).not.toHaveClass(/home-scroll-snap/)
  await expect(page.locator('html')).toHaveCSS('scroll-snap-type', 'none')
})

test('home stays visible when IntersectionObserver is unavailable', async ({ page }) => {
  await page.addInitScript(() => { delete (window as unknown as { IntersectionObserver?: unknown }).IntersectionObserver })
  await openHome(page)
  await expect(page.locator('.page-home .reveal')).not.toHaveCount(0)
  await expect(page.locator('.page-home .reveal:not(.revealed)')).toHaveCount(0)
})

test('immediate focus reveal restores the normal card interaction transitions', async ({ page }) => {
  await openHome(page)
  const card = page.locator('.focus-product')
  await card.locator('.focus-card-main').focus()
  await expect(card).toHaveClass(/revealed/)
  await expect(card).not.toHaveAttribute('data-reveal-immediate', 'true')
  await expect.poll(() => card.evaluate(element => getComputedStyle(element).transitionDuration)).not.toBe('0s')
})

test('focus during an observer-triggered home stagger immediately shows its card', async ({ page }) => {
  await openHome(page)
  await page.locator('.theme-orbit').focus()
  const card = page.locator('.world-card').last()
  await card.evaluate(element => element.scrollIntoView({ block: 'center', behavior: 'instant' }))
  await expect(card).toBeInViewport()
  await expect(card).toHaveClass(/revealed/)
  const opacity = await card.evaluate(element => {
    element.focus({ preventScroll: true })
    return getComputedStyle(element).opacity
  })
  expect(opacity).toBe('1')
  await expect.poll(() => card.evaluate(element => getComputedStyle(element).transitionDuration)).not.toBe('0s')
})

test('home reload keeps its fragment URL while foreground drawing frames are unavailable', async ({ page }) => {
  await openHome(page, '/en/#home-worlds')
  await expect(page).toHaveURL(/#home-worlds$/)
  await page.addInitScript(() => {
    window.requestAnimationFrame = () => 1
    window.cancelAnimationFrame = () => {}
  })
  await page.reload()
  await expect(page.locator('.site-shell')).toHaveAttribute('data-page-load-state', 'ready')
  await expect(page.locator('#home-worlds')).toBeAttached()
  await expect(page).toHaveURL(/#home-worlds$/)
})

for (const path of ['/zh-hk/', '/en/']) {
  test(`home hash content in ${path} avoids replay on reload`, async ({ page }) => {
    await openHome(page, `${path}#home-worlds`)
    await expect(page.locator('#home-worlds .reveal:not(.revealed)')).toHaveCount(0)
    await expect(page).toHaveURL(/#home-worlds$/)
    await page.reload()
    await expect(page.locator('.site-shell')).toHaveAttribute('data-page-load-state', 'ready')
    await expect(page.locator('#home-worlds')).toBeAttached()
    await expect(page.locator('#home-worlds .reveal:not(.revealed)')).toHaveCount(0)
    await expect(page).toHaveURL(/#home-worlds$/)
    await expect(page.locator('html')).toHaveCSS('scroll-snap-type', 'none')
  })
}

for (const route of ['academics', 'honors', 'research', 'works', 'concerts', '404']) {
  test(`${route} does not inherit home document snap`, async ({ page }) => {
    await page.goto(route === '404' ? '/404.html' : `/${route}/`)
    await expect(page.locator('html')).not.toHaveClass(/home-scroll-snap/)
    await expect(page.locator('html')).toHaveCSS('scroll-snap-type', 'none')
  })
}
