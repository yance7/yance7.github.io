import { expect, test, type Page } from '@playwright/test'

const locales = [
  {
    name: 'Simplified Chinese',
    lang: 'zh-CN',
    homeRoute: '/',
    archiveRoute: '/academics/',
    cjkSans: 'Noto Sans CJK SC',
    bundledCjkFont: 'Noto Sans SC Variable',
    editorialLatin: 'Inter Variable',
  },
  {
    name: 'Traditional Chinese',
    lang: 'zh-HK',
    homeRoute: '/zh-hk/',
    archiveRoute: '/zh-hk/academics/',
    cjkSans: 'Noto Sans CJK TC',
    bundledCjkFont: 'Noto Sans HK Variable',
    editorialLatin: 'Inter Variable',
  },
  {
    name: 'English',
    lang: 'en',
    homeRoute: '/en/',
    archiveRoute: '/en/academics/',
    cjkSans: 'Noto Sans CJK SC',
    bundledCjkFont: 'Noto Sans SC Variable',
    editorialLatin: 'Georgia',
  }
] as const

async function readFontRoles(page: Page) {
  return page.evaluate(() => {
    const fontFamily = (selector: string) => {
      const element = document.querySelector(selector)
      if (!element) throw new Error(`Missing typography sample: ${selector}`)
      return getComputedStyle(element).fontFamily
    }

    return {
      body: getComputedStyle(document.body).fontFamily,
      homeTitle: fontFamily('.home-hero-typewriter'),
      action: fontFamily('.home-hero-actions a'),
      navigation: fontFamily('.nav-rail .nav-label'),
      technical: fontFamily('.home-hero-kicker')
    }
  })
}

async function readRenderedFontEntries(page: Page, selector: string) {
  const session = await page.context().newCDPSession(page)

  try {
    await session.send('DOM.enable')
    await session.send('CSS.enable')
    const { root } = await session.send('DOM.getDocument')
    const { nodeId } = await session.send('DOM.querySelector', { nodeId: root.nodeId, selector })
    if (!nodeId) throw new Error(`Missing rendered typography sample: ${selector}`)
    const { fonts } = await session.send('CSS.getPlatformFontsForNode', { nodeId })
    return fonts.map(({ familyName, glyphCount, isCustomFont }) => ({ familyName, glyphCount, isCustomFont }))
  } finally {
    await session.detach()
  }
}

async function readRenderedFontNames(page: Page, selector: string) {
  return (await readRenderedFontEntries(page, selector)).map(({ familyName }) => familyName)
}

