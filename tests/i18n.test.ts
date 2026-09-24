import { describe, expect, it } from 'vitest'
import {
  buildLocalizedPageHref,
  getLocalePrefix,
  localeRegistry,
  resolveLocaleFromPath,
  resolvePageFromPath,
  stripLocalePrefix,
  uiMessages
} from '../src/i18n'
import { getLocalizedConcerts, getLocalizedHonors, getLocalizedNavItems, getLocalizedPageMeta, getLocalizedProjects, getLocalizedResearch } from '../src/data/locales'
import { pageRegistry } from '../src/data/pageRegistry'
import { buildLocalizedCanonicalUrl, getLocalizedSeo, localizedSitemapEntries } from '../src/data/seo'

function nestedKeys(value: unknown, prefix = ''): string[] {
  if (!value || typeof value !== 'object') return prefix ? [prefix] : []
  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
    nestedKeys(child, prefix ? `${prefix}.${key}` : key)
  )
}

describe('locale path resolution', () => {
  it.each([
    ['/', 'zh-CN'],
    ['/research/', 'zh-CN'],
    ['/zh-hk/', 'zh-HK'],
    ['/zh-hk/research/', 'zh-HK'],
    ['/en/', 'en'],
    ['/en/research/', 'en'],
    ['/en/does-not-exist', 'en']
  ] as const)('resolves %s to %s', (pathname, expected) => {
    expect(resolveLocaleFromPath(pathname)).toBe(expected)
  })

  it('strips only an explicit locale prefix', () => {
    expect(stripLocalePrefix('/')).toBe('/')
    expect(stripLocalePrefix('/research/')).toBe('/research/')
    expect(stripLocalePrefix('/zh-hk/')).toBe('/')
    expect(stripLocalePrefix('/zh-hk/research/')).toBe('/research/')
    expect(stripLocalePrefix('/en/research/')).toBe('/research/')
  })
})

describe('canonical page path resolution', () => {
  it.each([
    ['/', 'home'],
    ['/academics/', 'academics'],
    ['/honors/', 'honors'],
    ['/research/', 'research'],
    ['/works/', 'works'],
    ['/concerts/', 'concerts'],
    ['/zh-hk/research/', 'research'],
    ['/en/concerts/', 'concerts']
  ] as const)('resolves %s to %s', (pathname, expected) => {
    expect(resolvePageFromPath(pathname)).toBe(expected)
  })
})
describe('localized page hrefs', () => {
  it('uses locale home paths without index.html', () => {
    expect(getLocalePrefix('zh-CN')).toBe('')
    expect(getLocalePrefix('zh-HK')).toBe('/zh-hk')
    expect(getLocalePrefix('en')).toBe('/en')
    expect(buildLocalizedPageHref('home', 'zh-CN')).toBe('/')
    expect(buildLocalizedPageHref('home', 'zh-HK')).toBe('/zh-hk/')
    expect(buildLocalizedPageHref('home', 'en')).toBe('/en/')
  })

  it('preserves the current page, search, and stable section hash', () => {
    expect(buildLocalizedPageHref('research', 'en', {
      search: '?from=nav',
      hash: '#sec-toolchain'
    })).toBe('/en/research/?from=nav#sec-toolchain')
    expect(buildLocalizedPageHref('honors', 'zh-HK', { hash: '#sec-honors-archive' }))
      .toBe('/zh-hk/honors/#sec-honors-archive')
  })
})

describe('typed UI dictionaries', () => {
  it('contain the same complete schema for every locale', () => {
    const expected = nestedKeys(uiMessages['zh-CN']).sort()
    expect(nestedKeys(uiMessages['zh-HK']).sort()).toEqual(expected)
    expect(nestedKeys(uiMessages.en).sort()).toEqual(expected)
    expect(Object.keys(localeRegistry)).toEqual(['zh-CN', 'zh-HK', 'en'])
  })
})

