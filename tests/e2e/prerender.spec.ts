import { expect, test } from '@playwright/test'

const staticPages = [
  { key: 'home', path: '/', evidenceHref: 'https://fresheye.yance.me' },
  { key: 'academics', path: '/academics/' },
  { key: 'honors', path: '/honors/' },
  { key: 'research', path: '/research/', evidenceHref: 'https://github.com/yance7/FishFreshNetV2' },
  { key: 'works', path: '/works/', evidenceHref: 'https://fresheye.yance.me' }
]
const locales = [
  { prefix: '', key: 'zh-CN', notice: '核心内容与链接可直接浏览' },
  { prefix: '/zh-hk', key: 'zh-HK', notice: '核心內容與連結可直接瀏覽' },
  { prefix: '/en', key: 'en', notice: 'Core content and links remain available without JavaScript' }
]
const routes = locales.flatMap(({ prefix, key, notice }) => staticPages.map(({ key: pageKey, path, evidenceHref }) => ({
  path: prefix ? `${prefix}${path}` : path,
  pageKey,
  locale: key,
  notice,
  evidenceHref
})))

async function deferGreetingFontFallback(page: import('@playwright/test').Page) {
  // This test deliberately holds the font response while comparing layout.
  // Keep that wait separate from the real one-second fallback tested elsewhere.
  await page.addInitScript(() => {
    const nativeSetTimeout = window.setTimeout.bind(window)
    window.setTimeout = ((callback: TimerHandler, delay = 0, ...args: unknown[]) => (
      nativeSetTimeout(callback, delay === 1000 ? 60_000 : delay, ...args)
    )) as typeof window.setTimeout
  })
}

test.describe('static page routes without JavaScript', () => {
  test.use({ javaScriptEnabled: false, viewport: { width: 320, height: 800 } })

  for (const { path, pageKey, locale, notice, evidenceHref } of routes) {
    test(`${locale} ${pageKey} ${path} serves readable page content and navigation`, async ({ page }) => {
      const response = await page.goto(path)
      expect(response?.status()).toBe(200)

      const main = page.locator('main#main')
      await expect(main).toBeVisible()
      await expect(main).toHaveAttribute('tabindex', '-1')
      await expect(main.locator('h1')).toHaveCount(1)
      await expect(main.locator('h1')).not.toBeEmpty()
      if (pageKey === 'home') {
        await expect(page.locator('.home-hero-typewriter')).toBeVisible()
        await expect(page.locator('.home-hero-typewriter-line-greeting')).not.toBeEmpty()
      }
      await expect(page.locator('.site-footer')).toBeVisible()
      await expect(page.locator('.nav-rail')).toBeVisible()
      await expect(page.locator('.nav-rail a')).toHaveCount(6)
      await expect(page.locator('.menu-trigger')).toBeHidden()
      await expect(page.locator('.theme-orbit')).toBeHidden()
      await expect(page.locator('.locale-switcher-desktop a')).toHaveCount(3)
      await expect(page.locator('head link[rel="stylesheet"][href*="/fonts-route-"]')).toHaveCount(1)
      await expect(page.locator('.site-footer a[href="mailto:yance777@outlook.com"]')).toHaveCount(1)
      await expect(page.locator('.site-footer a[href="https://github.com/yance7"]')).toHaveCount(1)
      if (evidenceHref) {
        await expect(main.locator(`a[href="${evidenceHref}"]`).first()).toHaveAttribute('href', evidenceHref)
      }
      await expect(page.locator('.noscript-notice')).toContainText(notice)

      const hasHorizontalOverflow = await page.evaluate(() =>
        document.documentElement.scrollWidth > document.documentElement.clientWidth
      )
      expect(hasHorizontalOverflow).toBe(false)
    })
  }

  test('native methodology details can be opened without JavaScript', async ({ page }) => {
    await page.goto('/en/research/')
    const details = page.locator('.tl-method').first()
    expect(await details.evaluate((element) => element.tagName)).toBe('DETAILS')
    await expect(details).not.toHaveAttribute('open')
    await expect(details.locator('.method-disclosure')).toBeHidden()

    await details.locator('summary').click()
    await expect(details).toHaveAttribute('open', '')
    await expect(details.locator('.method-disclosure')).toBeVisible()
    const methodologyText = (await details.locator('.method-grid p').first().innerText()).trim()
    const accessibilityTree = await details.ariaSnapshot()
    expect(accessibilityTree).toContain(methodologyText)
  })

  test('skip link reaches main content without JavaScript', async ({ page }, testInfo) => {
    await page.goto('/en/research/')
    const skipLink = page.locator('.skip-link')
    const main = page.locator('main#main')

    await expect(skipLink).toHaveAttribute('href', '#main')
    const webkitProject = testInfo.project.name.startsWith('webkit-')
    if (webkitProject) {
      await skipLink.focus()
    } else {
      await page.keyboard.press('Tab')
      await expect(skipLink).toBeFocused()
    }
    await page.keyboard.press('Enter')
    await expect(main).toBeFocused()
    if (!webkitProject) {
      await page.keyboard.press('Tab')
      await expect(main.locator('.tl-method summary').first()).toBeFocused()
      await page.keyboard.press('Tab')
      await expect(main.locator('a[href]').first()).toBeFocused()
    }
  })
})

