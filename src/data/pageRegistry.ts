const registry = {
  home: {
    htmlName: 'index',
    href: 'index.html',
    sitemapPath: '',
    changefreq: 'weekly',
    priority: '1.0',
    ogImage: 'assets/og-home.png',
    sectionIds: ['selected-work', 'home-worlds', 'home-beyond']
  },
  academics: {
    htmlName: 'academics',
    href: 'academics.html',
    sitemapPath: 'academics.html',
    changefreq: 'monthly',
    priority: '0.8',
    ogImage: 'assets/og-academics.png',
    sectionIds: ['sec-education', 'sec-scoreboard', 'sec-ap-archive']
  },
  honors: {
    htmlName: 'honors',
    href: 'honors.html',
    sitemapPath: 'honors.html',
    changefreq: 'monthly',
    priority: '0.8',
    ogImage: 'assets/og-honors.png',
    sectionIds: ['sec-milestones', 'sec-honors-archive']
  },
  research: {
    htmlName: 'research',
    href: 'research.html',
    sitemapPath: 'research.html',
    changefreq: 'monthly',
    priority: '0.9',
    ogImage: 'assets/og-research.png',
    sectionIds: ['sec-research-timeline', 'sec-toolchain']
  },
  works: {
    htmlName: 'works',
    href: 'works.html',
    sitemapPath: 'works.html',
    changefreq: 'monthly',
    priority: '0.9',
    ogImage: 'assets/og-works.png',
    sectionIds: ['works-overview', 'project-fresheye', 'project-ap-microeconomics-notes']
  },
  concerts: {
    htmlName: 'concerts',
    href: 'concerts.html',
    sitemapPath: 'concerts.html',
    changefreq: 'monthly',
    priority: '0.7',
    ogImage: 'assets/og-concerts.png',
    sectionIds: ['concerts-overview', 'concert-archive', 'album-frequencies']
  }
} as const

export const pageRegistry = registry
export type PageKey = keyof typeof pageRegistry
type PageRegistryEntry = (typeof pageRegistry)[PageKey]
export type PageEntry = { key: PageKey } & PageRegistryEntry

export const pageEntries = (Object.keys(pageRegistry) as PageKey[]).map((key) => ({
  key,
  ...pageRegistry[key]
})) satisfies PageEntry[]

export const htmlPageEntries = [
  ...pageEntries,
  {
    key: 'not-found' as const,
    htmlName: '404',
    href: '404.html',
    sitemapPath: null,
    changefreq: null,
    priority: null,
    sectionIds: [] as const
  }
]

export function isPageKey(value: string | undefined): value is PageKey {
  return value !== undefined && Object.prototype.hasOwnProperty.call(pageRegistry, value)
}