describe('stable registry and localized content contracts', () => {
  it('keeps route facts separate from localized navigation and section copy', () => {
    expect(pageRegistry.research).toMatchObject({
      routePath: '/research/',
      sectionIds: ['sec-research-timeline', 'sec-toolchain']
    })
    expect(pageRegistry.works.sectionIds).toEqual([
      'works-overview',
      'project-fresheye',
      'project-ap-microeconomics-notes'
    ])
    expect('nav' in pageRegistry.research).toBe(false)
    expect('sections' in pageRegistry.research).toBe(false)
  })

  it('keeps entity IDs identical in every locale', () => {
    type TestLocale = 'zh-CN' | 'zh-HK' | 'en'
    const ids = (locale: TestLocale) => ({
      research: getLocalizedResearch(locale).map((item) => item.id),
      projects: getLocalizedProjects(locale).map((item) => item.id),
      honors: getLocalizedHonors(locale).map((item) => item.id),
      concerts: getLocalizedConcerts(locale).map((item) => item.id)
    })
    expect(ids('zh-HK')).toEqual(ids('zh-CN'))
    expect(ids('en')).toEqual(ids('zh-CN'))
    const englishDeployment = getLocalizedResearch('en')
      .find((item) => item.id === 'fresheye')
      ?.proof?.find((proof) => proof.type === 'deployment')
    expect(englishDeployment?.href).toBe('/en/works/#project-fresheye')

    const englishProjectLink = getLocalizedProjects('en')
      .flatMap((project) => project.story.chapters)
      .find((chapter) => chapter.href?.includes('fishfreshnet-v2'))
    expect(englishProjectLink?.href).toBe('/en/research/#fishfreshnet-v2')
  })

  it('provides one-language navigation and stable section IDs', () => {
    expect(getLocalizedNavItems('zh-CN').map((item) => item.label)).toEqual(['首页', '学业', '荣誉', '研究', '作品', '演唱会'])
    expect(getLocalizedNavItems('zh-HK').map((item) => item.label)).toEqual(['首頁', '學業', '榮譽', '研究', '作品', '演唱會'])
    expect(getLocalizedNavItems('en').map((item) => item.label)).toEqual(['Home', 'Academics', 'Honors', 'Research', 'Works', 'Concerts'])

    expect(pageRegistry.research.sectionIds).toEqual(['sec-research-timeline', 'sec-toolchain'])
  })

  it('mirrors English archive lyric titles in the UI dictionary', () => {
    for (const page of ['academics', 'honors', 'research', 'works', 'concerts'] as const) {
      expect(uiMessages.en.page[page].title).toBe(getLocalizedPageMeta('en', page).title)
    }
  })

  it('mirrors localized Works page copy in the UI dictionary', () => {
    for (const locale of ['zh-CN', 'zh-HK', 'en'] as const) {
      expect(uiMessages[locale].page.works.copy).toBe(getLocalizedPageMeta(locale, 'works').copy)
    }
  })
})

describe('localized SEO contracts', () => {
  it('emits six pages for each locale without localized index.html URLs', () => {
    expect(localizedSitemapEntries).toHaveLength(18)
    expect(new Set(localizedSitemapEntries.map((entry) => entry.path)).size).toBe(18)
    expect(localizedSitemapEntries.some((entry) => entry.path.includes('.html'))).toBe(false)
    expect(localizedSitemapEntries.map((entry) => entry.path)).toContain('research/')
    expect(localizedSitemapEntries.filter((entry) => entry.path === '' || entry.path === 'zh-hk/' || entry.path === 'en/')).toHaveLength(3)
  })

  it('keeps self-canonical and reciprocal three-locale alternates', () => {
    for (const locale of ['zh-CN', 'zh-HK', 'en'] as const) {
      const seo = getLocalizedSeo(locale, 'research')
      expect(seo.canonical).toBe(buildLocalizedCanonicalUrl(locale, 'research'))
      expect(seo.htmlLang).toBe(locale === 'zh-CN' ? 'zh-CN' : locale === 'zh-HK' ? 'zh-HK' : 'en')
      expect(seo.alternates).toHaveLength(3)
      expect(seo.alternates.map((alternate) => alternate.hreflang)).toEqual(['zh-CN', 'zh-HK', 'en'])
      expect(seo.alternates.map((alternate) => alternate.href)).toContain(seo.canonical)
      expect(seo.ogImage.endsWith('.png')).toBe(true)
    }
  })
})
