import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { dirname, relative, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { pageEntries, type PageKey } from '../src/data/pageRegistry'
import { localeRegistry } from '../src/i18n/locales'
import { uiMessages } from '../src/i18n/messages'
import type { Locale } from '../src/i18n/types'
import { injectPrerenderedHtml, retainFontFacesForMarkup } from './prerenderHtml'

interface RenderedPage {
  html: string
  modules: Set<string>
  teleports?: Record<string, string>
}

interface ServerRenderer {
  renderPage: (context: {
    page: Exclude<(typeof pageEntries)[number]['key'], 'concerts'>
    locale: Locale
    renderDateIso: string
  }) => Promise<RenderedPage>
}

interface ClientManifestEntry {
  file?: string
  css?: string[]
  imports?: string[]
}

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dist = resolve(root, 'dist')
const manifestPath = resolve(dist, '.vite', 'manifest.json')
const ssgDir = resolve(root, '.ssg-build')
const ssgMarker = resolve(ssgDir, '.yance-p7-ssg-output')
const serverEntry = resolve(ssgDir, 'entry-server.js')

function assertInside(parent: string, target: string, label: string) {
  const path = relative(parent, target)
  if (!path || path === '..' || path.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`) || resolve(parent, path) !== target) {
    throw new Error(`${label} must be a distinct child of ${parent}: ${target}`)
  }
}

assertInside(root, dist, 'dist output')
assertInside(root, ssgDir, 'SSG output')
if (dist === ssgDir) throw new Error('Client and SSG outputs must remain separate')
if (!existsSync(dist) || !existsSync(manifestPath)) throw new Error('Build the client bundle before prerendering routes')
if (!existsSync(ssgMarker) || !existsSync(serverEntry)) throw new Error('Build the isolated SSG entry before prerendering routes')

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as Record<string, ClientManifestEntry>
const { renderPage } = await import(pathToFileURL(serverEntry).href) as ServerRenderer
const renderDateIso = new Date().toISOString().slice(0, 10)
const locales = Object.keys(localeRegistry) as Locale[]
type StaticPage = Exclude<PageKey, 'concerts'>
const staticPages = pageEntries.filter((entry): entry is (typeof pageEntries)[number] & { key: StaticPage } => entry.key !== 'concerts')
let generated = 0

function findLocaleFontCss(locale: Locale) {
  const expectedModule = `src/fonts-${locale.toLowerCase()}.css`
  const entry = Object.entries(manifest).find(([key]) => (
    key.replaceAll('\\', '/').replace(/^\.\.\//u, '').replace(/^\/+/, '') === expectedModule
  ))?.[1]
  if (!entry?.file?.endsWith('.css')) throw new Error(`Missing client font stylesheet for locale ${locale}`)
  return entry.file
}

function writeRouteFontCss(locale: Locale, markup: string) {
  const sourceFile = resolve(dist, findLocaleFontCss(locale))
  assertInside(dist, sourceFile, 'Locale font CSS source')
  const fullCss = readFileSync(sourceFile, 'utf8')
  const routeCss = retainFontFacesForMarkup(fullCss, `${markup}\n${JSON.stringify(uiMessages[locale])}`)
  if (!routeCss.trim()) throw new Error(`Route font CSS is empty for locale ${locale}`)

  const digest = createHash('sha256').update(routeCss).digest('hex').slice(0, 12)
  const asset = `assets/vue/fonts-route-${locale.toLowerCase()}-${digest}.css`
  const outputFile = resolve(dist, asset)
  assertInside(dist, outputFile, 'Route font CSS output')
  writeFileSync(outputFile, routeCss, 'utf8')
  return asset
}

interface FontAsset {
  family: string
  weight: string
  href: string
  fileName: string
  bytes: number
}

function readFontAssets(css: string): FontAsset[] {
  const assets = new Map<string, FontAsset>()
  for (const match of css.matchAll(/@font-face\s*\{[^}]*\}/giu)) {
    const fontFace = match[0]
    const href = fontFace.match(/src\s*:\s*url\(([^)]+)\)/iu)?.[1]?.trim().replace(/^['"]|['"]$/gu, '')
    if (!href?.startsWith('/assets/') || !href.endsWith('.woff2') || href.split('/').includes('..')) continue

    const file = resolve(dist, href.slice(1))
    assertInside(dist, file, 'Font preload asset')
    if (!existsSync(file)) throw new Error(`Missing font preload asset: ${href}`)

    const family = fontFace.match(/font-family\s*:\s*([^;]+);/iu)?.[1]?.trim().replace(/^['"]|['"]$/gu, '')
    const weight = fontFace.match(/font-weight\s*:\s*([^;]+);/iu)?.[1]?.trim()
    if (!family || !weight) continue
    assets.set(href, { family, weight, href, fileName: href.slice(href.lastIndexOf('/') + 1), bytes: statSync(file).size })
  }
  return [...assets.values()]
}

function collectCriticalFontPreloads(page: StaticPage, routeCss: string) {
  if (page !== 'research') return []

  const weights = new Set(['400', '500', '600'])
  const assets = readFontAssets(routeCss)
  const selected = new Set<string>()

  for (const asset of assets) {
    const isInterfaceFont = asset.family === 'Inter Variable' && asset.fileName.startsWith('inter-latin-wght-normal-')
    const isTechnicalFont = asset.family === 'IBM Plex Mono' && weights.has(asset.weight)
    const isSmallLocaleSubset = /^Noto Sans (?:SC|HK) Variable$/u.test(asset.family) && asset.bytes <= 10 * 1024
    if (isInterfaceFont || isTechnicalFont || isSmallLocaleSubset) selected.add(asset.href)
  }

  return [...selected]
}

for (const locale of locales) {
  const localePrefix = localeRegistry[locale].pathPrefix.slice(1).split('/').filter(Boolean)
  for (const page of staticPages) {
    const routeSegments = page.routePath.split('/').filter(Boolean)
    const outputPath = resolve(dist, ...localePrefix, ...routeSegments, 'index.html')
    assertInside(dist, outputPath, 'Prerendered route')
    if (!existsSync(outputPath)) throw new Error(`Missing localized HTML shell for ${locale}:${page.key}`)

    const shell = readFileSync(outputPath, 'utf8')
    const rendered = await renderPage({ page: page.key, locale, renderDateIso })
    const localeFontStylesheet = writeRouteFontCss(locale, `${shell}\n${rendered.html}\n${rendered.teleports?.body ?? ''}`)
    const routeFontCss = readFileSync(resolve(dist, localeFontStylesheet), 'utf8')
    const fontPreloads = collectCriticalFontPreloads(page.key, routeFontCss)
    const html = injectPrerenderedHtml({
      shell,
      appHtml: rendered.html,
      teleports: rendered.teleports,
      page: page.key,
      locale,
      renderDateIso,
      modules: rendered.modules,
      manifest,
      localeFontStylesheet,
      fontPreloads
    })
    writeFileSync(outputPath, html, 'utf8')
    generated += 1
  }
}

if (generated !== 15) throw new Error(`Expected 15 prerendered routes, generated ${generated}`)
console.log(`prerender: generated ${generated} localized page routes with ${renderDateIso}`)
