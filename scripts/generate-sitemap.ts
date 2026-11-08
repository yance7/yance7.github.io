import { mkdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { serializeSitemap } from '../src/data/sitemap'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const output = join(root, 'dist', 'sitemap.xml')
const xml = serializeSitemap()

mkdirSync(join(root, 'dist'), { recursive: true })
writeFileSync(output, xml, 'utf8')
console.log(`sitemap: generated 18 URLs at ${output}`)
