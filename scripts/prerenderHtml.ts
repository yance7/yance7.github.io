import { createHash } from 'node:crypto'
import type { PageKey } from '../src/data/pageRegistry'
import type { Locale } from '../src/i18n/types'

type StaticPage = Exclude<PageKey, 'concerts'>

interface ClientManifestEntry {
  file?: string
  css?: string[]
  imports?: string[]
}

export interface PrerenderHtmlOptions {
  shell: string
  appHtml: string
  teleports?: Record<string, string>
  page: StaticPage
  locale: Locale
  renderDateIso: string
  modules: Set<string>
  manifest: Record<string, ClientManifestEntry>
  localeFontStylesheet?: string
  fontPreloads?: string[]
}

const localeFontModules: Record<Locale, string> = {
  'zh-CN': 'src/fonts-zh-cn.css',
  'zh-HK': 'src/fonts-zh-hk.css',
  en: 'src/fonts-en.css'
}

const homeHeroImageBootstrap = "const script=document.currentScript;if(script instanceof HTMLScriptElement){const saveData=navigator.connection?.saveData===true;window.__YANCE_HOME_HERO_SAVE_DATA__=saveData;const image=script.getAttribute(saveData?'data-home-hero-image-save-data':'data-home-hero-image-full');const fallback=script.previousElementSibling;if(image&&fallback?.tagName==='NOSCRIPT'){script.insertAdjacentHTML('beforebegin',image);fallback.remove();script.remove()}}"

function homeHeroImageBootstrapHash() {
  return `sha256-${createHash('sha256').update(homeHeroImageBootstrap).digest('base64')}`
}

function normalizedManifestKey(key: string) {
  return key.replaceAll('\\', '/').replace(/^\.\.\//u, '').replace(/^\/+/, '')
}

function findModuleKey(manifest: Record<string, ClientManifestEntry>, modulePath: string) {
  const target = normalizedManifestKey(modulePath)
  return Object.keys(manifest).find((key) => normalizedManifestKey(key) === target)
}

function publicAssetHref(file: string) {
  const normalized = file.replaceAll('\\', '/')
  if (!normalized.startsWith('assets/') || normalized.split('/').includes('..')) {
    throw new Error(`Unsafe prerender asset path: ${file}`)
  }
  return `/${normalized}`
}

function addStylesheet(file: string | undefined, stylesheets: Set<string>) {
  if (!file) return
  if (!file.endsWith('.css')) throw new Error(`Expected a CSS file in the client manifest: ${file}`)
  stylesheets.add(publicAssetHref(file))
}

function addManifestCss(key: string, manifest: Record<string, ClientManifestEntry>, stylesheets: Set<string>) {
  const entry = manifest[key]
  if (!entry) return
  entry.css?.forEach((file) => addStylesheet(file, stylesheets))
  if (entry.file?.endsWith('.css')) addStylesheet(entry.file, stylesheets)
}

function collectDependencyCss(
  key: string,
  manifest: Record<string, ClientManifestEntry>,
  visited: Set<string>,
  stylesheets: Set<string>
) {
  if (visited.has(key)) return
  visited.add(key)
  const entry = manifest[key]
  if (!entry) return
  entry.css?.forEach((file) => addStylesheet(file, stylesheets))
  entry.imports?.forEach((dependency) => collectDependencyCss(dependency, manifest, visited, stylesheets))
}

function stylesheetTag(href: string) {
  return `  <link rel="stylesheet" href="${href}">`
}

function fontPreloadTag(href: string) {
  const normalized = href.replaceAll('\\', '/')
  if (!normalized.startsWith('/assets/') || normalized.split('/').includes('..')) {
    throw new Error(`Unsafe prerender font preload path: ${href}`)
  }
  return `  <link rel="preload" href="${escapeAttribute(normalized)}" as="font" type="font/woff2" crossorigin="anonymous" fetchpriority="low">`
}

function escapeAttribute(value: string) {
  return value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
}

function replaceAttribute(tag: string, name: string, value: string) {
  const pattern = new RegExp(`(\\s${name}=")([^"]*)(")`, 'u')
  if (!pattern.test(tag)) throw new Error(`Missing ${name} on the static home hero image`)
  return tag.replace(pattern, (_match, prefix: string, _previous: string, suffix: string) => (
    `${prefix}${escapeAttribute(value)}${suffix}`
  ))
}

function getAttribute(tag: string, name: string) {
  const value = tag.match(new RegExp(`\\s${name}="([^"]*)"`, 'u'))?.[1]
  if (!value) throw new Error(`Missing ${name} on the static home hero image`)
  return value
}

function staticHomeHeroImageMarkup(appHtml: string) {
  const imagePattern = /<img\b(?=[^>]*\bclass="[^"]*\bhome-hero-slideshow__image--current\b[^"]*")[^>]*>/gu
  const matches = [...appHtml.matchAll(imagePattern)]
  if (matches.length > 1) throw new Error('Expected exactly one current home hero image in prerendered markup')
  if (!matches.length) return appHtml

  const image = matches[0]![0]
  const firstCandidate = getAttribute(image, 'srcset').split(',')[0]?.trim().match(/^(\/assets\/images\/home-hero\/[A-Za-z0-9._-]+\.(?:webp|jpe?g))\s+(\d+)w$/iu)
  if (!firstCandidate) throw new Error('The static home hero image must start with a local responsive candidate')
  const smallImage = firstCandidate[1]!
  const smallWidth = Number(firstCandidate[2]!)
  const saveDataImage = replaceAttribute(
    replaceAttribute(
      replaceAttribute(image, 'src', smallImage),
      'srcset',
      `${smallImage} ${smallWidth}w`
    ),
    'sizes',
    `${smallWidth}px`
  )
  const fallback = `<noscript>${image}</noscript>`
  const bootstrap = `<script data-home-hero-image-full="${escapeAttribute(image)}" data-home-hero-image-save-data="${escapeAttribute(saveDataImage)}">${homeHeroImageBootstrap}</script>`
  return appHtml.replace(image, `${fallback}${bootstrap}`)
}

function authorizeHomeHeroImageBootstrap(html: string) {
  const policy = /(<meta\s+http-equiv="Content-Security-Policy"\s+content=")([^"]*)"/iu
  const match = html.match(policy)
  if (!match) throw new Error('The static home page must declare its Content Security Policy before adding the image bootstrap')

  const scriptSource = match[2]!.match(/\bscript-src\s+[^;]+/u)?.[0]
  if (!scriptSource) throw new Error('The static home page CSP must declare script-src before adding its image bootstrap')

  const authorizedPolicy = match[2]!.replace(scriptSource, `${scriptSource} '${homeHeroImageBootstrapHash()}'`)
  return html.replace(policy, (_match, prefix: string) => `${prefix}${authorizedPolicy}"`)
}

