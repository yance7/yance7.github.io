import { describe, expect, it } from 'vitest'
import { pageMetadata, derivePageMetadata } from '../src/data/pageMetadata'
import type { LocalizedPageContentDates, PageContentDates } from '../src/data/pageMetadata'
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

const localizedContentDates = {
  'zh-CN': { academics: '2026-10-23', honors: '2026-10-23', concerts: '2026-09-22' },
  'zh-HK': { academics: '2026-10-23', honors: '2026-10-23', concerts: '2026-09-22' },
  en: { academics: '2026-10-23', honors: '2026-10-23', concerts: '2026-09-22' }
} satisfies LocalizedPageContentDates

const homeSummaryDates = ['2026-10-22', '2026-10-22']

function urlBlocks(xml: string) {
  return [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((match) => match[1] ?? '')
}

describe('page content dates', () => {
  it('combines shared content dates with page-specific locale dates', () => {
    for (const locale of ['zh-CN', 'zh-HK', 'en'] as const) {
      expect(pageMetadata[locale]).toEqual({
        home: { updatedAt: '2026-10-31' },
        academics: { updatedAt: '2026-10-23' },
        honors: { updatedAt: '2026-10-23' },
        research: { updatedAt: '2026-10-30' },
        works: { updatedAt: '2026-10-30' },
        concerts: { updatedAt: '2026-09-22' }
      })
    }
  })

  it('keeps updates scoped to the page and its actual home dependencies', () => {
    const original = derivePageMetadata(contentDates, localizedContentDates, homeSummaryDates)
    const concertChanged = derivePageMetadata(
      { ...contentDates, concerts: '2026-10-31' },
      localizedContentDates,
      homeSummaryDates
    )
    const unfeaturedResearchChanged = derivePageMetadata(
      { ...contentDates, research: '2026-10-31' },
      localizedContentDates,
      homeSummaryDates
    )
    const unfeaturedProjectChanged = derivePageMetadata(
      { ...contentDates, works: '2026-10-31' },
      localizedContentDates,
      homeSummaryDates
    )
    const featuredResearchChanged = derivePageMetadata(
      { ...contentDates, research: '2026-10-31' },
      localizedContentDates,
      ['2026-10-31', ...homeSummaryDates]
    )
    const featuredProjectChanged = derivePageMetadata(
      { ...contentDates, works: '2026-10-31' },
      localizedContentDates,
      ['2026-10-22', '2026-10-31']
    )

    for (const locale of ['zh-CN', 'zh-HK', 'en'] as const) {
      expect(concertChanged[locale].concerts.updatedAt).toBe('2026-10-31')
      expect(concertChanged[locale].home.updatedAt).toBe(original[locale].home.updatedAt)
      expect(unfeaturedResearchChanged[locale].research.updatedAt).toBe('2026-10-31')
      expect(unfeaturedResearchChanged[locale].home.updatedAt).toBe(original[locale].home.updatedAt)
      expect(unfeaturedProjectChanged[locale].works.updatedAt).toBe('2026-10-31')
      expect(unfeaturedProjectChanged[locale].home.updatedAt).toBe(original[locale].home.updatedAt)
      expect(featuredResearchChanged[locale].research.updatedAt).toBe('2026-10-31')
      expect(featuredResearchChanged[locale].home.updatedAt).toBe('2026-10-31')
      expect(featuredProjectChanged[locale].works.updatedAt).toBe('2026-10-31')
      expect(featuredProjectChanged[locale].home.updatedAt).toBe('2026-10-31')
    }
  })

  it('does not let one locale update change another locale sitemap date', () => {
    const changed = derivePageMetadata(contentDates, {
      ...localizedContentDates,
      en: { ...localizedContentDates.en, academics: '2026-10-31' }
    }, homeSummaryDates)

    expect(changed.en.academics.updatedAt).toBe('2026-10-31')
    expect(changed['zh-CN'].academics.updatedAt).toBe('2026-10-23')
    expect(changed['zh-HK'].academics.updatedAt).toBe('2026-10-23')
  })
})

describe('sitemap serialization', () => {
  it('is stable and emits exactly the 18 canonical locale/page URLs with four alternates', () => {
    const metadata = derivePageMetadata(contentDates, {
      ...localizedContentDates,
      en: { ...localizedContentDates.en, academics: '2026-10-31' }
    }, homeSummaryDates)
    const first = serializeSitemap(localizedSitemapEntries, metadata)
    const second = serializeSitemap(localizedSitemapEntries, metadata)
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
      expect(block).toContain(`<lastmod>${metadata[entry.locale][entry.key].updatedAt}</lastmod>`)

      const alternates = [...(block?.matchAll(/<xhtml:link rel="alternate" hreflang="([^"]+)" href="([^"]+)"\s*\/>/g) ?? [])]
        .map((match) => ({ hreflang: match[1], href: match[2] }))
      expect(alternates).toEqual(seo.alternates)
      expect(alternates.find((alternate) => alternate.hreflang === 'x-default')?.href)
        .toBe(getLocalizedSeo('zh-CN', entry.key).canonical)
      expect(block?.includes(`${SITE_ORIGIN}/404`)).toBe(false)
    }

    expect(blocks.find((block) => block.includes('<loc>https://yance.me/en/academics/</loc>')))
      .toContain('<lastmod>2026-10-31</lastmod>')
    expect(blocks.find((block) => block.includes('<loc>https://yance.me/academics/</loc>')))
      .toContain('<lastmod>2026-10-23</lastmod>')
  })
})
