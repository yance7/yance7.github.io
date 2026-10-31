import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const locales = [
  { route: '/', group: '首页照片轮播', second: '显示第 2 张，共 13 张：校园影像' },
  { route: '/zh-hk/', group: '首頁照片輪播', second: '顯示第 2 張，共 13 張：校園影像' },
  { route: '/en/', group: 'Homepage photo carousel', second: 'Show photo 2 of 13: Campus photo' }
] as const

async function expectLoadedImage(page: import('@playwright/test').Page) {
  const image = page.locator('.home-hero-slideshow__image--current')
  await expect.poll(() => image.evaluate((element) => (element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0)
  return image
}

async function openPausedHome(page: import('@playwright/test').Page, route = '/') {
  await page.goto(route)
  const group = page.locator('.home-hero-slideshow__controls')
  const media = page.locator('.home-hero-slideshow__media')
  await expect(group).toBeVisible()
  await expect(page.locator('.home-hero')).toHaveAttribute('data-intro-state', /static|complete/)
  await expectLoadedImage(page)
  await group.locator('.home-hero-slideshow__dot-button').first().click()
  await expect(media).toHaveAttribute('data-current-index', '0')
  await expect(media).toHaveAttribute('data-transitioning', 'false')
  return { group, media }
}

async function freezeCarouselClock(page: import('@playwright/test').Page) {
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1_000))
}

async function mockDocumentVisibility(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    let visibilityState: DocumentVisibilityState = 'visible'
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => visibilityState })
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => visibilityState !== 'visible' })
    ;(window as Window & { setCarouselVisibility?: (value: DocumentVisibilityState) => void }).setCarouselVisibility = (value) => {
      visibilityState = value
      document.dispatchEvent(new Event('visibilitychange'))
    }
  })
}

async function suppressLargestContentfulPaintEntries(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    const NativePerformanceObserver = window.PerformanceObserver
    class SilentLcpObserver extends NativePerformanceObserver {
      observe(options: PerformanceObserverInit) {
        if (options.type === 'largest-contentful-paint') return
        super.observe(options)
      }
    }
    Object.defineProperty(SilentLcpObserver, 'supportedEntryTypes', {
      configurable: true,
      value: NativePerformanceObserver.supportedEntryTypes
    })
    window.PerformanceObserver = SilentLcpObserver
  })
}

test('enables homepage runtime after the first photo decodes when LCP reports no entries', async ({ page }) => {
  await suppressLargestContentfulPaintEntries(page)

  await page.goto('/')
  await expectLoadedImage(page)
  await expect(page.locator('html')).toHaveAttribute('data-home-hero-photo-ready', 'true', { timeout: 2500 })
  await expect(page.locator('.home-hero-slideshow__controls')).toBeVisible()
})

test('starts homepage fonts after hero paint if idle callbacks stay pending', async ({ page }) => {
  await suppressLargestContentfulPaintEntries(page)
  await page.addInitScript(() => {
    window.requestIdleCallback = () => 0
  })
  await page.addInitScript((theme) => localStorage.setItem('yance-theme', theme), 'dark')
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto('/en/')
  await expectLoadedImage(page)
  const root = page.locator('html')
  await expect(root).toHaveAttribute('data-home-hero-photo-ready', 'true', { timeout: 2500 })
  await expect(root).toHaveAttribute('data-fonts-ready', 'ready', { timeout: 5000 })
})

test('requests the first responsive photo at high priority and at most one next photo without duplication', async ({ page, browserName }) => {
  const imageRequests: string[] = []
  const appScripts: string[] = []
  const requestOrder: string[] = []
  const priorities = new Map<string, string>()
  const cdp = browserName === 'chromium' ? await page.context().newCDPSession(page) : null
  if (cdp) {
    await cdp.send('Network.enable')
    cdp.on('Network.requestWillBeSent', (event) => {
      if (event.request.url.includes('/assets/images/home-hero/')) priorities.set(event.request.url, event.request.initialPriority)
    })
  }
  page.on('request', (request) => {
    if (request.resourceType() === 'image' && request.url().includes('/assets/images/home-hero/')) {
      imageRequests.push(request.url())
      requestOrder.push('hero-image')
    }
    if (request.resourceType() === 'script' && /\/assets\/vue\/main-[\w-]+\.js/.test(request.url())) {
      appScripts.push(request.url())
      requestOrder.push('main-script')
    }
  })

  await page.goto('/')
  const image = await expectLoadedImage(page)

  const ids = [...new Set(imageRequests.map((url) => url.match(/hero-(?:0[1-9]|1[0-3])/)?.[0]).filter(Boolean))]
  expect(ids).toContain('hero-01')
  expect(ids.length).toBeLessThanOrEqual(2)
  expect(ids.every((id) => id === 'hero-01' || id === 'hero-02')).toBe(true)
  expect(new Set(imageRequests).size).toBe(imageRequests.length)
  expect(appScripts).toHaveLength(1)
  expect(imageRequests[0]).toContain('hero-01')
  if (cdp) {
    expect(requestOrder.indexOf('hero-image')).toBeLessThan(requestOrder.indexOf('main-script'))
    const preloads = page.locator('link[rel="preload"][as="image"]')
    await expect(preloads).toHaveCount(1)
    const preloadAttributes = await preloads.evaluate((element) => ({
      srcset: element.getAttribute('imagesrcset'),
      sizes: element.getAttribute('imagesizes')
    }))
    expect(preloadAttributes.srcset).toBe(await image.getAttribute('srcset'))
    expect(preloadAttributes.sizes).toBe(await image.getAttribute('sizes'))
    const firstImageUrl = imageRequests.find((url) => url.includes('hero-01'))
    expect(firstImageUrl).toBeDefined()
    expect(priorities.get(firstImageUrl!)).toBe('High')
    await cdp.detach()
  }
  expect(imageRequests.join('\n')).not.toMatch(/Downloads|图片[1-7]/i)
  await expect(page.locator('.home-hero-slideshow__image--current')).toHaveAttribute('alt', '')
})

