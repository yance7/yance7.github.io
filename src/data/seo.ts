import { buildLocalizedPageHref, localeRegistry } from '../i18n/locales.ts'
import type { Locale } from '../i18n/types.ts'
import { getLocalizedPageMeta } from './locales/index.ts'
import { pageEntries, pageRegistry, type PageKey } from './pageRegistry.ts'

export const SITE_ORIGIN = 'https://yance.me'

interface SeoAlternate {
  hreflang: string
  href: string
}

export interface LocalizedSeo {
  locale: Locale
  htmlLang: string
  ogLocale: string
  title: string
  description: string
  ogTitle: string
  ogDescription: string
  ogImage: string
  ogImageAlt: string
  twitterCard: 'summary_large_image'
  twitterTitle: string
  twitterDescription: string
  twitterImage: string
  twitterImageAlt: string
  canonical: string
  alternates: SeoAlternate[]
  jsonLdLanguage: string
}

export interface LocalizedSitemapEntry {
  locale: Locale
  key: PageKey
  path: string
  changefreq: (typeof pageEntries)[number]['changefreq']
  priority: (typeof pageEntries)[number]['priority']
}

function localizedPath(locale: Locale, page: PageKey) {
  const href = buildLocalizedPageHref(page, locale)
  return href === '/' ? '' : href.slice(1)
}

export function buildLocalizedCanonicalUrl(locale: Locale, page: PageKey) {
  const href = buildLocalizedPageHref(page, locale)
  return `${SITE_ORIGIN}${href}`
}

export function getLocalizedSeo(locale: Locale, page: PageKey): LocalizedSeo {
  const meta = getLocalizedPageMeta(locale, page)
  const definition = localeRegistry[locale]
  const title = meta.documentTitle
  const description = meta.copy
  const canonical = buildLocalizedCanonicalUrl(locale, page)
  const alternates = (Object.keys(localeRegistry) as Locale[]).map((target) => ({
    hreflang: localeRegistry[target].htmlLang,
    href: buildLocalizedCanonicalUrl(target, page)
  }))
  alternates.push({
    hreflang: 'x-default',
    href: buildLocalizedCanonicalUrl('zh-CN', page)
  })
  const ogImage = `${SITE_ORIGIN}/${pageRegistry[page].ogImage}`
  const ogImageAlt = `${meta.title} — Yance`

  return {
    locale,
    htmlLang: definition.htmlLang,
    ogLocale: definition.ogLocale,
    title,
    description,
    ogTitle: title,
    ogDescription: description,
    ogImage,
    ogImageAlt,
    twitterCard: 'summary_large_image',
    twitterTitle: title,
    twitterDescription: description,
    twitterImage: ogImage,
    twitterImageAlt: ogImageAlt,
    canonical,
    alternates,
    jsonLdLanguage: definition.htmlLang
  }
}

export const localizedSitemapEntries: LocalizedSitemapEntry[] = (Object.keys(localeRegistry) as Locale[]).flatMap((locale) => (
  pageEntries.map(({ key, changefreq, priority }) => ({
    locale,
    key,
    path: localizedPath(locale, key),
    changefreq,
    priority
  }))
))
