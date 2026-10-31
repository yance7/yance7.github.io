import { describe, expect, it } from 'vitest'
import { pageMetadata, derivePageMetadata } from '../src/data/pageMetadata'
import type { PageContentDates } from '../src/data/pageMetadata'
import { serializeSitemap } from '../src/data/sitemap'
import { getLocalizedSeo, localizedSitemapEntries, SITE_ORIGIN } from '../src/data/seo'

const contentDates = {
  home: '2026-08-01',
  academics: '2026-10-22',
  honors: '2026-10-22',
  research: '2026-10-30',
  works: '2026-10-30',
  concerts: '2026-09-21'
} satisfies PageContentDates

function urlBlocks(xml: string) {
  return [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((match) => match[1] ?? '')
}

describe('page content dates', () => {
  it('preserves source dates and derives home from its substantive page summaries', () => {
    expect(pageMetadata).toEqual({
      home: { updatedAt: '2026-10-31' },
      academics: { updatedAt: '2026-10-22' },
      honors: { updatedAt: '2026-10-22' },
      research: { updatedAt: '2026-10-30' },
      works: { updatedAt: '2026-10-30' },
      concerts: { updatedAt: '2026-09-21' }
    })
  })

  it('changes only the page with a newer source date and its dependent home summary', () => {
    const original = derivePageMetadata(contentDates)
    const changed = derivePageMetadata({ ...contentDates, concerts: '2026-10-31' })
    const changedPages = Object.keys(original).filter((page) => (
      original[page as keyof typeof original].updatedAt !== changed[page as keyof typeof changed].updatedAt
    ))

    expect(changedPages).toEqual(['home', 'concerts'])
    expect(changed.home.updatedAt).toBe('2026-10-31')
    expect(changed.concerts.updatedAt).toBe('2026-10-31')
    expect(changed.works.updatedAt).toBe(original.works.updatedAt)
  })
})

describe('sitemap serialization', () => {
  it('is stable and emits exactly the 18 canonical locale/page URLs with four alternates', () => {
    const first = serializeSitemap(localizedSitemapEntries, pageMetadata)
    const second = serializeSitemap(localizedSitemapEntries, pageMetadata)
    const blocks = urlBlocks(first)

    expect(first).toBe(second)
    expect(blocks).toHaveLength(18)
    expect((first.match(/<xhtml:link/g) ?? [])).toHaveLength(72)
    expect(first).not.toContain('/404')
    expect(first).not.toContain('.html')
    expect(first).not.toContain('/dist/')

    for (const entry of localizedSitemapEntries) {
      const seo = getLocalizedSeo(entry.locale, entry.key)
      const block = blocks.find((candidate) => candidate.includes(`<loc>${seo.canonical}</loc>`))
      expect(block).toBeDefined()
      expect(block).toContain(`<lastmod>${pageMetadata[entry.key].updatedAt}</lastmod>`)

      const alternates = [...(block?.matchAll(/<xhtml:link rel="alternate" hreflang="([^"]+)" href="([^"]+)"\s*\/>/g) ?? [])]
        .map((match) => ({ hreflang: match[1], href: match[2] }))
      expect(alternates).toEqual(seo.alternates)
      expect(alternates.find((alternate) => alternate.hreflang === 'x-default')?.href)
        .toBe(getLocalizedSeo('zh-CN', entry.key).canonical)
      expect(block?.includes(`${SITE_ORIGIN}/404`)).toBe(false)
    }
  })
})