for (const locale of locales) {
  test(`${locale.name} loads its font stylesheet and used font faces after first content mounts`, async ({ page }) => {
    await page.addInitScript(() => {
      type MountEvidence = {
        mountedAt: number
        localeStylesheetActiveAtMount: boolean
      }
      const timingWindow = window as Window & { __appMountEvidence?: MountEvidence }
      const observer = new MutationObserver(() => {
        if (document.querySelector('#app')?.childElementCount && timingWindow.__appMountEvidence === undefined) {
          const mountedAt = performance.now()
          timingWindow.__appMountEvidence = {
            mountedAt,
            localeStylesheetActiveAtMount: Array.from(document.styleSheets).some(({ href }) => href?.includes('/assets/vue/fonts-'))
          }
          observer.disconnect()
        }
      })

      observer.observe(document, { childList: true, subtree: true })
    })

    await page.goto(locale.homeRoute)
    await expect(page.locator('.home-hero-typewriter')).toBeVisible()

    const evidence = await page.evaluate(() =>
      (window as Window & { __appMountEvidence?: {
        mountedAt: number
        localeStylesheetActiveAtMount: boolean
      } }).__appMountEvidence
    )

    expect(evidence).toBeDefined()
    expect(evidence?.mountedAt).toBeGreaterThan(0)
    expect(evidence?.localeStylesheetActiveAtMount).toBe(false)
    await expect.poll(() => page.locator('html').getAttribute('data-fonts-ready')).toBe('ready')
    const loadedFonts = await page.evaluate(() => ({
      localeStylesheetActive: Array.from(document.styleSheets).some(({ href }) => href?.includes('/assets/vue/fonts-')),
      interLoaded: document.fonts.check('400 16px "Inter Variable"', 'Yance Yan 0123456789'),
      monoLoaded: document.fonts.check('400 16px "IBM Plex Mono"', 'RESEARCH BUILD LIVE 0123456789'),
      fontResources: (performance.getEntriesByType('resource') as PerformanceResourceTiming[])
        .filter((entry) => /\.woff2(?:[?#]|$)/i.test(entry.name))
        .map(({ name, responseEnd }) => ({ name, responseEnd }))
    }))

    expect(loadedFonts.localeStylesheetActive).toBe(true)
    expect(loadedFonts.interLoaded).toBe(true)
    expect(loadedFonts.monoLoaded).toBe(true)
    const inter = loadedFonts.fontResources.find(({ name }) => /inter-latin-wght-normal[^/]*\.woff2/i.test(name))
    const mono = loadedFonts.fontResources.find(({ name }) => /ibm-plex-mono-latin-400-normal[^/]*\.woff2/i.test(name))
    expect(inter, JSON.stringify(loadedFonts.fontResources)).toBeDefined()
    expect(mono, JSON.stringify(loadedFonts.fontResources)).toBeDefined()
    expect(inter?.responseEnd).toBeGreaterThan(0)
    expect(mono?.responseEnd).toBeGreaterThan(0)

  })
}

test('zh-CN first content mounts while locale font files are still loading', async ({ page }) => {
  let releaseFontRequests = () => {}
  const fontRequestsPaused = new Promise<void>((resolve) => {
    releaseFontRequests = resolve
  })
  let blockedFontRequests = 0

  await page.route('**/*.woff2', async (route) => {
    blockedFontRequests += 1
    await fontRequestsPaused
    await route.continue()
  })

  try {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await expect.poll(() => blockedFontRequests).toBeGreaterThan(0)
    await expect(page.locator('.home-hero-typewriter')).toBeVisible()
  } finally {
    releaseFontRequests()
  }
})

test('zh-CN first content mounts while the locale font stylesheet is still loading', async ({ page }) => {
  let releaseStylesheetRequest = () => {}
  const stylesheetRequestPaused = new Promise<void>((resolve) => {
    releaseStylesheetRequest = resolve
  })
  let blockedStylesheetRequests = 0

  await page.route('**/assets/vue/fonts-*.css', async (route) => {
    blockedStylesheetRequests += 1
    await stylesheetRequestPaused
    await route.continue()
  })

  try {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await expect.poll(() => blockedStylesheetRequests).toBeGreaterThan(0)
    await expect(page.locator('.home-hero-typewriter')).toBeVisible()
  } finally {
    releaseStylesheetRequest()
  }
})

for (const locale of locales) {
  test(`${locale.name} bundled CJK font covers required glyphs`, async ({ page }) => {
    const sample = locale.lang === 'zh-HK' ? '繁體中文，標點：『測試』。' : '简体中文，标点：『测试』。'
    const fontRequests: string[] = []

    page.on('request', (request) => {
      const pathname = new URL(request.url()).pathname
      if (/\/assets\/vue\/noto-sans-(?:sc|hk)-[^/]+\.woff2$/i.test(pathname)) fontRequests.push(pathname)
    })

    await page.goto(locale.homeRoute)
    await expect.poll(() => page.locator('html').getAttribute('data-fonts-ready')).toBe('ready')

    const loadedFamilies = await page.evaluate(async ({ fontFamily, text }) => {
      const sampleNode = document.createElement('span')
      sampleNode.id = 'font-coverage-sample'
      sampleNode.textContent = text
      sampleNode.style.cssText = 'position:fixed;left:-10000px;top:0;white-space:nowrap;font-size:16px;font-weight:400;'
      sampleNode.style.fontFamily = `"${fontFamily}"`
      document.body.append(sampleNode)

      const loadedFaces = await document.fonts.load(`400 16px "${fontFamily}"`, text)
      return loadedFaces.map(({ family }) => family.replace(/^['"]|['"]$/g, ''))
    }, { fontFamily: locale.bundledCjkFont, text: sample })

    expect(loadedFamilies).toContain(locale.bundledCjkFont)
    expect(fontRequests.length).toBeGreaterThan(0)

    if (page.context().browser()?.browserType().name() === 'chromium') {
      const renderedFonts = await readRenderedFontEntries(page, '#font-coverage-sample')
      const renderedFamilyPrefix = locale.lang === 'zh-HK' ? 'Noto Sans HK' : 'Noto Sans SC'
      const bundledFont = renderedFonts.find(({ familyName }) => familyName.startsWith(renderedFamilyPrefix))
      expect(bundledFont, JSON.stringify(renderedFonts)).toBeDefined()
      expect(bundledFont?.isCustomFont).toBe(true)
      expect(bundledFont?.glyphCount).toBe(Array.from(sample).length)
    }

    await page.locator('#font-coverage-sample').evaluate((element) => element.remove())
  })
}

for (const locale of locales) {
  test(`${locale.name} typography uses the correct script and stable theme roles`, async ({ page }) => {
    await page.goto(locale.homeRoute)
    await expect(page.locator('html')).toHaveAttribute('lang', locale.lang)
    await expect(page.locator('.home-hero-typewriter')).toBeVisible()
    await expect.poll(() => page.locator('html').getAttribute('data-fonts-ready')).toBe('ready')
    await page.evaluate(() => document.fonts.ready)

    const lightHome = await readFontRoles(page)
    const isChromium = page.context().browser()?.browserType().name() === 'chromium'
    const renderedHomeFonts = isChromium
      ? await readRenderedFontNames(page, '.home-hero-typewriter')
      : []

    if (isChromium) {
      const homeText = await page.locator('.home-hero-typewriter').innerText()

      if (locale.name === 'English') {
        expect(renderedHomeFonts.some((font) => /Georgia|Times|Liberation Serif/i.test(font))).toBe(true)
      } else {
        expect(homeText).toMatch(/\p{Script=Han}/u)
        expect(renderedHomeFonts.some((font) => /Noto Sans|PingFang|MiSans|Microsoft YaHei|Microsoft JhengHei/i.test(font))).toBe(true)
        expect(renderedHomeFonts.some((font) => /Noto Serif/i.test(font))).toBe(false)
      }
    }

    if (locale.name === 'English') {
      expect(lightHome.body).toContain(locale.editorialLatin)
    } else {
      expect(lightHome.body).toContain('Inter Variable')
      expect(lightHome.body).toContain('PingFang')
      expect(lightHome.body).toContain('MiSans')
      expect(lightHome.body).toContain(locale.cjkSans)
    }
    expect(lightHome.homeTitle).toContain('Georgia')
    expect(lightHome.homeTitle).toContain(locale.name === 'English' ? 'Noto Sans SC Variable' : locale.cjkSans)
    expect(lightHome.action).toContain('Inter Variable')
    expect(lightHome.navigation).toContain('Inter Variable')
    expect(lightHome.technical).toContain('IBM Plex Mono')

    await page.evaluate(() => localStorage.setItem('yance-theme', 'dark'))
    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    await expect.poll(() => page.locator('html').getAttribute('data-fonts-ready')).toBe('ready')
    await page.evaluate(() => document.fonts.ready)
    expect(await readFontRoles(page)).toEqual(lightHome)

    await page.goto(locale.archiveRoute)
    await expect(page.locator('.hero-title').first()).toBeAttached()
    await expect.poll(() => page.locator('html').getAttribute('data-fonts-ready')).toBe('ready')
    await page.evaluate(() => document.fonts.ready)
    const darkArchiveTitle = await page.locator('.hero-title').first().evaluate((element) => getComputedStyle(element).fontFamily)
    const darkArchiveCopy = await page.locator('.hero-copy').first().evaluate((element) => getComputedStyle(element).fontFamily)
    expect(darkArchiveTitle).toContain(locale.editorialLatin)
    expect(darkArchiveTitle).toContain(locale.cjkSans)
    expect(darkArchiveCopy).toContain(locale.name === 'English' ? locale.editorialLatin : 'Inter Variable')

    if (page.context().browser()?.browserType().name() === 'chromium') {
      const renderedTitleFonts = await readRenderedFontNames(page, '.hero-title')
      const renderedCopyFonts = await readRenderedFontNames(page, '.hero-copy')

      if (locale.name === 'English') {
        expect(renderedCopyFonts.some((font) => /Georgia|Times|Liberation Serif/i.test(font))).toBe(true)
      } else {
        expect(renderedTitleFonts.some((font) => /Noto Sans|PingFang|MiSans|Microsoft YaHei|Microsoft JhengHei/i.test(font))).toBe(true)
        expect(renderedTitleFonts.some((font) => /Noto Serif/i.test(font))).toBe(false)
        expect(renderedCopyFonts.some((font) => /Noto Sans|PingFang|MiSans|Microsoft YaHei|Microsoft JhengHei/i.test(font))).toBe(true)
      }
    }

    await page.evaluate(() => localStorage.setItem('yance-theme', 'light'))
    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
    await expect.poll(() => page.locator('html').getAttribute('data-fonts-ready')).toBe('ready')
    await page.evaluate(() => document.fonts.ready)
    await expect(page.locator('.hero-title').first()).toHaveCSS('font-family', darkArchiveTitle)
  })
}
