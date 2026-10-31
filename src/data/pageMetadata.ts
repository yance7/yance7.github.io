import { academicsUpdatedAt } from './academics.ts'
import { concertsUpdatedAt } from './concerts.ts'
import { honorsUpdatedAt } from './honors.ts'
import { homeHeroContentUpdatedAt } from './homeHeroSlides.ts'
import { projects } from './projects.ts'
import { research } from './research.ts'
import { getLocalizedPageMeta } from './locales/index.ts'
import { localeRegistry } from '../i18n/locales.ts'
import type { Locale } from '../i18n/types.ts'
import { pageEntries } from './pageRegistry.ts'
import type { PageKey, PageMetadata } from './types.ts'

export type PageContentDates = Record<PageKey, string>
export type LocalizedPageContentDates = Partial<Record<Locale, Partial<Record<PageKey, string>>>>
export type LocalizedPageMetadata = Record<Locale, Record<PageKey, PageMetadata>>

function latestUpdatedAt(dates: readonly string[]) {
  const [first, ...remaining] = dates
  if (!first) throw new Error('Cannot derive a page date from empty source data')
  return remaining.reduce((latest, updatedAt) => updatedAt > latest ? updatedAt : latest, first)
}

function itemUpdatedAt(items: readonly { id: string; updatedAt: string }[], id: string) {
  const item = items.find((candidate) => candidate.id === id)
  if (!item) throw new Error(`Cannot derive a homepage date without ${id} content`)
  return item.updatedAt
}

export function derivePageMetadata(
  contentDates: PageContentDates,
  localizedContentDates: LocalizedPageContentDates = {},
  homeSummaryDates: readonly string[] = []
): LocalizedPageMetadata {
  if (!contentDates.home) throw new Error('Cannot derive the home date without home content')
  const homeUpdatedAt = latestUpdatedAt([contentDates.home, ...homeSummaryDates])
  const pageKeys = Object.keys(contentDates) as PageKey[]

  return Object.fromEntries((Object.keys(localeRegistry) as Locale[]).map((locale) => {
    const localeMetadata = Object.fromEntries(pageKeys.map((page) => {
      const sharedDate = page === 'home' ? homeUpdatedAt : contentDates[page]
      const localizedDate = localizedContentDates[locale]?.[page]
      const updatedAt = localizedDate ? latestUpdatedAt([sharedDate, localizedDate]) : sharedDate
      return [page, { updatedAt }]
    })) as Record<PageKey, PageMetadata>

    return [locale, localeMetadata]
  })) as LocalizedPageMetadata
}

const localizedContentDates = Object.fromEntries((Object.keys(localeRegistry) as Locale[]).map((locale) => {
  const localeDates: Partial<Record<PageKey, string>> = {}
  for (const { key } of pageEntries) {
    const updatedAt = getLocalizedPageMeta(locale, key).contentUpdatedAt
    if (updatedAt) localeDates[key] = updatedAt
  }

  return [locale, localeDates]
})) as LocalizedPageContentDates

export const pageMetadata = derivePageMetadata({
  home: homeHeroContentUpdatedAt,
  academics: academicsUpdatedAt,
  honors: honorsUpdatedAt,
  research: latestUpdatedAt(research.map(({ updatedAt }) => updatedAt)),
  works: latestUpdatedAt(projects.map(({ updatedAt }) => updatedAt)),
  concerts: concertsUpdatedAt
}, localizedContentDates, [
  itemUpdatedAt(research, 'fishfreshnet-v2'),
  itemUpdatedAt(projects, 'fresheye')
])
