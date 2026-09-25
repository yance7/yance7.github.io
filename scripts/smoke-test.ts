import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { localeRegistry } from '../src/i18n/locales'
import type { Locale } from '../src/i18n/types'
import { getLocalizedSeo, localizedSitemapEntries } from '../src/data/seo'
import { pageEntries } from '../src/data/pageRegistry'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const dist = join(root, 'dist')
const locales = ['zh-CN', 'zh-HK', 'en'] as const

function read(path: string) {
  return readFileSync(join(dist, path), 'utf8')
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

function routeDirectory(routePath: string) {
  return routePath === '/' ? '' : routePath.slice(1, -1)
}

function outputPagePath(locale: Locale, routePath: string) {
  const prefix = localeRegistry[locale].pathPrefix.slice(1)
  return [...[prefix, routeDirectory(routePath)].filter(Boolean), 'index.html'].join('/')
}

assert(existsSync(dist), 'dist/ 不存在，请先运行 npm run build')
const manifestPath = join(dist, '.vite/manifest.json')
assert(existsSync(manifestPath), 'dist 缺少 Vite manifest')
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as Record<string, { css?: string[] }>
const auditedPageSources = [
  '../src/pages/HomePage.vue',
  '../src/pages/ResearchPage.vue',
  '../src/pages/ConcertsPage.vue'
] as const
const pageManifest = Object.fromEntries(
  auditedPageSources.map((source) => {
    const page = source.split('/').at(-1)?.replace(/\.vue$/, '') ?? source
    const entry = manifest[source]
    assert(entry, `Vite manifest 缺少 ${source}`)
    assert(entry.css?.length, `${source} 缺少页面 CSS chunk`)
    return [page, entry.css]
  })
) as Record<string, string[]>

for (const [page, cssFiles] of Object.entries(pageManifest)) {
  for (const [otherPage, otherCssFiles] of Object.entries(pageManifest)) {
    if (page === otherPage) continue
    assert(
      !cssFiles.some((cssFile) => otherCssFiles.includes(cssFile)),
      `${page} 错误包含 ${otherPage} 页面 CSS chunk`
    )
  }
}

function assertHtmlContract(path: string, locale: Locale, pageKey?: (typeof pageEntries)[number]['key']) {
  const html = read(path)
  assert(/Content-Security-Policy/.test(html), `${path} 缺少 CSP`)
  assert(/script-src 'self' 'sha256-[^']+'/.test(html), `${path} CSP 缺少 theme bootstrap hash`)
  assert(html.includes('<div id="app"></div>'), `${path} 缺少 Vue 挂载点`)
  assert(/assets\/vue\/main-[^"']+\.js/.test(html), `${path} 缺少 hash 入口资源`)
  assert(!html.includes('../src/'), `${path} 仍引用源码资源`)
  assert(!html.includes('fonts.googleapis.com'), `${path} 仍阻塞加载 Google Fonts`)
  assert(!html.includes('fonts.gstatic.com'), `${path} 仍依赖 Google Fonts 字体文件`)
  assert(html.includes(`data-locale="${locale}"`), `${path} 缺少 data-locale=${locale}`)
  assert(html.includes(`<html lang="${localeRegistry[locale].htmlLang}"`), `${path} lang 属性不正确`)
  assert(html.includes('href="/assets/brand/favicon-32.png" sizes="32x32" type="image/png"'), `${path} 缺少 32px favicon`)
  assert(html.includes('href="/assets/brand/favicon-16.png" sizes="16x16" type="image/png"'), `${path} 缺少 16px favicon`)
  assert(html.includes('rel="apple-touch-icon" href="/assets/brand/yance-icon-180.png" sizes="180x180"'), `${path} 缺少 Apple Touch Icon`)
  assert(html.includes('rel="manifest" href="/assets/site.webmanifest"'), `${path} 缺少 web manifest`)

  if (!pageKey) return
  const seo = getLocalizedSeo(locale, pageKey)
  assert(html.includes(`<link rel="canonical" href="${seo.canonical}">`), `${path} canonical 不正确`)
  assert(html.includes(`og:url" content="${seo.canonical}"`), `${path} og:url 不正确`)
  assert(html.includes(`og:locale" content="${seo.ogLocale}"`), `${path} og:locale 不正确`)
  assert(html.includes(`og:image" content="${seo.ogImage}"`), `${path} OG image 不正确`)
  assert(html.includes(`og:image:alt" content="${seo.ogImageAlt}`), `${path} OG image alt 不正确`)
  for (const alternate of seo.alternates) {
    assert(html.includes(`rel="alternate" hreflang="${alternate.hreflang}" href="${alternate.href}"`), `${path} 缺少 ${alternate.hreflang} hreflang`)
  }
}

for (const entry of pageEntries) {
  assertHtmlContract(outputPagePath('zh-CN', entry.routePath), 'zh-CN', entry.key)
}
assertHtmlContract('404.html', 'zh-CN')

for (const locale of locales.slice(1)) {
  for (const entry of pageEntries) {
    assertHtmlContract(outputPagePath(locale, entry.routePath), locale, entry.key)
  }
  const prefix = localeRegistry[locale].pathPrefix.slice(1)
  assertHtmlContract(`${prefix}/404.html`, locale)
}

for (const locale of locales) {
  const prefix = localeRegistry[locale].pathPrefix.slice(1)
  for (const entry of pageEntries) {
    if (entry.key === 'home') continue
    const legacyPath = [...[prefix].filter(Boolean), `${entry.htmlName}.html`].join('/')
    const redirect = read(legacyPath)
    const target = `${localeRegistry[locale].pathPrefix}${entry.routePath}`
    const seo = getLocalizedSeo(locale, entry.key)
    assert(redirect.includes('name="robots" content="noindex,follow"'), `${legacyPath} 缺少 noindex,follow`)
    assert(redirect.includes("script-src 'self'"), `${legacyPath} CSP 不允许同源跳转脚本`)
    assert(redirect.includes(`<link rel="canonical" href="${seo.canonical}">`), `${legacyPath} canonical 不正确`)
    assert(redirect.includes(`http-equiv="refresh" content="1;url=${target}"`), `${legacyPath} 缺少 meta refresh`)
    assert(redirect.includes(`data-target="${target}"`), `${legacyPath} 跳转脚本目标不正确`)
    assert(redirect.includes(`href="${target}"`), `${legacyPath} 缺少人工跳转链接`)
    assert(redirect.includes('src="/assets/legacy-redirect.js"'), `${legacyPath} 缺少同源跳转脚本`)
    assert(!redirect.includes('<div id="app"></div>'), `${legacyPath} 不应复制页面正文`)
    assert(target !== `/${legacyPath}`, `${legacyPath} 会形成跳转循环`)
  }
}

for (const asset of [
  'assets/og-card.png',
  'assets/og-home.png',
  'assets/og-academics.png',
  'assets/og-honors.png',
  'assets/og-research.png',
  'assets/og-works.png',
  'assets/og-concerts.png',
  'assets/brand/favicon-16.png',
  'assets/brand/favicon-32.png',
  'assets/brand/yance-icon-180.png',
  'assets/brand/yance-icon-192.png',
  'assets/brand/yance-icon-512.png',
  'assets/brand/yance-mark-48.webp',
  'assets/brand/yance-mark-64.webp',
  'assets/brand/yance-mark-96.webp',
  'assets/brand/yance-mark-128.webp',
  'assets/brand/yance-mark-256.webp',
  'assets/brand/yance-mark-fallback.png',
  'assets/site.webmanifest',
  'assets/legacy-redirect.js',
  'assets/case/fresheye-og-cover.png',
  'assets/concerts',
  'assets/concerts/thumbs',
  'CNAME',
  'robots.txt',
  'sitemap.xml'
]) {
  assert(existsSync(join(dist, asset)), `缺少静态资源：${asset}`)
}

const index = read('index.html')
assert(!index.includes('og-card.svg'), 'OG image 仍引用 SVG')
for (const entry of pageEntries) {
  const html = read(outputPagePath('zh-CN', entry.routePath))
  assert(html.includes(entry.ogImage), `${entry.htmlName} 页面未使用专属 OG image`)
}

const sitemap = read('sitemap.xml')
assert((sitemap.match(/<url>/g) ?? []).length === localizedSitemapEntries.length, 'sitemap URL 数量不是 18')
assert((sitemap.match(/<xhtml:link/g) ?? []).length === localizedSitemapEntries.length * 3, 'sitemap hreflang 数量不正确')
assert(!sitemap.includes('/404.html'), 'sitemap 不应包含 404')
assert(!sitemap.includes('.html'), 'sitemap 只应包含正式目录 URL')

const concertOriginals = readdirSync(join(dist, 'assets/concerts')).filter((file) => /\.(?:jpe?g|png|webp)$/i.test(file))
const concertThumbs = readdirSync(join(dist, 'assets/concerts/thumbs')).filter((file) => /\.(?:webp|avif)$/i.test(file))
assert(concertOriginals.length > 0, 'Concert 原图产物为空')
assert(concertThumbs.length > 0, 'Concert 缩略图产物为空')
assert(read('CNAME').trim() === 'www.yance777.com', 'CNAME 产物不正确')
console.log(`smoke: ${pageEntries.length} root routes, ${localizedSitemapEntries.length} localized sitemap URLs, and static assets verified`)
