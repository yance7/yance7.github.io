import { expect, test, type Page } from '@playwright/test'

const locales = [
  {
    name: 'Simplified Chinese',
    lang: 'zh-CN',
    homeRoute: '/',
    archiveRoute: '/academics/',
    cjkSans: 'Noto Sans CJK SC',
    editorialLatin: 'Inter Variable',
  },
  {
    name: 'Traditional Chinese',
    lang: 'zh-HK',
    homeRoute: '/zh-hk/',
    archiveRoute: '/zh-hk/academics/',
    cjkSans: 'Noto Sans CJK TC',
    editorialLatin: 'Inter Variable',
  },
  {
    name: 'English',
    lang: 'en',
    homeRoute: '/en/',
    archiveRoute: '/en/academics/',
    cjkSans: 'Noto Sans CJK SC',
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

async function readRenderedFontNames(page: Page, selector: string) {
  const session = await page.context().newCDPSession(page)

  try {
    await session.send('DOM.enable')
    await session.send('CSS.enable')
    const { root } = await session.send('DOM.getDocument')
    const { nodeId } = await session.send('DOM.querySelector', { nodeId: root.nodeId, selector })
    if (!nodeId) throw new Error(`Missing rendered typography sample: ${selector}`)
    const { fonts } = await session.send('CSS.getPlatformFontsForNode', { nodeId })
    return fonts.map(({ familyName }) => familyName)
  } finally {
    await session.detach()
  }
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
