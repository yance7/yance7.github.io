import { honors } from './honors.js'
import { research } from './research.js'
import { projects } from './projects.js'

export * from './site.js'
export * from './academics.js'
export * from './honors.js'
export * from './research.js'
export * from './community.js'
export * from './projects.js'
export * from './concerts.js'

const monthLabels = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']

function formatUpdatedLabel(date) {
  const [year, month, day] = date.split('-')
  return `${monthLabels[Number(month) - 1]} ${day}, ${year}`
}

function latestUpdatedAt(items, fallback) {
  return items.reduce((latest, item) => item.updatedAt > latest ? item.updatedAt : latest, fallback)
}

const researchUpdatedAt = latestUpdatedAt(research, '2026-01-01')
const worksUpdatedAt = latestUpdatedAt(projects, '2026-01-01')

export const pageMetadata = {
  honors: { updatedAt: '2026-08-08', updatedLabel: formatUpdatedLabel('2026-08-08') },
  research: { updatedAt: researchUpdatedAt, updatedLabel: formatUpdatedLabel(researchUpdatedAt) },
  works: { updatedAt: worksUpdatedAt, updatedLabel: formatUpdatedLabel(worksUpdatedAt) },
  concerts: { updatedAt: '2026-08-08', updatedLabel: formatUpdatedLabel('2026-08-08') }
}