test.describe('hydration of static page routes', () => {
  for (const { path, locale } of routes) {
    test(`${locale} ${path} hydrates without replacing server content`, async ({ page }) => {
      const runtimeErrors: string[] = []
      const browserMessages: string[] = []
      page.on('pageerror', (error) => runtimeErrors.push(error.message))
      page.on('console', (message) => {
        if (!['error', 'warning'].includes(message.type())) return
        browserMessages.push(`${message.type()}: ${message.text()}`)
        if (/hydration|mismatch|server-rendered/i.test(message.text())) runtimeErrors.push(message.text())
      })

      await page.goto(path)
      await expect(page.locator('body')).toHaveAttribute('data-hydrated', 'true')
      await expect(page.locator('html')).toHaveAttribute('data-vue-enhanced', 'true')
      const hydratedDom = await page.evaluate(() => {
        const app = document.querySelector('#app')
        return {
          appHtml: app?.innerHTML.slice(0, 1600) ?? '',
          mainCount: document.querySelectorAll('#app main#main').length,
          headingCount: document.querySelectorAll('#app main#main h1').length
        }
      })
      expect(runtimeErrors, `Hydration diagnostics: ${JSON.stringify({ hydratedDom, browserMessages })}`).toEqual([])
      await expect(page.locator('#app main#main')).toHaveCount(1)
      await expect(page.locator('main#main h1')).toHaveCount(1)
      await expect(page.locator('#app .site-footer')).toHaveCount(1)
    })
  }
})

test('desktop static markup hides the theme control that requires JavaScript', async ({ browser }) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 1440, height: 1000 }
  })
  const page = await context.newPage()
  await page.goto('/')

  await expect(page.locator('.theme-orbit')).toBeHidden()
  await expect(page.locator('.nav-rail')).toBeVisible()
  await expect(page.locator('.home-hero-slideshow__image--current')).toBeVisible()
  await context.close()
})

test('mobile navigation keeps the main-content position when Vue hydrates', async ({ browser }, testInfo) => {
  test.skip(testInfo.project.name === 'firefox-desktop-smoke', 'Firefox does not support mobile context emulation')
  const viewport = { width: 390, height: 844 }
  const staticContext = await browser.newContext({ javaScriptEnabled: false, viewport, isMobile: true })
  const staticPage = await staticContext.newPage()
  await staticPage.goto('/research/')
  await expect(staticPage.locator('.nav-rail')).toBeVisible()
  const staticMainTop = await staticPage.locator('main#main').evaluate((element) => element.getBoundingClientRect().top)
  await staticContext.close()

  const hydratedContext = await browser.newContext({ viewport, isMobile: true })
  const hydratedPage = await hydratedContext.newPage()
  await hydratedPage.goto('/research/')
  await expect(hydratedPage.locator('body')).toHaveAttribute('data-hydrated', 'true')
  const hydratedMainTop = await hydratedPage.locator('main#main').evaluate((element) => element.getBoundingClientRect().top)
  await hydratedContext.close()

  expect(hydratedMainTop).toBe(staticMainTop)
})