test('keeps the preloaded hero photo visible while loader confirmation is pending', async ({ page }) => {
  let releaseRequest!: () => void
  const requestGate = new Promise<void>((resolve) => { releaseRequest = resolve })
  await page.route('**/assets/images/home-hero/hero-01-*', async (route) => {
    await requestGate
    await route.continue()
  })

  try {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('.home-hero-slideshow__controls')).toBeVisible()
    const image = page.locator('.home-hero-slideshow__image--current')
    expect(await image.count()).toBe(1)
    await expect(image).toBeVisible()
    expect(await image.getAttribute('src')).toContain('hero-01')
    await expect(image).toHaveCSS('will-change', 'auto')
    await expect(image).toHaveCSS('transform', 'none')
  } finally {
    releaseRequest()
  }

  await expectLoadedImage(page)
})

test('releases English homepage content on the bounded fallback if the first photo remains pending', async ({ page }) => {
  await suppressLargestContentfulPaintEntries(page)
  const clockStart = new Date('2024-01-01T00:00:00.000Z')
  await page.clock.install({ time: clockStart })
  await page.clock.pauseAt(new Date(clockStart.getTime() + 1_000))
  await page.addInitScript(() => {
    const recordedWindow = window as Window & {
      __homeContentFallbackTimers?: Array<{ delay: number; scheduledAt: number }>
    }
    const originalSetTimeout = window.setTimeout.bind(window)
    recordedWindow.__homeContentFallbackTimers = []
    window.setTimeout = ((callback: TimerHandler, delay = 0, ...args: unknown[]) => {
      if (delay === 2_000 || delay === 4_000) {
        recordedWindow.__homeContentFallbackTimers?.push({ delay, scheduledAt: Date.now() })
      }
      return originalSetTimeout(callback, delay, ...args)
    }) as typeof window.setTimeout
  })
  let releaseRequest!: () => void
  let photoRequestStarted = false
  const requestGate = new Promise<void>((resolve) => { releaseRequest = resolve })
  await page.route('**/assets/images/home-hero/hero-01-*', async (route) => {
    photoRequestStarted = true
    await requestGate
    await route.continue()
  })

  try {
    await page.goto('/en/', { waitUntil: 'domcontentloaded' })
    await expect.poll(() => photoRequestStarted).toBe(true)
    await expect(page.locator('.home-hero')).toBeVisible()
    await expect(page.locator('html')).not.toHaveAttribute('data-home-hero-photo-ready', 'true')
    const fallbackStart = await page.evaluate(() => {
      const timers = (window as Window & {
        __homeContentFallbackTimers?: Array<{ delay: number; scheduledAt: number }>
      }).__homeContentFallbackTimers
      return timers?.find(({ delay }) => delay === 2_000 || delay === 4_000)?.scheduledAt ?? null
    })
    expect(fallbackStart).not.toBeNull()
    expect(await page.evaluate(() => Date.now())).toBe(fallbackStart)
    await page.clock.runFor(1_999)
    await expect(page.locator('.site-shell')).toHaveAttribute('data-page-load-state', 'loading')
    await page.clock.runFor(1)
    await expect(page.locator('.site-shell')).toHaveAttribute('data-page-load-state', 'ready')
    await expect(page.locator('.page-home')).toBeVisible()

    const photoState = await page.evaluate(() => ({
      ready: document.documentElement.dataset.homeHeroPhotoReady,
      naturalWidth: document.querySelector<HTMLImageElement>('.home-hero-slideshow__image--current')?.naturalWidth
    }))
    expect(photoState).toEqual({ ready: 'true', naturalWidth: 0 })
  } finally {
    releaseRequest()
  }
})

test('uses the accepted Amiri face for the static glyph while the first photo is pending', async ({ page }) => {
  let releaseRequest!: () => void
  const requestGate = new Promise<void>((resolve) => { releaseRequest = resolve })
  let photoRequestStarted = false
  await page.route('**/assets/images/home-hero/hero-01-*', async (route) => {
    photoRequestStarted = true
    await requestGate
    await route.continue()
  })

  try {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await expect.poll(() => photoRequestStarted).toBe(true)
    const particles = page.locator('.home-hero-particles')
    await expect(particles).toHaveAttribute('data-render-mode', 'static')
    const staticGlyph = await particles.locator('.home-hero-particles-word').evaluate((element) => ({
      fontFamily: getComputedStyle(element).fontFamily,
      photoReady: document.documentElement.dataset.homeHeroPhotoReady,
      naturalWidth: document.querySelector<HTMLImageElement>('.home-hero-slideshow__image--current')?.naturalWidth
    }))
    expect(staticGlyph.photoReady).toBeUndefined()
    expect(staticGlyph.naturalWidth).toBe(0)
    expect(staticGlyph.fontFamily).toBe('Amiri, serif')
  } finally {
    releaseRequest()
  }

  await expectLoadedImage(page)
})

