import { expect, test, type Page } from '@playwright/test'

const locales = [
  {
    name: 'Simplified Chinese',
    lang: 'zh-CN',
    homeRoute: '/',
    archiveRoute: '/academics/',
    cjkSans: 'Noto Sans SC Variable',
    cjkSerif: 'Noto Serif SC Variable',
    editorialLatin: 'Inter Variable',
    homeCjk: 'LXGW WenKai Hero SC',
    glyphs: '你好我是研究'
  },
  {
    name: 'Traditional Chinese',
    lang: 'zh-HK',
    homeRoute: '/zh-hk/',
    archiveRoute: '/zh-hk/academics/',
    cjkSans: 'Noto Sans HK Variable',
    cjkSerif: 'Noto Serif HK Variable',
    editorialLatin: 'Inter Variable',
    homeCjk: 'LXGW WenKai Hero TC',
    glyphs: '你好我是研究'
  },
  {
    name: 'English',
    lang: 'en',
    homeRoute: '/en/',
    archiveRoute: '/en/academics/',
    cjkSans: 'Noto Sans SC Variable',
    cjkSerif: 'Noto Serif SC Variable',
    editorialLatin: 'Georgia',
    homeCjk: '',
    glyphs: ''
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

for (const locale of locales) {
  test(`${locale.name} typography uses the correct script and stable theme roles`, async ({ page }) => {
    await page.goto(locale.homeRoute)
    await expect(page.locator('html')).toHaveAttribute('lang', locale.lang)
    await expect(page.locator('.home-hero-typewriter')).toBeVisible()
    await expect.poll(() => page.locator('html').getAttribute('data-fonts-ready')).toBe('ready')
    await page.evaluate(() => document.fonts.ready)

    const lightHome = await readFontRoles(page)
    expect(lightHome.body).toContain('Inter Variable')
    expect(lightHome.body).toContain('PingFang')
    expect(lightHome.body).toContain('MiSans')
    expect(lightHome.body).toContain(locale.cjkSans)
    expect(lightHome.homeTitle).toContain('Georgia')
    expect(lightHome.homeTitle).toContain(locale.homeCjk || 'Georgia')
    expect(lightHome.action).toContain('Inter Variable')
    expect(lightHome.navigation).toContain('Inter Variable')
    expect(lightHome.technical).toContain('IBM Plex Mono')

    if (locale.homeCjk) {
      await expect.poll(() => page.evaluate(({ font, glyphs }) =>
        document.fonts.check(`400 16px "${font}"`, glyphs),
      { font: locale.homeCjk, glyphs: locale.glyphs })).toBe(true)
    }

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
    expect(darkArchiveTitle).toContain(locale.editorialLatin)
    expect(darkArchiveTitle).toContain(locale.cjkSerif)

    await page.evaluate(() => localStorage.setItem('yance-theme', 'light'))
    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
    await expect.poll(() => page.locator('html').getAttribute('data-fonts-ready')).toBe('ready')
    await page.evaluate(() => document.fonts.ready)
    await expect(page.locator('.hero-title').first()).toHaveCSS('font-family', darkArchiveTitle)
  })
}
