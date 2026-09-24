import { existsSync, mkdirSync, renameSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { pageEntries } from '../src/data/pageRegistry'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const dist = join(root, 'dist')
const manifestPath = join(dist, '.vite', 'manifest.json')

if (!existsSync(dist)) throw new Error('dist/ 不存在，请先运行 vite build')

for (const entry of pageEntries) {
  if (entry.key === 'home') continue
  const sourcePath = join(dist, `${entry.htmlName}.html`)
  const directory = join(dist, entry.key)
  const outputPath = join(directory, 'index.html')
  if (!existsSync(sourcePath)) throw new Error(`Missing Vite HTML output: ${sourcePath}`)
  mkdirSync(directory, { recursive: true })
  renameSync(sourcePath, outputPath)
}

if (existsSync(manifestPath)) {
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as Record<string, { file?: string }>
  for (const [key, entry] of Object.entries(manifest)) {
    const page = pageEntries.find(({ htmlName }) => key.endsWith(`/${htmlName}.html`))
    if (page && page.key !== 'home') entry.file = `${page.key}/index.html`
  }
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
}

console.log(`directory-pages: placed ${pageEntries.length - 1} HTML entries at route indexes`)