test('static routes use one generated locale font stylesheet', async ({ page }) => {
  const fontStylesheetRequests: string[] = []
  page.on('request', (request) => {
    if (/\/assets\/vue\/fonts-(?:route-)?en-[^/]+\.css$/u.test(request.url())) {
      fontStylesheetRequests.push(request.url())
    }
  })

  await page.goto('/en/research/')
  await expect(page.locator('body')).toHaveAttribute('data-hydrated', 'true')
  const stylesheet = page.locator('head link[rel="stylesheet"][href*="/fonts-route-en-"]')
  await expect(stylesheet).toHaveCount(1)
  const stylesheetUrl = new URL((await stylesheet.getAttribute('href'))!, page.url()).href
  expect(fontStylesheetRequests).toEqual([stylesheetUrl])
})

test('pre-rendered content stays visible while the entry script is delayed', async ({ page }) => {
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
    await expect(page.locator('main#main h1')).toBeVisible()
    await expect(page.locator('.site-footer')).toBeVisible()
    expect(await page.locator('body').getAttribute('data-hydrated')).toBeNull()
  } finally {
    releaseEntry()
  }

  await expect(page.locator('body')).toHaveAttribute('data-hydrated', 'true')
})

test('pre-rendered home sections stay visible while the home page chunk is delayed', async ({ page }) => {
  let markPageChunkRequested!: () => void
  let releasePageChunk!: () => void
  const pageChunkRequested = new Promise<void>((resolve) => { markPageChunkRequested = resolve })
  const pageChunkGate = new Promise<void>((resolve) => { releasePageChunk = resolve })
  await page.route(/\/assets\/vue\/HomePage-[^/]+\.js$/u, async (route) => {
    markPageChunkRequested()
    await pageChunkGate
    await route.continue()
  })

  try {
    await page.goto('/', { waitUntil: 'commit' })
    await pageChunkRequested
    await expect(page.locator('.home-hero-typewriter')).toBeVisible()
    await expect(page.locator('#selected-work')).toBeVisible()
    expect(await page.locator('body').getAttribute('data-hydrated')).toBeNull()
  } finally {
    releasePageChunk()
  }

  await expect(page.locator('body')).toHaveAttribute('data-hydrated', 'true')
  await expect(page.locator('#selected-work')).toBeVisible()
})

