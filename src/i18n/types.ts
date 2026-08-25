import type { PageKey } from '../data/pageRegistry'

export type Locale = 'zh-CN' | 'zh-HK' | 'en'

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
  compass: {
    label: string
    open: string
    close: string
    progress: string
    returnTop: string
    current: string
    previous: string
    next: string
    goToSection: string
    read: string
  }
  accessibility: {
    skipToMain: string
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
    sourceCode: string
    openResearch: string
  }
  home: {
    identity: string
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
    loading: string
    failed: string
    retry: string
    posterAlt: string
    openArchive: string
  }
  albums: {
    collection: string
    navigation: string
    previous: string
    next: string
    select: string
    selected: string
    nowSpinning: string
    album: string
    ep: string
  }
  footer: {
    profile: string
    researchRepos: string
    contact: string
  }
  error404: {
    kicker: string
    title: string
    copy: string
    home: string
    research: string
  }
  status: Record<string, string>
  page: Record<PageKey, {
    kicker: string
    title: string
    copy: string
  }>
}
