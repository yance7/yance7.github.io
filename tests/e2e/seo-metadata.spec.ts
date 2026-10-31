import { expect, test } from '@playwright/test'
import { buildLocalizedPageHref, buildLocalizedLegacyHref, localeRegistry } from '../../src/i18n/locales'
import type { Locale } from '../../src/i18n/types'
import { getLocalizedSeo } from '../../src/data/seo'
import { pageEntries } from '../../src/data/pageRegistry'

const locales = Object.keys(localeRegistry) as Locale[]

for (const locale of locales) {
  for (const entry of pageEntries) {
    test(`${locale} ${entry.key} route renders complete localized SEO metadata`, async ({ page }) => {
      await page.addInitScript(() => {
        if (localStorage.getItem('yance-theme') === null) localStorage.setItem('yance-theme', 'light')
      })
      const seo = getLocalizedSeo(locale, entry.key)
      await page.goto(buildLocalizedPageHref(entry.key, locale))

      await expect(page).toHaveTitle(seo.title)
      await expect(page.locator('html')).toHaveAttribute('lang', seo.htmlLang)
      await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', seo.description)
      await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', seo.ogTitle)
      await expect(page.locator('meta[property="og:description"]')).toHaveAttribute('content', seo.ogDescription)
      await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', seo.ogImage)
      await expect(page.locator('meta[property="og:image:alt"]')).toHaveAttribute('content', seo.ogImageAlt)
      await expect(page.locator('meta[property="og:site_name"]')).toHaveAttribute('content', 'Yance · 个人主页')
      await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', seo.twitterCard)
      await expect(page.locator('meta[name="twitter:title"]')).toHaveAttribute('content', seo.twitterTitle)
      await expect(page.locator('meta[name="twitter:description"]')).toHaveAttribute('content', seo.twitterDescription)
      await expect(page.locator('meta[name="twitter:image"]')).toHaveAttribute('content', seo.twitterImage)
      await expect(page.locator('meta[name="twitter:image:alt"]')).toHaveAttribute('content', seo.twitterImageAlt)
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', seo.canonical)
      await expect(page.locator('link[rel="alternate"]')).toHaveCount(4)
      await expect(page.locator('meta[name="theme-color"]')).toHaveCount(1)

      const alternates = await page.locator('link[rel="alternate"]').evaluateAll((links) => (
        links.map((link) => ({
          hreflang: link.getAttribute('hreflang'),
          href: link.getAttribute('href')
        }))
      ))
      expect(alternates).toEqual(seo.alternates)
    })
  }

  test(`${locale} not-found page keeps noindex, title, and working navigation`, async ({ page }) => {
    const prefix = localeRegistry[locale].pathPrefix
    const homeHref = prefix ? `${prefix}/` : '/'
    await page.goto(`${prefix}/404.html`)

    await expect(page).toHaveTitle('404 · Yance')
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex')
    await expect(page.locator('html')).toHaveAttribute('lang', localeRegistry[locale].htmlLang)
    await expect(page.locator('nav a').first()).toHaveAttribute('href', homeHref)
  })

  for (const entry of pageEntries) {
    if (entry.key === 'home') continue
    test(`${locale} ${entry.key} legacy page canonicalizes without indexing`, async ({ request }) => {
      const response = await request.get(buildLocalizedLegacyHref(entry.key, locale))
      const html = await response.text()
      const seo = getLocalizedSeo(locale, entry.key)

      expect(response.ok()).toBe(true)
      expect(html).toContain(`<title>${seo.title}</title>`)
      expect(html).toContain(`<link rel="canonical" href="${seo.canonical}">`)
      expect(html).toContain('name="robots" content="noindex,follow"')
    })
  }
}

test('theme-color tracks the toggled and persisted runtime theme', async ({ page }) => {
  await page.addInitScript(() => {
    if (localStorage.getItem('yance-theme') === null) localStorage.setItem('yance-theme', 'light')
  })
  await page.goto('/en/concerts/')

  const themeColor = page.locator('meta[name="theme-color"]')
  await expect(themeColor).toHaveCount(1)
  await expect(themeColor).toHaveAttribute('content', '#F7F8F6')

  await page.locator('.theme-orbit').click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect(themeColor).toHaveAttribute('content', '#0A1014')

  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect(themeColor).toHaveAttribute('content', '#0A1014')
})