test('pre-rendered home keeps its greeting and primary actions visible through hydration', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.addInitScript(() => {
    type HomeVisibilitySnapshot = {
      introState: string | undefined
      finalState: string | undefined
      greetingClipPath: string
      statementClipPath: string
      actionsOpacity: string
    }
    const state = window as Window & { __homeVisibilitySnapshots?: HomeVisibilitySnapshot[] }
    state.__homeVisibilitySnapshots = []
    const record = () => {
      const hero = document.querySelector<HTMLElement>('.home-hero')
      const greeting = document.querySelector<HTMLElement>('.home-hero-typewriter')
      const greetingLine = document.querySelector<HTMLElement>('.home-hero-typewriter-line-greeting')
      const statementLine = document.querySelector<HTMLElement>('.home-hero-typewriter-line-statement')
      const actions = document.querySelector<HTMLElement>('.home-hero-actions')
      if (!hero || !greeting || !greetingLine || !statementLine || !actions) return
      state.__homeVisibilitySnapshots?.push({
        introState: hero.dataset.introState,
        finalState: greeting.dataset.finalState,
        greetingClipPath: getComputedStyle(greetingLine).clipPath,
        statementClipPath: getComputedStyle(statementLine).clipPath,
        actionsOpacity: getComputedStyle(actions).opacity
      })
    }
    new MutationObserver(record).observe(document, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['data-intro-state', 'data-final-state', 'data-font-state']
    })
  })

  let markEntryRequested!: () => void
  let releaseEntry!: () => void
  const entryRequested = new Promise<void>((resolve) => { markEntryRequested = resolve })
  const entryGate = new Promise<void>((resolve) => { releaseEntry = resolve })
  await page.route(/\/assets\/vue\/main-[^/]+\.js$/u, async (route) => {
    markEntryRequested()
    await entryGate
    await route.continue()
  })

  const greeting = page.locator('.home-hero-typewriter')
  const actions = page.locator('.home-hero-actions')
  try {
    await page.goto('/en/', { waitUntil: 'commit' })
    await entryRequested
    await expect(page.locator('main#main h1')).toBeVisible()
    await expect(greeting).toBeVisible()
    await expect(actions).toHaveCSS('opacity', '1')
  } finally {
    releaseEntry()
  }

  await expect(page.locator('body')).toHaveAttribute('data-hydrated', 'true')
  await expect(greeting).toHaveAttribute('data-final-state', 'true')
  await expect(page.locator('.home-hero-typewriter-line-greeting')).toHaveCSS('clip-path', 'none')
  await expect(page.locator('.home-hero-typewriter-line-statement')).toHaveCSS('clip-path', 'none')
  await expect(actions).toHaveCSS('opacity', '1')
  const visibilitySnapshots = await page.evaluate(() => (
    (window as Window & { __homeVisibilitySnapshots?: Array<{
      finalState: string | undefined
      greetingClipPath: string
      statementClipPath: string
      actionsOpacity: string
    }> }).__homeVisibilitySnapshots ?? []
  ))
  expect(visibilitySnapshots.length).toBeGreaterThan(0)
  expect(visibilitySnapshots.every(snapshot => (
    snapshot.finalState === 'true'
    && snapshot.greetingClipPath === 'none'
    && snapshot.statementClipPath === 'none'
    && snapshot.actionsOpacity === '1'
  ))).toBe(true)
})

test('pre-rendered greeting stays visible while its font request is pending through hydration', async ({ page }) => {
  let markEntryRequested!: () => void
  let releaseEntry!: () => void
  let markGreetingFontRequested!: () => void
  let releaseGreetingFont!: () => void
  const entryRequested = new Promise<void>((resolve) => { markEntryRequested = resolve })
  const entryGate = new Promise<void>((resolve) => { releaseEntry = resolve })
  const greetingFontRequested = new Promise<void>((resolve) => { markGreetingFontRequested = resolve })
  const greetingFontGate = new Promise<void>((resolve) => { releaseGreetingFont = resolve })
  await page.route(/\/assets\/vue\/main-[^/]+\.js$/u, async (route) => {
    markEntryRequested()
    await entryGate
    await route.continue()
  })
  await page.route('**/hero-greeting-wenkai-tc-regular-*.woff2', async (route) => {
    markGreetingFontRequested()
    await greetingFontGate
    await route.continue()
  })

  const greeting = page.locator('.home-hero-typewriter')
  try {
    await page.goto('/en/', { waitUntil: 'commit' })
    await entryRequested
    await expect(greeting).toHaveAttribute('data-font-state', 'loading')
    await expect(greeting).toHaveCSS('visibility', 'visible')

    releaseEntry()
    await greetingFontRequested
    await expect(page.locator('body')).toHaveAttribute('data-hydrated', 'true')
    await expect(greeting).toHaveAttribute('data-font-state', 'loading')
    const hydratedGreeting = await greeting.evaluate((element) => ({
      enhanced: document.documentElement.dataset.vueEnhanced,
      visibility: getComputedStyle(element).visibility,
      fontState: (element as HTMLElement).dataset.fontState,
      matchingEnhancedState: document.documentElement.matches('html[data-vue-enhanced="true"]')
    }))
    expect(hydratedGreeting).toEqual({
      enhanced: 'true',
      visibility: 'visible',
      fontState: 'loading',
      matchingEnhancedState: true
    })
  } finally {
    releaseEntry()
    releaseGreetingFont()
  }
})

