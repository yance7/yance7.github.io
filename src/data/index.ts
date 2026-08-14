import { concertsUpdatedAt } from './concerts'
import { academicsUpdatedAt } from './academics'
import { honorsUpdatedAt } from './honors'
import { projects } from './projects'
import { research } from './research'
import type { PageKey, PageMetadata } from './types'

export * from './site'
export * from './academics'
export * from './honors'
export * from './research'
export * from './community'
export * from './projects'
export * from './concerts'
export * from './albums'
export * from './pageRegistry'

function latestUpdatedAt(items: Array<{ updatedAt: string }>, fallback: string) {
  return items.reduce((latest, item) => item.updatedAt > latest ? item.updatedAt : latest, fallback)
}

const researchUpdatedAt = latestUpdatedAt(research, '2026-01-01')
const worksUpdatedAt = latestUpdatedAt(projects, '2026-01-01')
const contentUpdatedAt = {
  academics: academicsUpdatedAt,
  honors: honorsUpdatedAt,
  research: researchUpdatedAt,
  works: worksUpdatedAt,
  concerts: concertsUpdatedAt
}
const homeUpdatedAt = latestUpdatedAt(
  Object.values(contentUpdatedAt).map((updatedAt) => ({ updatedAt })),
  '2026-01-01'
)

export const pageMetadata = {
  home: { updatedAt: homeUpdatedAt },
  academics: { updatedAt: contentUpdatedAt.academics },
  honors: { updatedAt: contentUpdatedAt.honors },
  research: { updatedAt: contentUpdatedAt.research },
  works: { updatedAt: contentUpdatedAt.works },
  concerts: { updatedAt: contentUpdatedAt.concerts }
} satisfies Record<PageKey, PageMetadata>