test('selects the crop-sized 896px candidate on a high-density mobile viewport', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })
  const page = await context.newPage()
  const imageRequests: string[] = []
  page.on('request', (request) => {
    if (request.resourceType() === 'image' && request.url().includes('/assets/images/home-hero/')) imageRequests.push(request.url())
  })

  try {
    await page.goto('/')
    const image = await expectLoadedImage(page)
    await expect.poll(() => image.evaluate((element) => (element as HTMLImageElement).currentSrc)).toContain('hero-01-896-')
    expect(imageRequests.some((url) => url.includes('hero-01-896-'))).toBe(true)
  } finally {
    await context.close()
  }
})

test('starts below-fold homepage content after the hero photo paints', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium')
  await page.addInitScript(() => {
    const auditWindow = window as Window & { __homeHeroLcp?: number }
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const candidate = (entry as LargestContentfulPaint).element?.className
        if (auditWindow.__homeHeroLcp === undefined && typeof candidate === 'string' && candidate.includes('home-hero-slideshow__image')) {
          auditWindow.__homeHeroLcp = entry.startTime
        }
      }
    }).observe({ type: 'largest-contentful-paint', buffered: true })
  })

  await page.goto('/')
  await expectLoadedImage(page)
  await expect(page.locator('.page-home')).toBeVisible()
  await expect.poll(() => page.locator('html').getAttribute('data-fonts-ready')).toMatch(/ready|fallback/)
  const timing = await page.evaluate(() => ({
    photoLcp: (window as Window & { __homeHeroLcp?: number }).__homeHeroLcp,
    homePageChunk: performance.getEntriesByType('resource')
      .find((entry) => /\/HomePage-[^/]+\.js$/.test(entry.name))?.startTime,
    localeFontStylesheet: performance.getEntriesByType('resource')
      .find((entry) => /\/fonts-(?:zh-cn|zh-hk|en)-[^/]+\.css$/.test(entry.name))?.startTime
  }))

  expect(timing.photoLcp).toBeDefined()
  expect(timing.homePageChunk).toBeDefined()
  expect(timing.homePageChunk!).toBeGreaterThan(timing.photoLcp!)
  expect(timing.localeFontStylesheet).toBeDefined()
  expect(timing.localeFontStylesheet!).toBeGreaterThan(timing.photoLcp!)
})

test('paints the first photo before mounting slideshow controls', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium')
  await page.addInitScript(() => {
    const auditWindow = window as Window & { __homeHeroPaintOrder?: { photoLcp?: number; controlsAt?: number } }
    const audit: { photoLcp?: number; controlsAt?: number } = {}
    auditWindow.__homeHeroPaintOrder = audit
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const candidate = (entry as LargestContentfulPaint).element?.className
        if (audit.photoLcp === undefined && typeof candidate === 'string' && candidate.includes('home-hero-slideshow__image')) {
          audit.photoLcp = entry.startTime
        }
      }
    }).observe({ type: 'largest-contentful-paint', buffered: true })
    const recordControls = () => {
      if (audit.controlsAt === undefined && document.querySelector('.home-hero-slideshow__controls')) {
        audit.controlsAt = performance.now()
      }
    }
    new MutationObserver(recordControls).observe(document, { childList: true, subtree: true })
  })

  await page.goto('/')
  await expectLoadedImage(page)
  await expect(page.locator('.home-hero-slideshow__controls')).toBeVisible()
  const timing = await page.evaluate(() => {
    const audit = (window as Window & {
      __homeHeroPaintOrder?: { photoLcp?: number; controlsAt?: number }
    }).__homeHeroPaintOrder
    return { photoLcp: audit?.photoLcp, controlsAt: audit?.controlsAt }
  })

  expect(timing?.photoLcp).toBeDefined()
  expect(timing?.controlsAt).toBeDefined()
  expect(timing!.controlsAt!).toBeGreaterThan(timing!.photoLcp!)
})

