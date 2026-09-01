export type Status =
  | 'active'
  | 'completed'
  | 'published'
  | 'deployed'
  | 'open-source'
  | 'planned'
  | 'archived'

type ProofType = 'paper' | 'source' | 'demo' | 'dataset' | 'experiment' | 'deployment'
export type HonorLevel = 'peak' | 'excellent' | 'emerging'
export type NonEmptyArray<T> = [T, ...T[]]
export type ReadonlyNonEmptyArray<T> = readonly [T, ...T[]]
export type { PageKey } from './pageRegistry'
import type { PageKey } from './pageRegistry'

interface ProofLink {
  type: ProofType
  label: string
  value: string
  href: string
  external?: boolean
}

export interface Metric {
  label: string
  value: string
  note?: string
}

interface Methodology {
  question: string
  hypothesis: string
  method: string
  prototype: string
  result: string
  next: string
}

interface ResearchPaper {
  doi: string
  tag: string
  href: string
}

export interface ResearchItem {
  id: string
  date: string
  title: string
  text: string
  tag: string
  org: string
  status?: Status
  metrics?: Metric[]
  methodology?: Methodology
  paper?: ResearchPaper
  link?: string
  citation?: string
  proof?: ProofLink[]
  updatedAt: string
}

export interface ResearchMethod {
  label: string
  en: string
  cat: string
}

export interface ResearchMethodGroup {
  id: string
  label: string
  en: string
  description: string
  items: ResearchMethod[]
}

type ProjectTone = 'aqua' | 'gold' | 'violet'
type ProjectAction = 'live' | 'repository'

interface ProjectStoryChapter {
  label: string
  title: string
  detail: string
  href?: string
}

interface ProjectStory {
  label: string
  note: string
  chapters: ProjectStoryChapter[]
  sequenceLabel: string
  sequence: string[]
  proof: ProofLink[]
}

export interface Project {
  id: string
  action: ProjectAction
  title: string
  en: string
  domain: string
  role: string
  stack: string[]
  value: string
  description: string
  href: string
  github?: string
  discipline: string
  tone: ProjectTone
  status: Status
  updatedAt: string
  story: ProjectStory
}

export interface Concert {
  id: string
  date: string
  artist: string
  tour: string
  venue: string
  images: NonEmptyArray<string>
  land?: boolean
  note?: string
}

export interface Album {
  id: string
  artist: string
  title: string
  year: number
  format: 'album' | 'ep'
  cover: string
  appleMusicUrl: string
  palette: readonly [string, string]
}

export interface Honor {
  id: string
  date: string
  title: string
  org: string
  level: HonorLevel
}

export type AcademicStat = Metric

export interface Education {
  period: string
  name: string
  en: string
}

interface ApScoreBase {
  name: string
  en: string
  year: string
}

export type ApScore =
  | (ApScoreBase & { score: number; status: 'done' })
  | (ApScoreBase & { score: null; status: 'pending' })

export interface Leadership {
  role: string
  org: string
  period: string
  note: string
}

export interface Activity {
  id: string
  title: string
  period: string
  org: string
  detail: string
  featured: boolean
}

export interface SiteNavItem {
  key: PageKey
  label: string
  href: string
  desc: string
}

export interface HeroCredit {
  artist: string
  song: string
  album: string
}

export interface LightboxMeta {
  artist: string
  tour: string
}

export interface LightboxPayload {
  images: NonEmptyArray<string>
  index: number
  meta?: LightboxMeta | null
}

export interface PageMeta {
  kicker: string
  title: string
  copy: string
  credit?: HeroCredit
}

export interface World {
  key: PageKey
  no: string
  label: string
  icon: string
  href: string
  desc: string
  accent: 'aqua' | 'violet' | 'gold'
}

export interface PageMetadata {
  updatedAt: string
}
