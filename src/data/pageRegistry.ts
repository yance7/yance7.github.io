const registry = {
  home: {
    htmlName: 'index',
    routePath: '/',
    legacyPath: '/index.html',
    sitemapPath: '',
    changefreq: 'weekly',
    priority: '1.0',
    ogImage: 'assets/og-home.png',
    sectionIds: ['selected-work', 'home-worlds', 'home-beyond']
  },
  academics: {
    htmlName: 'academics',
    routePath: '/academics/',
    legacyPath: '/academics.html',
    sitemapPath: 'academics/',
    changefreq: 'monthly',
    priority: '0.8',
    ogImage: 'assets/og-academics.png',
    sectionIds: ['sec-education', 'sec-scoreboard', 'sec-ap-archive']
  },
  honors: {
    htmlName: 'honors',
    routePath: '/honors/',
    legacyPath: '/honors.html',
    sitemapPath: 'honors/',
    changefreq: 'monthly',
    priority: '0.8',
    ogImage: 'assets/og-honors.png',
    sectionIds: ['sec-milestones', 'sec-honors-archive']
  },
  research: {
    htmlName: 'research',
    routePath: '/research/',
    legacyPath: '/research.html',
    sitemapPath: 'research/',
    changefreq: 'monthly',
    priority: '0.9',
    ogImage: 'assets/og-research.png',
    sectionIds: ['sec-research-timeline', 'sec-toolchain']
  },
  works: {
    htmlName: 'works',
    routePath: '/works/',
    legacyPath: '/works.html',
    sitemapPath: 'works/',
    changefreq: 'monthly',
    priority: '0.9',
    ogImage: 'assets/og-works.png',
    sectionIds: ['works-overview', 'project-fresheye', 'project-ap-microeconomics-notes']
  },
  concerts: {
    htmlName: 'concerts',
    routePath: '/concerts/',
    legacyPath: '/concerts.html',
    sitemapPath: 'concerts/',
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
    routePath: null,
    legacyPath: '/404.html',
    sitemapPath: null,
    changefreq: null,
    priority: null,
    sectionIds: [] as const
  }
]

export function isPageKey(value: string | undefined): value is PageKey {
  return value !== undefined && Object.prototype.hasOwnProperty.call(pageRegistry, value)
}