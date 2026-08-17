const registry = {
  home: {
    htmlName: 'index',
    href: 'index.html',
    sitemapPath: '',
    changefreq: 'weekly',
    priority: '1.0',
    nav: { label: '首页', en: 'Home', desc: '个人档案入口' },
    ogImage: 'assets/og-home.png',
    ogImageAlt: 'Yance · Research and product archive',
    sections: [
      { id: 'selected-work', label: 'SELECTED WORK', shortLabel: 'WORK' },
      { id: 'home-worlds', label: 'FIVE WORLDS', shortLabel: 'WORLDS' },
      { id: 'home-beyond', label: 'BEYOND THE LAB', shortLabel: 'BEYOND' }
    ]
  },
  academics: {
    htmlName: 'academics',
    href: 'academics.html',
    sitemapPath: 'academics.html',
    changefreq: 'monthly',
    priority: '0.8',
    nav: { label: '学业', en: 'Academics', desc: '绩点、标化与 AP 成绩' },
    ogImage: 'assets/og-academics.png',
    ogImageAlt: 'Yance academic archive',
    sections: [
      { id: 'sec-education', label: 'EDUCATION' },
      { id: 'sec-scoreboard', label: 'SCOREBOARD' },
      { id: 'sec-ap-archive', label: 'AP ARCHIVE' }
    ]
  },
  honors: {
    htmlName: 'honors',
    href: 'honors.html',
    sitemapPath: 'honors.html',
    changefreq: 'monthly',
    priority: '0.8',
    nav: { label: '荣誉', en: 'Honors', desc: '奖项与竞赛记录' },
    ogImage: 'assets/og-honors.png',
    ogImageAlt: 'Yance honors and competition archive',
    sections: [
      { id: 'sec-milestones', label: 'MILESTONES' },
      { id: 'sec-honors-archive', label: 'ARCHIVE' }
    ]
  },
  research: {
    htmlName: 'research',
    href: 'research.html',
    sitemapPath: 'research.html',
    changefreq: 'monthly',
    priority: '0.9',
    nav: { label: '研究', en: 'Research', desc: '从论文到产品' },
    ogImage: 'assets/og-research.png',
    ogImageAlt: 'Yance research archive',
    sections: [
      { id: 'sec-research-timeline', label: 'RESEARCH' },
      { id: 'sec-toolchain', label: 'METHODS' }
    ]
  },
  works: {
    htmlName: 'works',
    href: 'works.html',
    sitemapPath: 'works.html',
    changefreq: 'monthly',
    priority: '0.9',
    nav: { label: '作品', en: 'Works', desc: '已上线的项目' },
    ogImage: 'assets/og-works.png',
    ogImageAlt: 'FreshEye product portfolio',
    sections: [
      { id: 'works-overview', label: 'RELEASED WORLDS', shortLabel: 'OVERVIEW' },
      { id: 'project-fresheye', label: 'FRESHEYE' }
    ]
  },
  concerts: {
    htmlName: 'concerts',
    href: 'concerts.html',
    sitemapPath: 'concerts.html',
    changefreq: 'monthly',
    priority: '0.7',
    nav: { label: '演唱会', en: 'Concerts', desc: '现场记忆档案' },
    ogImage: 'assets/og-concerts.png',
    ogImageAlt: 'Yance live music archive',
    sections: [
      { id: 'concerts-overview', label: 'LIVE ARCHIVE', shortLabel: 'OVERVIEW' },
      { id: 'album-frequencies', label: 'ALBUM WALL', shortLabel: 'ALBUMS' },
      { id: 'concert-archive', label: 'CONCERT ARCHIVE', shortLabel: 'POSTERS' }
    ]
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
    sections: [] as const
  }
]

export const sitemapEntries = pageEntries.map(({ key, sitemapPath, changefreq, priority }) => ({
  key,
  path: sitemapPath,
  changefreq,
  priority
}))

export function isPageKey(value: string | undefined): value is PageKey {
  return value !== undefined && Object.prototype.hasOwnProperty.call(pageRegistry, value)
}
