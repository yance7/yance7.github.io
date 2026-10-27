import type { PageKey } from '../data/pageRegistry.ts'

export type Locale = 'zh-CN' | 'zh-HK' | 'en'

interface HomeHeroSlideshowMessages {
  groupLabel: string
  roleDescription: string
  play: string
  pause: string
  static: string
  showPhoto: (current: number, total: number, name: string) => string
  photos: Record<1 | 2 | 3 | 4 | 5 | 6 | 7, string>
  status: {
    photoShown: (current: number, total: number, name: string) => string
    photoSelected: (current: number, total: number, name: string) => string
    loadFailed: (name: string) => string
  }
}

export interface LocaleDefinition {
  code: Locale
  htmlLang: string
  pathPrefix: '' | '/zh-hk' | '/en'
  shortLabel: string
  nativeName: string
  ogLocale: string
}

export interface UiMessages {
  navigation: {
    main: string
    mobile: string
    home: string
    openMenu: string
    closeMenu: string
  }
  theme: {
    light: string
    dark: string
    switchToLight: string
    switchToDark: string
  }
  locale: {
    selector: string
    zhCN: string
    zhHK: string
    en: string
    switchToZhCN: string
    switchToZhHK: string
    switchToEnglish: string
  }
  accessibility: {
    skipToMain: string
    readingProgress: string
    home: string
    footerHome: string
    liveProduct: string
    projectStory: string
  }
  common: {
    online: string
    current: string
    previous: string
    next: string
    readPaper: string
    openProject: string
    proof: string
    source: string
    deployedAs: string
    liveProduct: string
    project: string
    projectNote: string
    chapters: string
    proofLinks: string
    role: string
    stack: string
    single: string
    copyCitation: string
    copyInProgress: string
    copied: string
    copyFailed: string
  }
  actions: {
    selectedWork: string
    exploreWorlds: string
    scrollToExplore: string
    readResearch: string
    viewCaseStudy: string
    exploreAcademics: string
    viewHonors: string
    enterProject: string
    viewOnGitHub: string
    sourceCode: string
    openResearch: string
  }
  home: {
    identity: string
    researchLabel: string
    selectedWorkLabel: string
    productLabel: string
    researchToProduct: string
    exploreLabel: string
    worldsDescription: string
    beyondLabel: string
    leadership: string
    selectedActivities: string
  }
  research: {
    expandMethodology: string
    collapseMethodology: string
    question: string
    hypothesis: string
    method: string
    prototype: string
    result: string
    next: string
    workbench: string
    toolsInRotation: string
    researchLoopActive: string
    questionToEvidenceToProduct: string
    toolsCount: string
    methodsLabel: string
  }
  honors: {
    filterLabel: string
    all: string
    peak: string
    excellent: string
    emerging: string
    honorsUnit: string
  }
  lightbox: {
    gallery: string
    close: string
    previous: string
    next: string
    position: (current: number, total: number) => string
    loading: string
    failed: string
    retry: string
    posterAlt: string
    openArchive: string
  }
  footer: {
    homeLabel: string
    contactsLabel: string
    archive: string
    identity: string
    email: string
    github: string
  }
  error404: {
    kicker: string
    title: string
    copy: string
    home: string
    research: string
  }
  loadError: {
    loading: string
    title: string
    copy: string
    retry: string
  }
  poster: { loading: string; failed: string; retry: string; original: string }
  empty: { honors: string; viewAll: string; works: string; concerts: string; selectedWork: string }
  status: Record<string, string>
  page: Record<PageKey, {
    kicker: string
    title: string
    copy: string
  }> & {
    home: {
      kicker: string
      title: string
      copy: string
      slideshow: HomeHeroSlideshowMessages
    }
  }
}
