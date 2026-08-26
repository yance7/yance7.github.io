import { mkdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { pageMetadata } from '../src/data/index'
import { getLocalizedSeo, localizedSitemapEntries, SITE_ORIGIN } from '../src/data/seo'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const output = join(root, 'public', 'sitemap.xml')
const latestContentDate = Object.values(pageMetadata)
  .map((meta) => meta.updatedAt)
  .sort()
  .at(-1) || '2026-01-01'

const xml = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
  ...localizedSitemapEntries.flatMap(({ path, key, locale, changefreq, priority }) => {
    const lastmod = pageMetadata[key]?.updatedAt || latestContentDate
    const seo = getLocalizedSeo(locale, key)
    return [
      '  <url>',
      `    <loc>${SITE_ORIGIN}/${path}</loc>`,
      `    <lastmod>${lastmod}</lastmod>`,
      `    <changefreq>${changefreq}</changefreq>`,
      `    <priority>${priority}</priority>`,
      ...seo.alternates.map((alternate) => `    <xhtml:link rel="alternate" hreflang="${alternate.hreflang}" href="${alternate.href}" />`),
      '  </url>'
    ]
  }),
  '</urlset>',
  ''
].join('\n')

mkdirSync(join(root, 'public'), { recursive: true })
writeFileSync(output, xml, 'utf8')
console.log(`sitemap: generated ${localizedSitemapEntries.length} URLs at ${output}`)