test('keeps the photo and static YANCE visible while the particle runtime loads', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium')
  let releaseRuntime!: () => void
  const runtimeGate = new Promise<void>((resolve) => { releaseRuntime = resolve })
  let runtimeRequestStarted = false
  await page.route('**/assets/vue/mimoParticleModel-*.js', async (route) => {
    runtimeRequestStarted = true
    await runtimeGate
    await route.continue()
  })
  await page.addInitScript(() => {
    const auditWindow = window as Window & { __homeHeroPaintAudit?: Array<{ kind: string; time: number; candidate?: string }> }
    auditWindow.__homeHeroPaintAudit = []
    const events = auditWindow.__homeHeroPaintAudit
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const candidate = (entry as LargestContentfulPaint).element?.className
        if (typeof candidate === 'string' && candidate.includes('home-hero-slideshow__image')) {
          events.push({ kind: 'photo-lcp', time: entry.startTime, candidate })
        }
      }
    }).observe({ type: 'largest-contentful-paint', buffered: true })
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name.includes('/mimoParticleModel-') || entry.name.includes('/latin-400-') || entry.name.includes('amiri-latin-400')) {
          events.push({ kind: 'particle-runtime-resource', time: entry.startTime, candidate: entry.name })
        }
      }
    }).observe({ type: 'resource', buffered: true })

    const recordCanvasReady = () => {
      if (!document.querySelector('.home-hero-particles[data-render-mode="canvas"]')) return
      if (events.some((event) => event.kind === 'particle-canvas-ready')) return
      events.push({ kind: 'particle-canvas-ready', time: performance.now() })
    }
    new MutationObserver(recordCanvasReady).observe(document, {
      attributes: true,
      attributeFilter: ['data-render-mode'],
      childList: true,
      subtree: true
    })
  })

  try {
    await page.goto('/')
    await expectLoadedImage(page)
    await expect.poll(() => runtimeRequestStarted).toBe(true)
    const particles = page.locator('.home-hero-particles')
    await expect(particles).toHaveAttribute('data-render-mode', 'initializing')
    await expect(particles.locator('.home-hero-particles-word')).toBeVisible()
    const events = await page.evaluate(() => (window as Window & {
      __homeHeroPaintAudit?: Array<{ kind: string; time: number; candidate?: string }>
    }).__homeHeroPaintAudit ?? [])
    const photoPaint = events.find((event) => event.kind === 'photo-lcp')
    expect(photoPaint).toBeDefined()
  } finally {
    releaseRuntime()
  }
  await expect(page.locator('.home-hero-particles')).toHaveAttribute('data-render-mode', 'canvas')
  const events = await page.evaluate(() => (window as Window & {
    __homeHeroPaintAudit?: Array<{ kind: string; time: number; candidate?: string }>
  }).__homeHeroPaintAudit ?? [])
  const photoPaint = events.find((event) => event.kind === 'photo-lcp')
  const runtimeResources = events.filter((event) => event.kind === 'particle-runtime-resource')
  expect(photoPaint).toBeDefined()
  expect(runtimeResources.length).toBeGreaterThan(0)
  expect(runtimeResources.every((event) => event.time > photoPaint!.time), JSON.stringify({ photoPaint, runtimeResources })).toBe(true)
})

test('skips the document-level photo preload and keeps the 640px candidate with Save-Data', async ({ page }) => {
  const imageRequests: string[] = []
  await page.addInitScript(() => {
    const connection = new EventTarget() as EventTarget & { saveData: boolean }
    connection.saveData = true
    Object.defineProperty(navigator, 'connection', { configurable: true, value: connection })
  })
  page.on('request', (request) => {
    if (request.resourceType() === 'image' && request.url().includes('/assets/images/home-hero/')) imageRequests.push(request.url())
  })

  await page.goto('/')
  await expectLoadedImage(page)

  await expect(page.locator('link[rel="preload"][as="image"]')).toHaveCount(0)
  expect(imageRequests).toHaveLength(1)
  expect(imageRequests[0]).toContain('hero-01-640-')
})

test('exposes thirteen localized photo buttons outside the decorative subtree', async ({ page }) => {
  for (const locale of locales) {
    const { group } = await openPausedHome(page, locale.route)
    await expect(group).toHaveAttribute('role', 'group')
    await expect(group).toHaveAttribute('aria-roledescription', /.+/)
    await expect(group).toHaveAccessibleName(locale.group)
    await expect(group.locator('.home-hero-slideshow__dot-button')).toHaveCount(13)
    await expect(group.locator('.home-hero-slideshow__dot-button').nth(1)).toHaveAccessibleName(locale.second)
    expect(await group.evaluate((element) => element.closest('[aria-hidden="true"]') !== null)).toBe(false)
    await expect(group.locator('.home-hero-slideshow__dot-button[aria-current="true"]')).toHaveCount(1)
  }
})

test('manual selection pauses persistently and uses direction by target order without replacing particles', async ({ page }) => {
  const { group, media } = await openPausedHome(page)
  const canvas = page.locator('.home-hero-particles-canvas')
  const canvasHandle = await canvas.elementHandle()
  const stageBefore = await page.locator('.home-hero-particles').evaluate((element) => {
    const stage = element.getBoundingClientRect()
    const visual = element.parentElement!.getBoundingClientRect()
    return { left: stage.left - visual.left, top: stage.top - visual.top, width: stage.width, height: stage.height }
  })

  await group.locator('.home-hero-slideshow__dot-button').nth(6).click()
  await expect(media).toHaveAttribute('data-current-index', '6')
  await expect(media).toHaveAttribute('data-direction', 'forward')
  await expect(group.locator('.home-hero-slideshow__play-button')).toHaveAccessibleName('播放照片轮播')
  await page.mouse.move(1, 1)
  await expect(group.locator('.home-hero-slideshow__play-button')).toHaveAccessibleName('播放照片轮播')

  await group.locator('.home-hero-slideshow__dot-button').first().click()
  await expect(media).toHaveAttribute('data-current-index', '0')
  await expect(media).toHaveAttribute('data-direction', 'backward')
  expect(await canvasHandle!.evaluate((element) => element === document.querySelector('.home-hero-particles-canvas'))).toBe(true)
  const stageAfter = await page.locator('.home-hero-particles').evaluate((element) => {
    const stage = element.getBoundingClientRect()
    const visual = element.parentElement!.getBoundingClientRect()
    return { left: stage.left - visual.left, top: stage.top - visual.top, width: stage.width, height: stage.height }
  })
  expect(stageAfter).toEqual(stageBefore)
  await expect(page.locator('.home-hero')).toHaveAttribute('data-intro-state', /static|complete/)
})