for (const route of ['/', '/zh-hk/']) {
  test(`Chinese ${route} keeps the hero geometry stable while the greeting font loads`, async ({ page }) => {
    let markGreetingFontRequested!: () => void
    let releaseGreetingFont!: () => void
    const greetingFontRequested = new Promise<void>((resolve) => { markGreetingFontRequested = resolve })
    const greetingFontGate = new Promise<void>((resolve) => { releaseGreetingFont = resolve })
    const widths = [320, 390, 427, 428]
    await deferGreetingFontFallback(page)
    await page.setViewportSize({ width: 390, height: 844 })
    await page.route('**/hero-greeting-wenkai-tc-regular-*.woff2', async (route) => {
      markGreetingFontRequested()
      await greetingFontGate
      await route.continue()
    })

    const greeting = page.locator('.home-hero-typewriter')
    const measureWidths = async () => {
      const result = []
      for (const width of widths) {
        await page.setViewportSize({ width, height: 844 })
        result.push(await page.evaluate(() => {
          const line = document.querySelector('.home-hero-typewriter-line-greeting')!
          const actions = document.querySelector('.home-hero-actions')!
          return {
            width: window.innerWidth,
            greetingHeight: line.getBoundingClientRect().height,
            actionsTop: actions.getBoundingClientRect().top
          }
        }))
      }
      return result
    }

    try {
      await page.goto(route, { waitUntil: 'domcontentloaded' })
      await greetingFontRequested
      await expect(greeting).toHaveAttribute('data-font-state', 'loading')
      const beforeFont = await measureWidths()

      releaseGreetingFont()
      await expect(greeting).toHaveAttribute('data-font-state', 'ready')
      const afterFont = await measureWidths()

      expect(afterFont.map((measurement) => measurement.width)).toEqual(widths)
      afterFont.forEach((measurement, index) => {
        const initial = beforeFont[index]
        if (!initial) throw new Error(`Missing pre-font geometry at viewport index ${index}`)
        expect(Math.abs(measurement.greetingHeight - initial.greetingHeight)).toBeLessThanOrEqual(1)
        expect(Math.abs(measurement.actionsTop - initial.actionsTop)).toBeLessThanOrEqual(1)
      })
    } finally {
      releaseGreetingFont()
    }
  })
}

test('incoming home hashes preserve the static particle tree through hydration', async ({ page }) => {
  const hydrationDiagnostics: string[] = []
  page.on('console', (message) => {
    if (!['error', 'warning'].includes(message.type())) return
    if (/hydration|mismatch|server-rendered/i.test(message.text())) hydrationDiagnostics.push(message.text())
  })
  page.on('pageerror', (error) => {
    if (/hydration|mismatch|server-rendered/i.test(error.message)) hydrationDiagnostics.push(error.message)
  })

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
    await page.goto('/en/#selected-work', { waitUntil: 'commit' })
    await entryRequested
    const prerenderedParticles = await page.locator('.home-hero-particles').evaluate((element) => ({
      renderMode: (element as HTMLElement).dataset.renderMode,
      canvasCount: element.querySelectorAll('canvas').length
    }))
    expect(prerenderedParticles).toEqual({ renderMode: 'static', canvasCount: 0 })

    releaseEntry()
    await expect(page.locator('body')).toHaveAttribute('data-hydrated', 'true')
    await expect(page).toHaveURL('/en/#selected-work')
    expect(hydrationDiagnostics).toEqual([])
  } finally {
    releaseEntry()
  }
})

const entryFailureCases = [
  {
    locale: 'zh-CN',
    path: '/research/',
    notice: '动态交互暂未加载；本页内容和链接仍可使用。刷新页面可再次尝试。'
  },
  {
    locale: 'zh-HK',
    path: '/zh-hk/research/',
    notice: '動態互動暫未載入；本頁內容和連結仍可使用。重新整理頁面可再試一次。'
  },
  {
    locale: 'en',
    path: '/en/research/',
    notice: 'Interactive features could not load; the page content and links remain available. Refresh to try again.'
  }
]

