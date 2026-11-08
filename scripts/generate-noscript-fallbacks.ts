import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { getLocalizedConcerts, getLocalizedNavItems } from '../src/data/locales'
import { localeRegistry } from '../src/i18n/locales'
import { uiMessages } from '../src/i18n/messages'
import type { Locale } from '../src/i18n/types'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const dist = join(root, 'dist')
const locales = Object.keys(localeRegistry) as Locale[]
const fallbackNote: Record<Locale, string> = {
  'zh-CN': '以下为构建期生成的静态演出列表；海报大图与动态效果需要 JavaScript。',
  'zh-HK': '以下為建置期產生的靜態演出列表；海報大圖與動態效果需要 JavaScript。',
  en: 'The static concert list below is generated at build time; poster lightbox and dynamic effects require JavaScript.'
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

function localeSwitcher(locale: Locale, pathFor: (code: Locale) => string) {
  const label = escapeHtml(uiMessages[locale].locale.selector)
  const links = locales.map((code) => {
    const definition = localeRegistry[code]
    const current = code === locale ? ' aria-current="page"' : ''
    return `<a href="${pathFor(code)}" hreflang="${definition.htmlLang}" lang="${definition.htmlLang}"${current}>${escapeHtml(definition.nativeName)}</a>`
  }).join('')
  return `<nav class="noscript-fallback-locales" aria-label="${label}">${links}</nav>`
}

function renderConcerts(locale: Locale) {
  const messages = uiMessages[locale]
  const page = messages.page.concerts
  const nav = getLocalizedNavItems(locale)
    .map((item) => `<a href="${escapeHtml(item.href)}"${item.key === 'concerts' ? ' aria-current="page"' : ''}>${escapeHtml(item.label)}</a>`)
    .join('')
  const concerts = [...getLocalizedConcerts(locale)].sort((left, right) => right.date.localeCompare(left.date))
  const items = concerts.map((concert) => `<li>
      <time datetime="${concert.date}">${concert.date}</time>
      <strong>${escapeHtml(concert.artist)} — ${escapeHtml(concert.tour)}</strong>
      <span>${escapeHtml(concert.venue)}</span>
      <a href="/assets/images/concerts/originals/${escapeHtml(concert.poster.file)}" target="_blank" rel="noopener noreferrer">${escapeHtml(messages.poster.original)}</a>
    </li>`).join('')
  const switcher = localeSwitcher(locale, (code) => `${localeRegistry[code].pathPrefix}/concerts/`)
  return `<main id="main" tabindex="-1" class="noscript-fallback" data-noscript-fallback="concerts">
    <nav class="noscript-fallback-nav" aria-label="${escapeHtml(messages.navigation.main)}">${nav}</nav>
    <p class="noscript-fallback-kicker">${escapeHtml(page.kicker)}</p>
    <h1>${escapeHtml(page.title)}</h1>
    <p>${escapeHtml(page.copy)}</p>
    <p class="noscript-notice">${escapeHtml(fallbackNote[locale])}</p>
    <ul class="noscript-concert-list">${items}</ul>
    ${switcher}
  </main>`
}

function render404(locale: Locale) {
  const messages = uiMessages[locale]
  const error = messages.error404
  const prefix = localeRegistry[locale].pathPrefix
  const switcher = localeSwitcher(locale, (code) => `${localeRegistry[code].pathPrefix}/`)
  return `<main id="main" tabindex="-1" class="noscript-fallback" data-noscript-fallback="404">
    <p class="noscript-fallback-kicker">${escapeHtml(error.kicker)}</p>
    <h1>${escapeHtml(error.title)}</h1>
    <p>${escapeHtml(error.copy)}</p>
    <nav class="noscript-fallback-nav" aria-label="${escapeHtml(messages.navigation.main)}">
      <a href="${prefix}/">${escapeHtml(error.home)}</a>
      <a href="${prefix}/research/">${escapeHtml(error.research)}</a>
    </nav>
    ${switcher}
  </main>`
}

function injectNoScript(path: string, content: string) {
  if (!existsSync(path)) throw new Error(`缺少降级目标：${path}`)
  const html = readFileSync(path, 'utf8')
  const pattern = /<noscript\b[^>]*>[\s\S]*?<\/noscript>/i
  if (!pattern.test(html)) throw new Error(`${path} 缺少 noscript 容器`)
  writeFileSync(path, html.replace(pattern, `<noscript>${content}</noscript>`), 'utf8')
}

if (!existsSync(dist)) throw new Error('dist/ 不存在，请先运行构建')

for (const locale of locales) {
  const prefix = localeRegistry[locale].pathPrefix.slice(1)
  injectNoScript(join(dist, prefix, 'concerts/index.html'), renderConcerts(locale))
  injectNoScript(join(dist, prefix, '404.html'), render404(locale))
}

console.log(`noscript-fallbacks: generated concerts and 404 fallbacks for ${locales.length} locales`)
