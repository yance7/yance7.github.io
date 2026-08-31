import type { PageKey, PageMeta, SiteNavItem, Status, World, AcademicStat, ApScore, Education, Activity, Leadership, Honor, Concert, Album, ResearchItem, Project } from '../types'
import type { HonorLevel } from '../types'

type LocalizedNav = Omit<SiteNavItem, 'href' | 'key'>
type LocalizedWorld = Omit<World, 'href' | 'key'>

interface HomeCopy {
  heroTitle: string
  heroAccent: string
  selectedTitle: string
  selectedAccent: string
  selectedCopy: string
  worldsTitle: string
  worldsAccent: string
  worldsCopy: string
  beyondTitle: string
  beyondAccent: string
  beyondCopy: string
}

export interface SiteLocaleCopy {
  pageMeta: Record<PageKey, PageMeta>
  nav: Record<PageKey, LocalizedNav>
  worlds: Record<Exclude<PageKey, 'home'>, LocalizedWorld>
  home: HomeCopy
}

export interface AcademicsLocaleCopy {
  stats: AcademicStat[]
  education: Education[]
  apScores: ApScore[]
  sections: {
    education: { label: string; title: string; accent: string; copy: string }
    scoreboard: { label: string; title: string; accent: string; copy: string }
    apArchive: { label: string; title: string; accent: string; copy: string; panelLabel: string }
  }
}

export interface HonorsLocaleCopy {
  categories: Array<{ key: 'all' | HonorLevel; label: string }>
  levelLabels: Record<HonorLevel, string>
  statLabels: Record<'all' | HonorLevel, { label: string; note: string }>
  entities: Record<string, Pick<Honor, 'title' | 'org'>>
  sections: {
    milestones: { label: string; title: string; accent: string; copy: string }
    archive: { label: string; titleSuffix: string; accent: string; copy: string }
  }
}

export type ResearchCopy = Pick<ResearchItem, 'title' | 'text' | 'tag' | 'org' | 'metrics' | 'methodology' | 'proof'>

export interface ResearchLocaleCopy {
  entities: Record<string, ResearchCopy>
  methods: Array<{ label: string; en: string; cat: string }>
  groups: Array<{ id: string; label: string; en: string; description: string; items: Array<{ label: string; en: string; cat: string }> }>
  sections: {
    timeline: { label: string; title: string; accent: string; copy: string }
    toolchain: { label: string; title: string; accent: string; copy: string; workbench: string; workbenchTitle: string; workbenchCopy: string; flowLabel: string; flow: [string, string, string]; footer: [string, string] }
  }
}

export type ProjectCopy = Pick<Project, 'title' | 'value' | 'description' | 'role' | 'discipline' | 'story'>

export interface ProjectLocaleCopy {
  entities: Record<string, ProjectCopy>
  section: { label: string; title: string; accent: string; copySingular: string; copyPlural: string }
}

export interface ConcertLocaleCopy {
  entities: Record<string, Pick<Concert, 'artist' | 'tour' | 'venue' | 'note'>>
  moods: Record<string, string>
  currentYearMood: (attended: number, upcoming: number) => string
  section: { label: string; title: string; accent: string; copy: string; nextUp: string; realTime: string; archive: string; posterArchive: string; attended: string; upcoming: string; venues: string; artists: string; posters: string; total: string; recorded: string; showUnit: string }
}

export interface AlbumLocaleCopy {
  entities: Record<string, Partial<Pick<Album, 'artist' | 'title'>>>
  section: { label: string; title: string; accent: string; copy: string }
}

export interface CommunityLocaleCopy {
  leadership: Leadership[]
  activities: Activity[]
}

export interface LocaleContent {
  site: SiteLocaleCopy
  academics: AcademicsLocaleCopy
  honors: HonorsLocaleCopy
  research: ResearchLocaleCopy
  projects: ProjectLocaleCopy
  concerts: ConcertLocaleCopy
  albums: AlbumLocaleCopy
  community: CommunityLocaleCopy
  status: Record<Status, string>
}