function deferStaticEntryBootstrap(html: string) {
  const moduleScriptPattern = /<script\b(?=[^>]*\btype\s*=\s*["']module["'])[^>]*>\s*<\/script>/giu
  const moduleScripts = [...html.matchAll(moduleScriptPattern)]
  if (!moduleScripts.length) return html
  const scripts = moduleScripts.map(([script]) => {
    const entry = /\bsrc\s*=\s*(["'])([^"']+)\1/iu.exec(script)?.[2]
    if (!entry?.startsWith('/assets/vue/') || entry.split('/').includes('..')) {
      throw new Error(`Unsafe static page module: ${entry ?? 'missing src'}`)
    }
    return { script, entry }
  })
  const mainEntries = scripts.filter(({ entry }) => /\/main(?:-[^/]+)?\.js$/iu.test(entry))
  if (mainEntries.length !== 1) throw new Error('Expected exactly one main module entry in the static HTML shell')

  const mainEntry = mainEntries[0]!
  const bootstrap = `<script defer fetchpriority="low" src="/ssg-bootstrap.js" data-entry="${escapeAttribute(mainEntry.entry)}"></script>`
  return html.replace(moduleScriptPattern, (script) => (
    script === mainEntry.script ? bootstrap : ''
  ))
}

function decodeNumericEntities(markup: string) {
  return markup.replace(/&#(?:x([\da-f]{1,6})|(\d{1,7}));/giu, (entity, hexadecimal: string | undefined, decimal: string | undefined) => {
    const codePoint = Number.parseInt(hexadecimal ?? decimal!, hexadecimal ? 16 : 10)
    return codePoint <= 0x10ffff && !(codePoint >= 0xd800 && codePoint <= 0xdfff)
      ? String.fromCodePoint(codePoint)
      : entity
  })
}

function parseUnicodeRange(token: string) {
  const value = token.trim().replace(/^U\+/iu, '')
  if (!value) return null

  if (value.includes('?')) {
    const firstWildcard = value.indexOf('?')
    if ([...value.slice(firstWildcard)].some((character) => character !== '?')) return null
    const prefix = value.slice(0, firstWildcard)
    const wildcardCount = value.length - firstWildcard
    return {
      start: Number.parseInt(`${prefix}${'0'.repeat(wildcardCount)}`, 16),
      end: Number.parseInt(`${prefix}${'F'.repeat(wildcardCount)}`, 16)
    }
  }

  const match = value.match(/^([\da-f]+)(?:-([\da-f]+))?$/iu)
  if (!match) return null
  return { start: Number.parseInt(match[1]!, 16), end: Number.parseInt(match[2] ?? match[1]!, 16) }
}

function containsCodePointInRange(codePoints: number[], start: number, end: number) {
  let low = 0
  let high = codePoints.length
  while (low < high) {
    const middle = Math.floor((low + high) / 2)
    if (codePoints[middle]! < start) low = middle + 1
    else high = middle
  }
  return low < codePoints.length && codePoints[low]! <= end
}

export function retainFontFacesForMarkup(css: string, markup: string) {
  const codePoints = [...new Set(Array.from(decodeNumericEntities(markup), (character) => character.codePointAt(0)!))]
    .sort((left, right) => left - right)

  return css.replace(/@font-face\s*\{[^}]*\}/giu, (fontFace) => {
    const unicodeRanges = fontFace.match(/unicode-range\s*:\s*([^;}]+)/iu)?.[1]
    if (!unicodeRanges) return fontFace

    const usedByMarkup = unicodeRanges.split(',').some((token) => {
      const range = parseUnicodeRange(token)
      return range && containsCodePointInRange(codePoints, range.start, range.end)
    })
    return usedByMarkup ? fontFace : ''
  })
}

export function injectPrerenderedHtml(options: PrerenderHtmlOptions) {
  const { shell, appHtml, teleports = {}, page, locale, renderDateIso, modules, manifest, localeFontStylesheet, fontPreloads = [] } = options
  const mountPoint = /<div\s+id="app"><\/div>/giu
  const mountPoints = [...shell.matchAll(mountPoint)]
  if (mountPoints.length !== 1) throw new Error('Expected exactly one #app mount point in the HTML shell')
  if (!/<body\b[^>]*>/iu.test(shell) || !/<\/head>/iu.test(shell)) {
    throw new Error('The HTML shell must contain a body and closing head tag')
  }
  const unsupportedTeleportTargets = Object.keys(teleports).filter((target) => target !== 'body' && teleports[target])
  if (unsupportedTeleportTargets.length) {
    throw new Error(`Unsupported prerender Teleport targets: ${unsupportedTeleportTargets.join(', ')}`)
  }

  const pageModule = findModuleKey(manifest, `src/pages/${page[0]!.toUpperCase()}${page.slice(1)}Page.vue`)
  if (!pageModule || !manifest[pageModule]?.file?.endsWith('.js')) {
    throw new Error(`Missing client manifest entry for static page ${page}`)
  }
  const localeFontModule = findModuleKey(manifest, localeFontModules[locale])
  if (!localeFontModule || !manifest[localeFontModule]?.file?.endsWith('.css')) {
    throw new Error(`Missing client font stylesheet for locale ${locale}`)
  }

  const stylesheets = new Set<string>()
  addManifestCss(pageModule, manifest, stylesheets)
  for (const moduleId of modules) {
    const moduleKey = findModuleKey(manifest, moduleId)
    if (moduleKey) addManifestCss(moduleKey, manifest, stylesheets)
  }
  if (localeFontStylesheet) {
    const fullLocaleFontCss = manifest[localeFontModule]?.file
    if (fullLocaleFontCss) stylesheets.delete(publicAssetHref(fullLocaleFontCss))
  } else {
    addManifestCss(localeFontModule, manifest, stylesheets)
  }
  const routeFontStylesheet = localeFontStylesheet ? publicAssetHref(localeFontStylesheet) : undefined

  if (page === 'home') {
    const homeFontModule = findModuleKey(manifest, 'src/fonts-home-hero.css')
    if (!homeFontModule || !manifest[homeFontModule]?.file?.endsWith('.css')) {
      throw new Error('Missing homepage greeting and particle font stylesheet')
    }
    addManifestCss(homeFontModule, manifest, stylesheets)
  }

  collectDependencyCss(pageModule, manifest, new Set(), stylesheets)
  const additions = [
    ...[...stylesheets].map(stylesheetTag),
    ...(routeFontStylesheet ? [stylesheetTag(routeFontStylesheet)] : [])
  ].filter((tag) => !shell.includes(tag.match(/href="([^"]+)"/u)?.[1] ?? ''))

  const bodyTeleports = teleports.body ?? ''
  const renderedAppHtml = page === 'home' ? staticHomeHeroImageMarkup(appHtml) : appHtml
  let html = shell.replace(mountPoint, `<div id="app">${renderedAppHtml}</div>`)
  if (renderedAppHtml !== appHtml) html = authorizeHomeHeroImageBootstrap(html)
  html = deferStaticEntryBootstrap(html)
  html = html.replace(/<body\b([^>]*)>/iu, (_match, attributes: string) => (
    `<body${attributes} data-rendered="ssg" data-render-date="${escapeAttribute(renderDateIso)}"${routeFontStylesheet ? ` data-locale-font-stylesheet="${escapeAttribute(routeFontStylesheet)}"` : ''}>${bodyTeleports}`
  ))
  if (additions.length) html = html.replace('</head>', `${additions.join('\n')}\n</head>`)
  if (fontPreloads.length) {
    const preloads = [...new Set(fontPreloads)].map(fontPreloadTag).join('\n')
    const moduleScript = /<script\b(?=[^>]*\btype\s*=\s*["']module["'])[^>]*>/iu.exec(html)
    const firstStylesheet = /<link\b(?=[^>]*\brel\s*=\s*["']stylesheet["'])[^>]*>/iu.exec(html)
    const insertionPoint = moduleScript?.index ?? firstStylesheet?.index ?? html.indexOf('</head>')
    if (insertionPoint < 0) throw new Error('Unable to find a stylesheet preload insertion point')
    html = `${html.slice(0, insertionPoint)}${preloads}\n${html.slice(insertionPoint)}`
  }
  return html
}
