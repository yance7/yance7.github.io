import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { localeRegistry } from '../src/i18n/locales'
import type { Locale } from '../src/i18n/types'

interface ServerRenderer {
  renderShell: (context: { page: 'concerts' | 'not-found'; locale: Locale }) => Promise<{ html: string }>
}

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const dist = join(root, 'dist')
const serverEntry = join(root, '.ssg-build', 'entry-server.js')

if (!existsSync(dist)) throw new Error('dist/ 不存在，请先运行 vite build')
if (!existsSync(serverEntry)) throw new Error('缺少 SSG 入口，请先运行 build:ssg')

const { renderShell } = await import(pathToFileURL(serverEntry).href) as ServerRenderer
const locales = Object.keys(localeRegistry) as Locale[]

function injectShell(path: string, markup: string) {
  if (!existsSync(path)) throw new Error(`缺少启动外壳目标：${path}`)
  const html = readFileSync(path, 'utf8')
  const mountPoint = /<div\s+id="app"><\/div>/iu
  if (!mountPoint.test(html)) throw new Error(`${path} 缺少 #app 挂载点`)
  let next = html.replace(mountPoint, `<div id="app">${markup}</div>`)
  next = next.replace(/<body\b([^>]*)>/iu, (_match, attributes: string) => `<body${attributes} data-rendered="shell">`)
  writeFileSync(path, next, 'utf8')
}

let generated = 0
for (const locale of locales) {
  const prefix = localeRegistry[locale].pathPrefix.slice(1)
  const concerts = await renderShell({ page: 'concerts', locale })
  injectShell(join(dist, prefix, 'concerts/index.html'), concerts.html)
  const notFound = await renderShell({ page: 'not-found', locale })
  injectShell(join(dist, prefix, '404.html'), notFound.html)
  generated += 2
}

console.log(`startup-shells: generated ${generated} lightweight shells for concerts and 404`)