for (const { locale, path, notice } of entryFailureCases) {
  test(`pre-rendered ${locale} content remains available when the entry script fails`, async ({ page }) => {
    await page.route(/\/assets\/vue\/main-[^/]+\.js$/u, (route) => route.abort('failed'))
    const response = await page.goto(path)

    expect(response?.status()).toBe(200)
    await expect(page.locator('main#main h1')).toBeVisible()
    await expect(page.locator('.site-footer')).toBeVisible()
    await expect(page.locator('.site-footer a[href="mailto:yance777@outlook.com"]')).toHaveCount(1)
    await expect(page.locator('.enhancement-notice')).toBeVisible()
    await expect(page.locator('.enhancement-notice')).toContainText(notice)
    expect(await page.locator('body').getAttribute('data-hydrated')).toBeNull()
  })
}

test('pre-rendered entry-script failure preserves and follows an incoming section link', async ({ page }) => {
  await page.route(/\/assets\/vue\/main-[^/]+\.js$/u, (route) => route.abort('failed'))
  await page.goto('/en/works/#project-trusted-garden')

  await expect(page.locator('main#main h1')).toBeVisible()
  await expect(page).toHaveURL(/\/en\/works\/#project-trusted-garden$/u)
  await expect(page.locator('#project-trusted-garden')).toBeInViewport()
})

test('pre-rendered content remains available when its page chunk fails', async ({ page }) => {
  await page.route(/\/assets\/vue\/WorksPage-[^/]+\.js$/u, (route) => route.abort('failed'))
  const response = await page.goto('/en/works/')

  expect(response?.status()).toBe(200)
  await expect(page.locator('main#main h1')).toBeVisible()
  await expect(page.locator('main#main .showcase-list')).toBeVisible()
  await expect(page.locator('.enhancement-notice')).toBeVisible()
  await expect(page.locator('.site-footer')).toBeVisible()
  expect(await page.locator('body').getAttribute('data-hydrated')).toBeNull()
})

test('academic SSR metrics keep their final values while the page chunk is delayed and after hydration', async ({ page }) => {
  const finalValues = ['4.0', '1560', '108', '8.0']
  await page.addInitScript(() => {
    const state = window as Window & { __metricValueSnapshots?: string[][] }
    state.__metricValueSnapshots = []
    new MutationObserver(() => {
      const values = [...document.querySelectorAll('.metric-card b')].map(element => element.textContent ?? '')
      if (values.length) state.__metricValueSnapshots?.push(values)
    }).observe(document, { subtree: true, childList: true, characterData: true })
  })

  let markPageChunkRequested!: () => void
  let releasePageChunk!: () => void
  const pageChunkRequested = new Promise<void>((resolve) => { markPageChunkRequested = resolve })
  const pageChunkGate = new Promise<void>((resolve) => { releasePageChunk = resolve })
  await page.route(/\/assets\/vue\/AcademicsPage-[^/]+\.js$/u, async (route) => {
    markPageChunkRequested()
    await pageChunkGate
    await route.continue()
  })

  try {
    await page.goto('/en/academics/', { waitUntil: 'commit' })
    await pageChunkRequested
    await expect(page.locator('.metric-card b')).toHaveText(finalValues)
    await page.locator('.metric-strip').scrollIntoViewIfNeeded()
    await expect(page.locator('.metric-strip')).toBeInViewport()
  } finally {
    releasePageChunk()
  }

  await expect(page.locator('body')).toHaveAttribute('data-hydrated', 'true')
  await expect(page.locator('.metric-strip')).toHaveAttribute('data-metrics-ready', 'true')
  await expect(page.locator('.metric-card b')).toHaveText(finalValues)
  const snapshots = await page.evaluate(() => (window as Window & { __metricValueSnapshots?: string[][] }).__metricValueSnapshots ?? [])
  expect(snapshots.length).toBeGreaterThan(0)
  expect(snapshots.every(values => values.every((value, index) => value === finalValues[index]))).toBe(true)
})

test('a delayed Works chunk preserves the URL and localized links retain its query and fragment', async ({ page }, testInfo) => {
  const destination = '/en/works/?source=a#project-trusted-garden'
  const localeSwitcher = testInfo.project.use.isMobile ? '.locale-switcher-mobile' : '.locale-switcher-desktop'
  const showLocaleLinks = async () => {
    if (!testInfo.project.use.isMobile) return
    const details = page.locator(localeSwitcher)
    if (!await details.evaluate(element => (element as HTMLDetailsElement).open)) {
      await details.locator('summary').click()
    }
  }

  let markPageChunkRequested!: () => void
  let releasePageChunk!: () => void
  const pageChunkRequested = new Promise<void>((resolve) => { markPageChunkRequested = resolve })
  const pageChunkGate = new Promise<void>((resolve) => { releasePageChunk = resolve })
  await page.route(/\/assets\/vue\/WorksPage-[^/]+\.js$/u, async (route) => {
    markPageChunkRequested()
    await pageChunkGate
    await route.continue()
  })

  let localeClick: Promise<void> | undefined
  try {
    await page.goto(destination, { waitUntil: 'commit' })
    await pageChunkRequested
    await expect(page).toHaveURL(/\/en\/works\/\?source=a#project-trusted-garden$/u)
    await showLocaleLinks()
    const simplifiedChinese = page.locator(`${localeSwitcher} a[hreflang="zh-CN"]`)
    await expect(simplifiedChinese).toBeVisible()
    await expect(simplifiedChinese).toHaveAttribute('href', '/works/?source=a#project-trusted-garden')
    await expect(page.locator('#project-trusted-garden')).toBeVisible()
    const localizedNavigation = page.waitForURL((url) => (
      url.pathname === '/works/'
      && url.search === '?source=a'
      && url.hash === '#project-trusted-garden'
    ), { waitUntil: 'commit' })
    localeClick = simplifiedChinese.click()
    await localizedNavigation
    await expect(page.locator('main#main h1')).toBeVisible()
    expect(await page.locator('body').getAttribute('data-hydrated')).toBeNull()
  } finally {
    releasePageChunk()
  }

  await localeClick
  await expect(page.locator('body')).toHaveAttribute('data-hydrated', 'true')
  const simplifiedChinese = page.locator(`${localeSwitcher} a[hreflang="zh-CN"]`)
  await expect(simplifiedChinese).toHaveAttribute('href', '/works/?source=a#project-trusted-garden')
  await expect(page.locator('#project-trusted-garden')).toBeInViewport()
})

test('pre-rendered locale links preserve an incoming hash before Vue hydration', async ({ page }, testInfo) => {
  const localeSwitcher = testInfo.project.use.isMobile ? '.locale-switcher-mobile' : '.locale-switcher-desktop'
  let markEntryRequested!: () => void
  const entryRequested = new Promise<void>((resolve) => { markEntryRequested = resolve })
  await page.route(/\/assets\/vue\/main-[^/]+\.js$/u, (route) => {
    markEntryRequested()
    return route.abort('failed')
  })

  await page.goto('/en/research/#sec-toolchain', { waitUntil: 'commit' })
  await entryRequested
  await expect(page.locator('body')).not.toHaveAttribute('data-hydrated', 'true')

  if (testInfo.project.use.isMobile) {
    await page.locator(localeSwitcher).locator('summary').click()
  }
  const simplifiedChinese = page.locator(`${localeSwitcher} a[hreflang="zh-CN"]`)
  await expect(simplifiedChinese).toHaveAttribute('href', '/research/#sec-toolchain')
  const localizedNavigation = page.waitForURL((url) => (
    url.pathname === '/research/' && url.hash === '#sec-toolchain'
  ), { waitUntil: 'commit' })
  await simplifiedChinese.click()
  await localizedNavigation
  await expect(page.locator('main#main h1')).toBeVisible()
  await expect(page).toHaveURL(/\/research\/#sec-toolchain$/u)
  await expect(page.locator('body')).not.toHaveAttribute('data-hydrated', 'true')
})

test('pre-rendered page-chunk failure preserves and follows an incoming section link', async ({ page }) => {
  await page.route(/\/assets\/vue\/WorksPage-[^/]+\.js$/u, (route) => route.abort('failed'))
  await page.goto('/en/works/?source=a#project-trusted-garden')

  await expect(page.locator('.enhancement-notice')).toBeVisible()
  await expect(page).toHaveURL(/\/en\/works\/\?source=a#project-trusted-garden$/u)
  await expect(page.locator('#project-trusted-garden')).toBeInViewport()
  await expect(page.locator('.locale-switcher-desktop a[hreflang="zh-CN"]'))
    .toHaveAttribute('href', '/works/?source=a#project-trusted-garden')
})

test('WebKit retries a transient page-chunk failure after reloading the same tab', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.startsWith('webkit-'), 'WebKit modulepreload cache regression')
  const chunk = /\/assets\/vue\/WorksPage-[^/]+\.js$/u
  let failChunk = true
  await page.route(chunk, (route) => failChunk ? route.abort('failed') : route.continue())

  await page.goto('/en/works/')
  await expect(page.locator('.enhancement-notice')).toBeVisible()

  failChunk = false
  await page.reload()
  await expect(page.locator('body')).toHaveAttribute('data-hydrated', 'true')
  await expect(page.locator('.page-works')).toBeVisible()
})

test('pre-rendered content hydrates with a failed locale font stylesheet', async ({ page }) => {
  const hydrationWarnings: string[] = []
  page.on('console', (message) => {
    if (/hydration|mismatch|server-rendered/i.test(message.text())) hydrationWarnings.push(message.text())
  })
  await page.route(/\/assets\/vue\/fonts-route-en-[^/]+\.css$/u, (route) => route.abort('failed'))
  await page.goto('/en/research/')

  await expect(page.locator('body')).toHaveAttribute('data-hydrated', 'true')
  await expect(page.locator('html')).toHaveAttribute('data-fonts-ready', /^(ready|fallback)$/u)
  await expect(page.locator('main#main h1')).toBeVisible()
  expect(hydrationWarnings).toEqual([])
})

test('pre-rendered pages hydrate when local storage is unavailable', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() { throw new DOMException('Storage is unavailable', 'SecurityError') }
    })
  })
  await page.goto('/en/research/')

  await expect(page.locator('body')).toHaveAttribute('data-hydrated', 'true')
  await expect(page.locator('main#main h1')).toBeVisible()
  await expect(page.locator('.site-footer')).toBeVisible()
})

