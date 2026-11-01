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
}

const localeFontModules: Record<Locale, string> = {
  'zh-CN': 'src/fonts-zh-cn.css',
  'zh-HK': 'src/fonts-zh-hk.css',
  en: 'src/fonts-en.css'
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

function collectPreloads(
  key: string,
  manifest: Record<string, ClientManifestEntry>,
  visited: Set<string>,
  files: Set<string>,
  stylesheets: Set<string>,
  skipModule?: string
) {
  if (visited.has(key)) return
  visited.add(key)
  const entry = manifest[key]
  if (!entry) return
  entry.css?.forEach((file) => addStylesheet(file, stylesheets))
  if (entry.file?.endsWith('.js') && key !== skipModule) files.add(publicAssetHref(entry.file))
  entry.imports?.forEach((dependency) => collectPreloads(dependency, manifest, visited, files, stylesheets, skipModule))
}

function linkTag(rel: 'stylesheet' | 'modulepreload', href: string) {
  return `  <link rel="${rel}" href="${href}">`
}

function escapeAttribute(value: string) {
  return value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;')
}

export function injectPrerenderedHtml(options: PrerenderHtmlOptions) {
  const { shell, appHtml, teleports = {}, page, locale, renderDateIso, modules, manifest } = options
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
  addManifestCss(localeFontModule, manifest, stylesheets)

  if (page === 'home') {
    const homeFontModule = findModuleKey(manifest, 'src/fonts-home-hero.css')
    if (!homeFontModule || !manifest[homeFontModule]?.file?.endsWith('.css')) {
      throw new Error('Missing homepage greeting and particle font stylesheet')
    }
    addManifestCss(homeFontModule, manifest, stylesheets)
  }

  const preloads = new Set<string>()
  collectPreloads(pageModule, manifest, new Set(), preloads, stylesheets, pageModule)
  const additions = [
    ...[...stylesheets].map((href) => linkTag('stylesheet', href)),
    ...[...preloads].map((href) => linkTag('modulepreload', href))
  ].filter((tag) => !shell.includes(tag.match(/href="([^"]+)"/u)?.[1] ?? ''))

  const bodyTeleports = teleports.body ?? ''
  let html = shell.replace(mountPoint, `<div id="app">${appHtml}</div>`)
  html = html.replace(/<body\b([^>]*)>/iu, (_match, attributes: string) => (
    `<body${attributes} data-rendered="ssg" data-render-date="${escapeAttribute(renderDateIso)}">${bodyTeleports}`
  ))
  if (additions.length) html = html.replace('</head>', `${additions.join('\n')}\n</head>`)
  return html
}