test('the first pointer activation of Pause stays paused after the pointer leaves', async ({ page }) => {
  await page.goto('/')
  const group = page.locator('.home-hero-slideshow__controls')
  const play = group.getByRole('button', { name: /^(暂停|播放)照片轮播$/ })
  await expect(group).toBeVisible()
  await expectLoadedImage(page)
  await expect(play).toHaveAccessibleName('暂停照片轮播')

  await play.click({ position: { x: 2, y: 16 } })
  await expect(play).toHaveAccessibleName('播放照片轮播')
  await page.mouse.move(1, 1)
  await expect(play).toHaveAccessibleName('播放照片轮播')
})

test('keeps only the last manual target selected during an active transition', async ({ page }) => {
  const { group, media } = await openPausedHome(page)
  const dots = group.locator('.home-hero-slideshow__dot-button')

  await dots.nth(1).click()
  await expect(media).toHaveAttribute('data-target-index', '1')
  await expect(media).toHaveAttribute('data-transitioning', 'true')
  await expect(media.locator('.home-hero-slideshow__image--current')).toHaveCSS('will-change', 'transform')
  await dots.nth(6).dispatchEvent('click')
  await dots.nth(3).dispatchEvent('click')

  await expect(media).toHaveAttribute('data-current-index', '1')
  await expect(media).toHaveAttribute('data-target-index', '3')
  await expect(media).toHaveAttribute('data-current-index', '3')
  await expect(dots.nth(3)).toHaveAttribute('aria-current', 'true')
  await expect(media.locator('img')).toHaveCount(1)
})

test('pauses while hovered and resumes with a full dwell after pointer exit', async ({ page }) => {
  await page.clock.install()
  const { group, media } = await openPausedHome(page)
  await freezeCarouselClock(page)
  const visual = page.locator('.home-hero-visual')
  const bounds = await visual.boundingBox()
  await page.mouse.move(bounds!.x + bounds!.width / 2, bounds!.y + bounds!.height / 2)
  await expect(media).toHaveAttribute('data-hovered', 'true')

  const play = group.locator('.home-hero-slideshow__play-button')
  await play.focus()
  await play.press('Enter')
  await page.clock.fastForward(60_000)
  await expect(media).toHaveAttribute('data-current-index', '0')
  await page.mouse.move(1, 1)
  await expect(media).toHaveAttribute('data-hovered', 'false')

  await page.clock.fastForward(2_999)
  expect(await media.getAttribute('data-target-index')).toBeNull()
  await page.clock.fastForward(1)
  await expect(media).toHaveAttribute('data-target-index', '1')
  await page.clock.fastForward(860)
  await expect(media).toHaveAttribute('data-current-index', '1')
})

test('does not catch up while hidden or offscreen and restarts a full dwell on return', async ({ page }) => {
  await page.clock.install()
  await mockDocumentVisibility(page)
  const { group, media } = await openPausedHome(page)
  await freezeCarouselClock(page)
  await page.mouse.move(1, 1)
  await expect(media).toHaveAttribute('data-hovered', 'false')
  const play = group.locator('.home-hero-slideshow__play-button')
  await play.focus()
  await play.press('Enter')

  await page.evaluate(() => (window as Window & { setCarouselVisibility?: (value: DocumentVisibilityState) => void }).setCarouselVisibility!('hidden'))
  await expect(media).toHaveAttribute('data-page-visible', 'false')
  await page.evaluate(() => {
    document.documentElement.style.scrollSnapType = 'none'
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' })
  })
  await expect(media).toHaveAttribute('data-in-viewport', 'false')
  await page.clock.fastForward(60_000)
  await expect(media).toHaveAttribute('data-current-index', '0')

  await page.evaluate(() => (window as Window & { setCarouselVisibility?: (value: DocumentVisibilityState) => void }).setCarouselVisibility!('visible'))
  await expect(media).toHaveAttribute('data-page-visible', 'true')
  await page.clock.fastForward(60_000)
  await expect(media).toHaveAttribute('data-current-index', '0')

  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
  await expect(media).toHaveAttribute('data-in-viewport', 'true')
  await page.clock.fastForward(2_999)
  expect(await media.getAttribute('data-target-index')).toBeNull()
  await page.clock.fastForward(1)
  await expect(media).toHaveAttribute('data-target-index', '1')
  await page.clock.fastForward(860)
  await expect(media).toHaveAttribute('data-current-index', '1')
})