test('pre-rendered home hydrates for users who prefer reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/en/')

  await expect(page.locator('body')).toHaveAttribute('data-hydrated', 'true')
  await expect(page.locator('main#main h1')).toBeVisible()
  expect(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true)
})

test('pre-rendered home hydrates without a forced-colors mismatch', async ({ page }) => {
  const hydrationErrors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error' && /hydration|mismatch/i.test(message.text())) {
      hydrationErrors.push(message.text())
    }
  })
  await page.emulateMedia({ forcedColors: 'active' })
  await page.goto('/')

  await expect(page.locator('body')).toHaveAttribute('data-hydrated', 'true')
  expect(hydrationErrors).toEqual([])
  await expect(page.locator('.home-hero-slideshow__image')).toHaveCount(0)
  await expect(page.locator('.home-hero-particles-word')).toBeVisible()
})

for (const { path, locale } of [
  { path: '/', locale: 'zh-CN' },
  { path: '/zh-hk/', locale: 'zh-HK' },
  { path: '/en/', locale: 'en' }
]) {
  test(`${locale} pre-rendered home resolves locale fonts`, async ({ page }) => {
    await page.goto(path)

    await expect(page.locator('body')).toHaveAttribute('data-hydrated', 'true')
    await expect(page.locator('html')).toHaveAttribute('data-fonts-ready', 'ready', { timeout: 10000 })
  })
}
