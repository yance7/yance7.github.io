export type Status =
  | 'active'
  | 'completed'
  | 'published'
  | 'deployed'
  | 'open-source'
  | 'planned'
  | 'archived'

export type ProofType = 'paper' | 'source' | 'demo' | 'dataset' | 'experiment' | 'deployment'
export type HonorLevel = 'peak' | 'excellent' | 'emerging'

export interface ProofLink {
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

export interface Methodology {
  question: string
  hypothesis: string
  method: string
  prototype: string
  result: string
  next: string
}

export interface ResearchPaper {
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

export interface FeaturedResearch {
  id: string
  title: string
  text: string
  summaryMetrics: [Metric, Metric]
}

export interface ResearchMethod {
  label: string
  en: string
  cat: string
}

export interface CaseStudyVisual {
  src: string
  label: string
  alt: string
}

export interface PreviewSignal {
  label: string
  value: string
}

export interface ProductPreview {
  eyebrow: string
  status: string
  input: {
    navigation: string[]
    toolbar: string
    format: string
    title: string
    hint: string
    resolution: string
    action: string
  }
  result: {
    navigation: string[]
    toolbar: string
    status: string
    label: string
    className: string
    confidenceLabel: string
    confidence: string
    dataset: string
  }
  explain: {
    navigation: string[]
    toolbar: string
    model: string
    evidenceLabel: string
    method: string
    label: string
    description: string
    signals: PreviewSignal[]
  }
}

export interface ProjectCaseStudy {
  problem: string
  research: {
    title: string
    detail: string
    href: string
  }
  product: string[]
  engineering: string[]
  proof: ProofLink[]
  evidenceLabel?: string
  visual?: {
    src: string
    alt: string
  }
  liveVisual?: {
    src: string
    alt: string
    label: string
  }
  visuals?: CaseStudyVisual[]
  preview?: ProductPreview
}

export type ProjectTone = 'aqua' | 'gold' | 'violet'
export type ProjectIcon = 'eye' | 'note'

export interface Project {
  id: string
  title: string
  en: string
  domain: string
  role: string
  stack: string[]
  value: string
  description: string
  href: string
  github?: string
  icon: ProjectIcon
  tone: ProjectTone
  status?: Status
  statusLabel?: string
  updatedAt: string
  previewImages?: string[]
  caseStudy?: ProjectCaseStudy
}

export interface Concert {
  id: string
  date: string
  artist: string
  tour: string
  venue: string
  images: string[]
  land?: boolean
  note?: string
}

export interface Honor {
  id: string
  date: string
  title: string
  detail: string
  org: string
  level: HonorLevel
}

export type AcademicStat = Metric

export interface Education {
  period: string
  name: string
  en: string
}

export interface ApScore {
  name: string
  en: string
  year: string
  score: number | null
  status: 'done' | 'pending'
}

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
  en: string
  href: string
  desc: string
}

export interface HeroCredit {
  artist: string
  song: string
  album: string
}

export interface PageMeta {
  kicker: string
  title: string
  copy: string
  credit?: HeroCredit
}

export type PageKey = 'home' | 'academics' | 'honors' | 'research' | 'works' | 'concerts'

export interface World {
  key: PageKey
  no: string
  label: string
  en: string
  icon: string
  href: string
  desc: string
  accent: 'aqua' | 'violet' | 'gold'
}

export interface PageMetadata {
  updatedAt: string
  updatedLabel: string
}
