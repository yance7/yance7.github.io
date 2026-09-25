import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { getLocalizedSeo } from '../src/data/seo'
import { pageEntries } from '../src/data/pageRegistry'
import { buildLocalizedLegacyHref, buildLocalizedPageHref, localeRegistry } from '../src/i18n/locales'
import type { Locale } from '../src/i18n/types'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const dist = join(root, 'dist')
const template = readFileSync(join(root, 'html-src', 'legacy-redirect.html'), 'utf8')
const locales = Object.keys(localeRegistry) as Locale[]
const redirectCopy: Record<Locale, { title: string; message: string; link: string }> = {
  'zh-CN': { title: '页面已迁移 · Yance', message: '页面已迁移。如果没有自动跳转，请点击这里。', link: '继续前往' },
  'zh-HK': { title: '頁面已遷移 · Yance', message: '頁面已遷移。如未自動跳轉，請按此繼續。', link: '繼續前往' },
  en: { title: 'Page moved · Yance', message: 'This page has moved. If you are not redirected, follow this link.', link: 'Continue to the page' }
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

for (const locale of locales) {
  for (const entry of pageEntries) {
    // GitHub Pages serves `/` and `/index.html` from the same file.
    if (entry.key === 'home') continue
    const canonicalPath = buildLocalizedPageHref(entry.key, locale)
    const legacyPath = buildLocalizedLegacyHref(entry.key, locale)
    if (canonicalPath === legacyPath) throw new Error(`Legacy URL loops to itself: ${legacyPath}`)
    const seo = getLocalizedSeo(locale, entry.key)
    const copy = redirectCopy[locale]
    const html = template
      .replaceAll('__REDIRECT_LANGUAGE__', localeRegistry[locale].htmlLang)
      .replaceAll('__REDIRECT_TITLE__', escapeHtml(copy.title))
      .replaceAll('__REDIRECT_MESSAGE__', escapeHtml(copy.message))
      .replaceAll('__REDIRECT_LINK__', escapeHtml(copy.link))
      .replaceAll('__REDIRECT_CANONICAL_URL__', seo.canonical)
      .replaceAll('__REDIRECT_TARGET__', escapeHtml(canonicalPath))

    const outputPath = join(dist, legacyPath.slice(1))
    mkdirSync(dirname(outputPath), { recursive: true })
    writeFileSync(outputPath, html, 'utf8')
  }
}

console.log(`legacy-pages: generated ${pageEntries.length - 1} legacy redirects per locale`)