test('advances from 1 to 2 and wraps from 13 to 1 in the same forward direction', async ({ page }) => {
  const { group, media } = await openPausedHome(page)
  const canvas = await page.locator('.home-hero-particles-canvas').elementHandle()
  const play = group.locator('.home-hero-slideshow__play-button')

  await page.mouse.move(1, 1)
  await play.focus()
  await play.press('Enter')
  await expect(media).toHaveAttribute('data-target-index', '1', { timeout: 9_000 })
  await expect(media).toHaveAttribute('data-direction', 'forward')
  await expect(media).toHaveAttribute('data-current-index', '1')

  await group.locator('.home-hero-slideshow__dot-button').nth(12).click()
  await expect(media).toHaveAttribute('data-current-index', '12')
  await page.mouse.move(1, 1)
  await play.focus()
  await play.press('Enter')
  await expect(media).toHaveAttribute('data-target-index', '0', { timeout: 9_000 })
  await expect(media).toHaveAttribute('data-direction', 'forward')
  await expect(media).toHaveAttribute('data-current-index', '0')
  expect(await canvas!.evaluate((element) => element === document.querySelector('.home-hero-particles-canvas'))).toBe(true)
})

test('supports keyboard focus pause and explicit restart while focus remains in the controls', async ({ page }) => {
  const { group, media } = await openPausedHome(page)
  const second = group.locator('.home-hero-slideshow__dot-button').nth(1)
  await group.locator('.home-hero-slideshow__dot-button').first().focus()
  await page.keyboard.press('Tab')
  await expect(second).toBeFocused()
  await expect(second).toHaveCSS('outline-style', 'solid')
  await second.press('Enter')
  await expect(media).toHaveAttribute('data-current-index', '1')

  const last = group.locator('.home-hero-slideshow__dot-button').nth(12)
  await last.focus()
  await expect(last).toBeFocused()
  await last.press('Space')
  await expect(media).toHaveAttribute('data-current-index', '12')

  const play = group.locator('.home-hero-slideshow__play-button')
  await play.focus()
  await play.press('Enter')
  await expect(play).toHaveAccessibleName('暂停照片轮播')
  await expect(play).toBeFocused()
})

test('pauses an active transition when reduced motion is enabled at runtime', async ({ page }) => {
  const { group, media } = await openPausedHome(page)
  const play = group.locator('.home-hero-slideshow__play-button')

  await page.mouse.move(1, 1)
  await play.focus()
  await play.press('Enter')
  await expect(media).toHaveAttribute('data-target-index', '1', { timeout: 9_000 })

  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect(media).toHaveAttribute('data-transitioning', 'false')
  await expect(media).toHaveAttribute('data-current-index', '1')
  await expect(play).toBeDisabled()

  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await expect(play).toHaveAccessibleName('播放照片轮播')
  await expect(media).toHaveAttribute('data-current-index', '1')
})

test('honors reduced motion and forced colors without hiding YANCE or claiming playback', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const { group, media } = await openPausedHome(page)
  const play = group.locator('.home-hero-slideshow__play-button')
  await expect(play).toBeDisabled()
  await group.locator('.home-hero-slideshow__dot-button').nth(1).click()
  await expect(media).toHaveAttribute('data-current-index', '1')
  await expect(media).toHaveAttribute('data-transitioning', 'false')
  await expect(page.locator('.home-hero-slideshow__image--current')).toHaveCSS('transition-property', 'none')

  await page.emulateMedia({ forcedColors: 'active' })
  await expect(page.locator('.home-hero-particles-word')).toBeVisible()
  await expect(page.locator('.home-hero-slideshow__image')).toHaveCount(0)
  await expect(group).toBeVisible()
  await expect(play).toBeDisabled()
  const requests: string[] = []
  page.on('request', (request) => {
    if (request.resourceType() === 'image' && request.url().includes('/assets/images/home-hero/')) requests.push(request.url())
  })
  const selectedDot = group.locator('.home-hero-slideshow__dot-button').nth(3)
  await expect(selectedDot).toBeEnabled()
  await selectedDot.click()
  await expect(selectedDot).toHaveAttribute('aria-current', 'true')
  await expect(group.locator('[aria-live="polite"]')).toContainText('高对比度模式下照片已隐藏')
  expect(requests).toHaveLength(0)
})

test('carousel controls pass a scoped axe accessibility scan', async ({ page }) => {
  await openPausedHome(page)
  const results = await new AxeBuilder({ page }).include('.home-hero-slideshow__controls').analyze()
  expect(results.violations).toEqual([])
})

test('save-data starts with only the small first candidate and waits for an explicit play', async ({ page }) => {
  const imageRequests: string[] = []
  page.on('request', (request) => {
    if (request.resourceType() === 'image' && request.url().includes('/assets/images/home-hero/')) imageRequests.push(request.url())
  })
  await page.addInitScript(() => {
    const connection = new EventTarget() as EventTarget & { saveData: boolean }
    Object.defineProperty(connection, 'saveData', { value: true })
    Object.defineProperty(navigator, 'connection', { configurable: true, value: connection })
  })

  const { group } = await openPausedHome(page)
  expect(imageRequests.some((url) => /hero-01-640-[a-f0-9]+\.webp$/.test(url))).toBe(true)
  expect(imageRequests.some((url) => /hero-02-/.test(url))).toBe(false)
  await page.mouse.move(1, 1)
  const play = group.locator('.home-hero-slideshow__play-button')
  await play.focus()
  await play.press('Enter')
  await expect.poll(() => imageRequests.some((url) => /hero-02-640-[a-f0-9]+\.webp$/.test(url))).toBe(true)
})

