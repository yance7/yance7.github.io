import { pageMetadata } from './pageMetadata.ts'
import { getLocalizedSeo, localizedSitemapEntries, SITE_ORIGIN } from './seo.ts'
import type { LocalizedSitemapEntry } from './seo.ts'
import type { PageKey, PageMetadata } from './types.ts'

export function serializeSitemap(
  entries: readonly LocalizedSitemapEntry[] = localizedSitemapEntries,
  metadata: Record<PageKey, PageMetadata> = pageMetadata
) {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ...entries.flatMap(({ path, key, locale, changefreq, priority }) => {
      const seo = getLocalizedSeo(locale, key)
      return [
        '  <url>',
        `    <loc>${SITE_ORIGIN}/${path}</loc>`,
        `    <lastmod>${metadata[key].updatedAt}</lastmod>`,
        `    <changefreq>${changefreq}</changefreq>`,
        `    <priority>${priority}</priority>`,
        ...seo.alternates.map((alternate) => `    <xhtml:link rel="alternate" hreflang="${alternate.hreflang}" href="${alternate.href}" />`),
        '  </url>'
      ]
    }),
    '</urlset>',
    ''
  ].join('\n')
}
