import { concertsUpdatedAt } from './concerts'
import { honorsUpdatedAt } from './honors'
import { projects } from './projects'
import { research } from './research'
import type { PageMetadata } from './types'

export * from './site'
export * from './academics'
export * from './honors'
export * from './research'
export * from './community'
export * from './projects'
export * from './concerts'

const monthLabels = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']

export function formatUpdatedLabel(date: string) {
  const [year, month, day] = date.split('-')
  return `${monthLabels[Number(month) - 1]} ${day}, ${year}`
}

function latestUpdatedAt(items: Array<{ updatedAt: string }>, fallback: string) {
  return items.reduce((latest, item) => item.updatedAt > latest ? item.updatedAt : latest, fallback)
}

const researchUpdatedAt = latestUpdatedAt(research, '2026-01-01')
const worksUpdatedAt = latestUpdatedAt(projects, '2026-01-01')
const contentUpdatedAt = {
  honors: honorsUpdatedAt,
  research: researchUpdatedAt,
  works: worksUpdatedAt,
  concerts: concertsUpdatedAt
}

export const pageMetadata = {
  honors: { updatedAt: contentUpdatedAt.honors, updatedLabel: formatUpdatedLabel(contentUpdatedAt.honors) },
  research: { updatedAt: contentUpdatedAt.research, updatedLabel: formatUpdatedLabel(contentUpdatedAt.research) },
  works: { updatedAt: contentUpdatedAt.works, updatedLabel: formatUpdatedLabel(contentUpdatedAt.works) },
  concerts: { updatedAt: contentUpdatedAt.concerts, updatedLabel: formatUpdatedLabel(contentUpdatedAt.concerts) }
} satisfies Record<'honors' | 'research' | 'works' | 'concerts', PageMetadata>

export { concertsUpdatedAt, honorsUpdatedAt }