test('waits for the resized target candidate to load before revealing it', async ({ page }) => {
  let releaseLargeCandidate!: () => void
  let largeCandidateRequested = false
  let largeCandidateUrl = ''
  let loadedSmallCandidateWidth = 0
  const largeCandidateGate = new Promise<void>((resolve) => { releaseLargeCandidate = resolve })
  const completedHeroRequests = new Set<string>()
  page.on('requestfinished', (request) => {
    const url = request.url()
    if (url.includes('/assets/images/home-hero/')) completedHeroRequests.add(url)
    const width = Number(url.match(/hero-02-(\d+)-/)?.[1] ?? 0)
    loadedSmallCandidateWidth = Math.max(loadedSmallCandidateWidth, width)
  })
  await page.route('**/assets/images/home-hero/hero-02-*', async (route) => {
    const url = route.request().url()
    const width = Number(url.match(/hero-02-(\d+)-/)?.[1] ?? 0)
    if ((page.viewportSize()?.width ?? 0) > 760 && width > loadedSmallCandidateWidth) {
      largeCandidateRequested = true
      largeCandidateUrl = url
      await largeCandidateGate
    }
    await route.continue()
  })

  await page.clock.install()
  await page.setViewportSize({ width: 390, height: 844 })
  try {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    const controls = page.locator('.home-hero-slideshow__controls')
    const media = page.locator('.home-hero-slideshow__media')
    await expect(controls).toBeVisible()
    await expect(page.locator('.home-hero')).toHaveAttribute('data-intro-state', /static|complete/)
    await freezeCarouselClock(page)
    await expect(media).toHaveAttribute('data-current-index', '0')
    await expectLoadedImage(page)
    await expect.poll(() => [...completedHeroRequests].some((url) => /hero-02-\d+-[a-f0-9]+\.webp$/.test(url))).toBe(true)
    expect(loadedSmallCandidateWidth).toBeGreaterThan(0)
    await expect(media).toHaveAttribute('data-current-index', '0')

    const play = controls.locator('.home-hero-slideshow__play-button')
    if (await play.getAttribute('aria-label') === '暂停照片轮播') await play.click()
    await page.setViewportSize({ width: 1440, height: 900 })
    await controls.locator('.home-hero-slideshow__dot-button').nth(1).click()

    const target = page.locator('.home-hero-slideshow__image--target')
    await expect.poll(() => largeCandidateRequested).toBe(true)
    expect(Number(largeCandidateUrl.match(/hero-02-(\d+)-/)?.[1] ?? 0)).toBeGreaterThan(loadedSmallCandidateWidth)
    await page.clock.runFor(50)
    await expect(target).toHaveJSProperty('naturalWidth', 0)
    await expect(media).toHaveAttribute('data-current-index', '0')
    await expect(media).toHaveAttribute('data-transitioning', 'false')
    await expect(media).not.toHaveClass(/is-transitioning/)

    releaseLargeCandidate()
    await expect.poll(() => target.evaluate((element) => (element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0)
    await target.evaluate((element) => (element as HTMLImageElement).decode())
    await page.clock.runFor(16)
    await expect(media).toHaveClass(/is-transitioning/)
    await expect(controls.locator('.home-hero-slideshow__dot-button').nth(1)).toHaveAttribute('aria-current', 'true')
    await expect(media).toHaveAttribute('data-current-index', '0')
    await page.clock.runFor(1_000)
    await expect(media).toHaveAttribute('data-current-index', '1')
    await expect.poll(() => page.locator('.home-hero-slideshow__image--current').evaluate((element) => (element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0)
  } finally {
    releaseLargeCandidate()
  }
})

test('falls back to JPEG after a WebP request fails', async ({ page }) => {
  await page.route('**/assets/images/home-hero/hero-01-*.webp', (route) => route.abort('failed'))
  await page.goto('/')
  await expect.poll(() => page.locator('.home-hero-slideshow__image--current').getAttribute('srcset')).toContain('.jpg')
  await expect.poll(() => page.locator('.home-hero-slideshow__image--current').evaluate((element) => (element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0)
  await expect(page.locator('.home-hero-slideshow__image--current')).toHaveJSProperty('complete', true)
})

test('keeps the current photo and announces a manual failure, then retries on the next explicit selection', async ({ page }) => {
  const failedPath = '**/assets/images/home-hero/hero-03-*'
  await page.route(failedPath, (route) => route.abort('failed'))
  const { group, media } = await openPausedHome(page)
  await group.locator('.home-hero-slideshow__dot-button').nth(2).click()
  await expect(group.locator('[aria-live="polite"]')).toContainText('暂时无法加载')
  await expect(media).toHaveAttribute('data-current-index', '0')
  await page.unroute(failedPath)
  await group.locator('.home-hero-slideshow__dot-button').nth(2).click()
  await expect(media).toHaveAttribute('data-current-index', '2')
  await expect(group.locator('[aria-live="polite"]')).toContainText('合影')
})

test('keeps carousel controls inside 320px and 390px cards without page overflow', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 })
  const { group } = await openPausedHome(page)
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 844 })
    const layout = await page.evaluate(() => {
      const stage = document.querySelector('.home-hero-particles')!.getBoundingClientRect()
      const controls = document.querySelector('.home-hero-slideshow__panel')!.getBoundingClientRect()
      const buttons = [...document.querySelectorAll<HTMLElement>('.home-hero-slideshow__dot-button, .home-hero-slideshow__play-button')]
      const dots = [...document.querySelectorAll<HTMLElement>('.home-hero-slideshow__dot-button')]
      const dotBounds = dots.map((dot) => dot.getBoundingClientRect())
      const rowTops = [...new Set(dotBounds.map((bounds) => Math.round(bounds.top * 10) / 10))].sort((a, b) => a - b)
      const play = document.querySelector<HTMLElement>('.home-hero-slideshow__play-button')!.getBoundingClientRect()
      return {
        viewport: window.innerWidth,
        document: document.documentElement.scrollWidth,
        stage: { left: stage.left, right: stage.right, bottom: stage.bottom, height: stage.height },
        controls: { left: controls.left, right: controls.right, bottom: controls.bottom, height: controls.height },
        rowCounts: rowTops.map((top) => dotBounds.filter((bounds) => Math.round(bounds.top * 10) / 10 === top).length),
        dotsRight: Math.max(...dotBounds.map((bounds) => bounds.right)),
        play: { left: play.left, centerY: play.top + play.height / 2 },
        controlsCenterY: controls.top + controls.height / 2,
        minButton: Math.min(...buttons.map((button) => {
          const bounds = button.getBoundingClientRect()
          return Math.min(bounds.width, bounds.height)
        })),
        touchAction: getComputedStyle(document.querySelector('.home-hero-particles')!).touchAction
      }
    })
    expect(layout.document).toBeLessThanOrEqual(layout.viewport)
    expect(layout.controls.left).toBeGreaterThanOrEqual(layout.stage.left)
    expect(layout.controls.right).toBeLessThanOrEqual(layout.stage.right)
    expect(layout.controls.bottom).toBeLessThanOrEqual(layout.stage.bottom)
    expect(layout.minButton).toBeGreaterThanOrEqual(28)
    expect(layout.touchAction).toContain('pan-y')
    expect(layout.rowCounts).toEqual(width <= 760 ? [7, 6] : [13])
    expect(layout.play.left).toBeGreaterThan(layout.dotsRight)
    if (width <= 760) {
      expect(layout.controls.height).toBeGreaterThanOrEqual(68)
      expect(layout.controls.height).toBeLessThanOrEqual(80)
      expect(Math.abs(layout.play.centerY - layout.controlsCenterY)).toBeLessThanOrEqual(1)
    }
    await expect(group.locator('.home-hero-slideshow__dot-button')).toHaveCount(13)
  }
})

