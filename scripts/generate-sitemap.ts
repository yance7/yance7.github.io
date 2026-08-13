import { mkdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { pageMetadata } from '../src/data/index'
import { sitemapEntries } from '../src/data/pageRegistry'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const output = join(root, 'public', 'sitemap.xml')
const latestContentDate = Object.values(pageMetadata)
  .map((meta) => meta.updatedAt)
  .sort()
  .at(-1) || '2026-01-01'

const xml = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...sitemapEntries.flatMap(({ path, key, changefreq, priority }) => {
    const lastmod = pageMetadata[key]?.updatedAt || latestContentDate
    return [
      '  <url>',
      `    <loc>https://www.yance777.com/${path}</loc>`,
      `    <lastmod>${lastmod}</lastmod>`,
      `    <changefreq>${changefreq}</changefreq>`,
      `    <priority>${priority}</priority>`,
      '  </url>'
    ]
  }),
  '</urlset>',
  ''
].join('\n')

mkdirSync(join(root, 'public'), { recursive: true })
writeFileSync(output, xml, 'utf8')
console.log(`sitemap: generated ${sitemapEntries.length} URLs at ${output}`)
