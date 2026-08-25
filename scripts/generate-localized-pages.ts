import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { uiMessages } from '../src/i18n/messages'
import { localeRegistry } from '../src/i18n/locales'
import type { Locale } from '../src/i18n/types'
import { getLocalizedSeo } from '../src/data/seo'
import { pageEntries } from '../src/data/pageRegistry'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const dist = join(root, 'dist')
const localizedTargets = ['zh-HK', 'en'] as const

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

function rewriteJsonLd(html: string, seo: ReturnType<typeof getLocalizedSeo>) {
  return html.replace(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g, (_match, source: string) => {
    try {
      const json = JSON.parse(source) as Record<string, unknown>
      json.url = seo.canonical
      json.inLanguage = seo.jsonLdLanguage
      return `<script type="application/ld+json">${JSON.stringify(json)}</script>`
    } catch {
      return _match
    }
  })
}

function normalizeRootAssets(html: string) {
  return html.replace(/(["'=])(?:\.\.\/)?(assets\/)/g, '$1/$2')
}

function rewriteLocalizedHtml(source: string, locale: Locale, page: (typeof pageEntries)[number]['key']) {
  const seo = getLocalizedSeo(locale, page)
  let html = source
    .replace(/<html\s+lang="[^"]*"(?:\s+data-locale="[^"]*")?/i, `<html lang="${seo.htmlLang}" data-locale="${locale}"`)
    .replace(/<body([^>]*)>/i, (_match, attrs: string) => `<body${attrs.replace(/\sdata-locale="[^"]*"/i, '')} data-locale="${locale}">`)
    .replace(/<title>[^<]*<\/title>/i, `<title>${escapeHtml(seo.title)}</title>`)
    .replace(/<meta name="description" content="[^"]*">/i, `<meta name="description" content="${escapeHtml(seo.description)}">`)
    .replace(/<meta property="og:title" content="[^"]*">/i, `<meta property="og:title" content="${escapeHtml(seo.ogTitle)}">`)
    .replace(/<meta property="og:description" content="[^"]*">/i, `<meta property="og:description" content="${escapeHtml(seo.ogDescription)}">`)
    .replace(/<meta property="og:url" content="[^"]*">/i, `<meta property="og:url" content="${seo.canonical}">`)
    .replace(/<meta property="og:site_name" content="[^"]*">/i, `<meta property="og:site_name" content="${escapeHtml(seo.ogTitle)}">`)
    .replace(/<meta property="og:locale" content="[^"]*">/i, `<meta property="og:locale" content="${seo.ogLocale}">`)
    .replace(/<meta property="og:image" content="[^"]*">/i, `<meta property="og:image" content="${seo.ogImage}">`)
    .replace(/<meta property="og:image:alt" content="[^"]*">/i, `<meta property="og:image:alt" content="${escapeHtml(seo.ogImageAlt)}">`)
    .replace(/<link rel="canonical" href="[^"]*">/i, `<link rel="canonical" href="${seo.canonical}">`)
    .replace(/\s*<link rel="alternate" hreflang="[^"]*" href="[^"]*">/gi, '')

  const alternateLinks = seo.alternates
    .map((alternate) => `  <link rel="alternate" hreflang="${alternate.hreflang}" href="${alternate.href}">`)
    .join('\n')
  html = html.replace('</head>', `${alternateLinks}\n</head>`)
  return normalizeRootAssets(rewriteJsonLd(html, seo))
}

function rewriteLocalized404(source: string, locale: Locale) {
  const messages = uiMessages[locale]
  const definition = localeRegistry[locale]
  return source
    .replace(/<html\s+lang="[^"]*"(?:\s+data-locale="[^"]*")?/i, `<html lang="${definition.htmlLang}" data-locale="${locale}"`)
    .replace(/<body([^>]*)>/i, (_match, attrs: string) => `<body${attrs.replace(/\sdata-locale="[^"]*"/i, '')} data-locale="${locale}">`)
    .replace(/<title>[^<]*<\/title>/i, `<title>${escapeHtml(messages.error404.title)} · Yance</title>`)
    .replace(/<meta name="description" content="[^"]*">/i, `<meta name="description" content="${escapeHtml(messages.error404.copy)}">`)
}

function writeLocalizedFile(locale: Locale, filename: string, content: string) {
  const directory = join(dist, localeRegistry[locale].pathPrefix.slice(1))
  mkdirSync(directory, { recursive: true })
  writeFileSync(join(directory, filename), content, 'utf8')
}

if (!existsSync(dist)) throw new Error('dist/ 不存在，请先运行 vite build')

for (const locale of localizedTargets) {
  for (const entry of pageEntries) {
    const source = readFileSync(join(dist, `${entry.htmlName}.html`), 'utf8')
    writeLocalizedFile(locale, `${entry.htmlName}.html`, rewriteLocalizedHtml(source, locale, entry.key))
  }
  const notFound = readFileSync(join(dist, '404.html'), 'utf8')
  writeLocalizedFile(locale, '404.html', rewriteLocalized404(notFound, locale))
}

console.log(`localized-pages: generated ${pageEntries.length * localizedTargets.length} pages plus localized 404s`)