test('touching slideshow controls pauses without a particle ripple', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'Touch pointer routing is covered by the Android Chromium browser project')
  await page.clock.install()
  const { group, media } = await openPausedHome(page)
  await freezeCarouselClock(page)
  await page.mouse.move(1, 1)
  await expect(media).toHaveAttribute('data-hovered', 'false')
  const play = group.locator('.home-hero-slideshow__play-button')
  await play.focus()
  await play.press('Enter')
  const ripple = page.locator('.home-hero-touch-ripple')
  await expect(ripple).toBeVisible()

  const dot = group.locator('.home-hero-slideshow__dot-button').nth(2)
  await dot.evaluate((element) => {
    const bounds = element.getBoundingClientRect()
    element.dispatchEvent(new PointerEvent('pointerdown', {
      bubbles: true,
      pointerId: 93,
      pointerType: 'touch',
      isPrimary: true,
      clientX: bounds.left + bounds.width / 2,
      clientY: bounds.top + bounds.height / 2
    }))
  })
  await expect(media).toHaveAttribute('data-touch-active', 'true')
  await expect(ripple).toHaveAttribute('data-active', 'false')
  await page.clock.fastForward(60_000)
  await expect(media).toHaveAttribute('data-current-index', '0')

  await page.evaluate(() => window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 93, pointerType: 'touch' })))
  await expect(media).toHaveAttribute('data-touch-active', 'false')
  await page.clock.fastForward(2_999)
  await page.clock.fastForward(1)
  await expect(media).toHaveAttribute('data-target-index', '1')
  await page.clock.fastForward(860)
  await expect(media).toHaveAttribute('data-current-index', '1')

  const canvas = page.locator('.home-hero-particles-canvas')
  await canvas.evaluate((element) => {
    const bounds = element.getBoundingClientRect()
    element.dispatchEvent(new PointerEvent('pointerdown', {
      bubbles: true,
      pointerId: 94,
      pointerType: 'touch',
      isPrimary: true,
      clientX: bounds.left + bounds.width / 2,
      clientY: bounds.top + bounds.height / 2
    }))
  })
  await expect(ripple).toHaveAttribute('data-active', 'true')
})
