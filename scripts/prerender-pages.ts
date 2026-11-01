import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, relative, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { pageEntries, type PageKey } from '../src/data/pageRegistry'
import { localeRegistry } from '../src/i18n/locales'
import type { Locale } from '../src/i18n/types'
import { injectPrerenderedHtml } from './prerenderHtml'

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

for (const locale of locales) {
  const localePrefix = localeRegistry[locale].pathPrefix.slice(1).split('/').filter(Boolean)
  for (const page of staticPages) {
    const routeSegments = page.routePath.split('/').filter(Boolean)
    const outputPath = resolve(dist, ...localePrefix, ...routeSegments, 'index.html')
    assertInside(dist, outputPath, 'Prerendered route')
    if (!existsSync(outputPath)) throw new Error(`Missing localized HTML shell for ${locale}:${page.key}`)

    const shell = readFileSync(outputPath, 'utf8')
    const rendered = await renderPage({ page: page.key, locale, renderDateIso })
    const html = injectPrerenderedHtml({
      shell,
      appHtml: rendered.html,
      teleports: rendered.teleports,
      page: page.key,
      locale,
      renderDateIso,
      modules: rendered.modules,
      manifest
    })
    writeFileSync(outputPath, html, 'utf8')
    generated += 1
  }
}

if (generated !== 15) throw new Error(`Expected 15 prerendered routes, generated ${generated}`)
console.log(`prerender: generated ${generated} localized page routes with ${renderDateIso}`)
