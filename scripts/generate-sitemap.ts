import { mkdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { pageMetadata } from '../src/data/index'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const output = join(root, 'public', 'sitemap.xml')
const latestContentDate = Object.values(pageMetadata)
  .map((meta) => meta.updatedAt)
  .sort()
  .at(-1) || '2026-01-01'

const pages = [
  { path: '', key: 'home', changefreq: 'weekly', priority: '1.0' },
  { path: 'academics.html', key: 'academics', changefreq: 'monthly', priority: '0.8' },
  { path: 'honors.html', key: 'honors', changefreq: 'monthly', priority: '0.8' },
  { path: 'research.html', key: 'research', changefreq: 'monthly', priority: '0.9' },
  { path: 'works.html', key: 'works', changefreq: 'monthly', priority: '0.9' },
  { path: 'concerts.html', key: 'concerts', changefreq: 'monthly', priority: '0.7' }
]

const xml = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...pages.flatMap(({ path, key, changefreq, priority }) => {
    const lastmod = pageMetadata[key as keyof typeof pageMetadata]?.updatedAt || latestContentDate
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
console.log(`sitemap: generated ${pages.length} URLs at ${output}`)
