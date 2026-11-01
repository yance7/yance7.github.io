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

test('pre-rendered content remains available when the entry script fails', async ({ page }) => {
  await page.route(/\/assets\/vue\/main-[^/]+\.js$/u, (route) => route.abort('failed'))
  const response = await page.goto('/en/research/')

  expect(response?.status()).toBe(200)
  await expect(page.locator('main#main h1')).toBeVisible()
  await expect(page.locator('.site-footer')).toBeVisible()
  await expect(page.locator('.site-footer a[href="mailto:yance777@outlook.com"]')).toHaveCount(1)
  expect(await page.locator('body').getAttribute('data-hydrated')).toBeNull()
})

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

test('pre-rendered page-chunk failure preserves and follows an incoming section link', async ({ page }) => {
  await page.route(/\/assets\/vue\/WorksPage-[^/]+\.js$/u, (route) => route.abort('failed'))
  await page.goto('/en/works/#project-trusted-garden')

  await expect(page.locator('.enhancement-notice')).toBeVisible()
  await expect(page).toHaveURL(/\/en\/works\/#project-trusted-garden$/u)
  await expect(page.locator('#project-trusted-garden')).toBeInViewport()
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
  await page.route(/\/assets\/vue\/fonts-en-[^/]+\.css$/u, (route) => route.abort('failed'))
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
