export type Status = 'active' | 'complete' | 'planned' | 'archived' | 'published' | 'completed' | 'deployed' | 'opensource'

export interface ProofLink {
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

export interface CaseStudyVisual {
  src: string
  label: string
  alt: string
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
  visual?: {
    src: string
    alt: string
  }
  visuals?: CaseStudyVisual[]
}

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
  icon: string
  tone: string
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
  city: string
  status?: Status
  images: string[]
  land?: boolean
  note?: string
}

export interface Honor {
  year: string
  title: string
  detail: string
  category: string
  level: string
  featured?: boolean
}
