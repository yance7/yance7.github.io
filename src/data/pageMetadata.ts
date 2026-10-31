import { academicsUpdatedAt } from './academics.ts'
import { concertsUpdatedAt } from './concerts.ts'
import { honorsUpdatedAt } from './honors.ts'
import { homeHeroContentUpdatedAt } from './homeHeroSlides.ts'
import { projects } from './projects.ts'
import { research } from './research.ts'
import type { PageKey, PageMetadata } from './types.ts'

export type PageContentDates = Record<PageKey, string>

function latestUpdatedAt(items: readonly { updatedAt: string }[]) {
  const [first, ...remaining] = items.map(({ updatedAt }) => updatedAt)
  if (!first) throw new Error('Cannot derive a page date from empty source data')
  return remaining.reduce((latest, updatedAt) => updatedAt > latest ? updatedAt : latest, first)
}

export function derivePageMetadata(contentDates: PageContentDates): Record<PageKey, PageMetadata> {
  if (!contentDates.home) throw new Error('Cannot derive the home date without home content')
  const homeUpdatedAt = Object.values(contentDates)
    .reduce((latest, updatedAt) => updatedAt > latest ? updatedAt : latest, contentDates.home)

  return {
    home: { updatedAt: homeUpdatedAt },
    academics: { updatedAt: contentDates.academics },
    honors: { updatedAt: contentDates.honors },
    research: { updatedAt: contentDates.research },
    works: { updatedAt: contentDates.works },
    concerts: { updatedAt: contentDates.concerts }
  }
}

export const pageMetadata = derivePageMetadata({
  home: homeHeroContentUpdatedAt,
  academics: academicsUpdatedAt,
  honors: honorsUpdatedAt,
  research: latestUpdatedAt(research),
  works: latestUpdatedAt(projects),
  concerts: concertsUpdatedAt
})
