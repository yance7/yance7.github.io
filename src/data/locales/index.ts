import { buildLocalizedPageHref } from '../../i18n/locales'
import { uiMessages } from '../../i18n/messages'
import { pageRegistry, pageEntries, type PageKey } from '../pageRegistry'
import { honorStats, honors } from '../honors'
import { research } from '../research'
import { projects } from '../projects'
import { albums } from '../albums'
import { concerts, isConcertUpcoming } from '../concerts'
import type { Concert, Honor, PageCompassSection, PageMeta, Project, ResearchItem, SiteNavItem, World } from '../types'
import type { Locale } from '../../i18n/types'
import type { LocaleContent } from './types'
import { siteCopy as zhCNSite } from './zh-CN/site'
import { academicsCopy as zhCNAcademics } from './zh-CN/academics'
import { honorsCopy as zhCNHonors } from './zh-CN/honors'
import { researchCopy as zhCNResearch } from './zh-CN/research'
import { projectsCopy as zhCNProjects } from './zh-CN/projects'
import { concertsCopy as zhCNConcerts } from './zh-CN/concerts'
import { albumCopy as zhCNAlbums } from './zh-CN/albums'
import { communityCopy as zhCNCommunity } from './zh-CN/community'
import { siteCopy as zhHKSite } from './zh-HK/site'
import { academicsCopy as zhHKAcademics } from './zh-HK/academics'
import { honorsCopy as zhHKHonors } from './zh-HK/honors'
import { researchCopy as zhHKResearch } from './zh-HK/research'
import { projectsCopy as zhHKProjects } from './zh-HK/projects'
import { concertsCopy as zhHKConcerts } from './zh-HK/concerts'
import { albumCopy as zhHKAlbums } from './zh-HK/albums'
import { communityCopy as zhHKCommunity } from './zh-HK/community'
import { siteCopy as enSite } from './en/site'
import { academicsCopy as enAcademics } from './en/academics'
import { honorsCopy as enHonors } from './en/honors'
import { researchCopy as enResearch } from './en/research'
import { projectsCopy as enProjects } from './en/projects'
import { concertsCopy as enConcerts } from './en/concerts'
import { albumCopy as enAlbums } from './en/albums'
import { communityCopy as enCommunity } from './en/community'

const localeContent: Record<Locale, LocaleContent> = {
  'zh-CN': { site: zhCNSite, academics: zhCNAcademics, honors: zhCNHonors, research: zhCNResearch, projects: zhCNProjects, concerts: zhCNConcerts, albums: zhCNAlbums, community: zhCNCommunity, status: uiMessages['zh-CN'].status },
  'zh-HK': { site: zhHKSite, academics: zhHKAcademics, honors: zhHKHonors, research: zhHKResearch, projects: zhHKProjects, concerts: zhHKConcerts, albums: zhHKAlbums, community: zhHKCommunity, status: uiMessages['zh-HK'].status },
  en: { site: enSite, academics: enAcademics, honors: enHonors, research: enResearch, projects: enProjects, concerts: enConcerts, albums: enAlbums, community: enCommunity, status: uiMessages.en.status }
} satisfies Record<Locale, LocaleContent>

function content(locale: Locale) {
  return localeContent[locale]
}

function mergeById<T extends { id: string }>(facts: readonly T[], copies: Record<string, unknown>, label: string): T[] {
  return facts.map((fact) => {
    const copy = copies[fact.id] as Record<string, unknown> | undefined
    if (!copy) throw new Error(`Missing ${label} copy for ${fact.id}`)
    return { ...fact, ...copy } as T
  })
}

export function getLocalizedPageMeta(locale: Locale, page: PageKey): PageMeta {
  return content(locale).site.pageMeta[page]
}

export function getLocalizedNavItems(locale: Locale): SiteNavItem[] {
  return pageEntries.map(({ key }) => ({
    key,
    href: buildLocalizedPageHref(key, locale),
    ...content(locale).site.nav[key]
  }))
}

export function getLocalizedSections(locale: Locale, page: PageKey): readonly PageCompassSection[] {
  const sections = content(locale).site.sections[page]
  const expectedIds = pageRegistry[page].sectionIds
  if (sections.map((section) => section.id).join('|') !== expectedIds.join('|')) {
    throw new Error(`Locale ${locale} has incomplete sections for ${page}`)
  }
  return sections
}

export function getLocalizedWorlds(locale: Locale): World[] {
  return (['academics', 'honors', 'research', 'works', 'concerts'] as const).map((key) => ({
    key,
    href: buildLocalizedPageHref(key, locale),
    ...content(locale).site.worlds[key]
  }))
}

export function getLocalizedHomeCopy(locale: Locale) {
  return content(locale).site.home
}

export function getLocalizedAcademics(locale: Locale) {
  return content(locale).academics
}

export function getLocalizedHonors(locale: Locale): Honor[] {
  return mergeById(honors, content(locale).honors.entities, 'honor')
}

export function getLocalizedHonorCategories(locale: Locale) {
  return content(locale).honors.categories
}

export function getLocalizedHonorLevelLabels(locale: Locale) {
  return content(locale).honors.levelLabels
}

export function getLocalizedHonorSections(locale: Locale) {
  return content(locale).honors.sections
}

export function getLocalizedHonorStats(locale: Locale) {
  const keys = ['all', 'peak', 'excellent', 'emerging'] as const
  return honorStats.map((stat, index) => ({
    ...stat,
    label: content(locale).honors.statLabels[keys[index] ?? 'all'].label,
    note: content(locale).honors.statLabels[keys[index] ?? 'all'].note
  }))
}

export function getLocalizedResearch(locale: Locale): ResearchItem[] {
  return mergeById(research, content(locale).research.entities, 'research')
}

export function getLocalizedResearchMethods(locale: Locale) {
  return content(locale).research.methods
}

export function getLocalizedResearchMethodGroups(locale: Locale) {
  return content(locale).research.groups
}

export function getLocalizedResearchSections(locale: Locale) {
  return content(locale).research.sections
}

export function getLocalizedProjects(locale: Locale): Project[] {
  return mergeById(projects, content(locale).projects.entities, 'project').map((project) => ({
    ...project,
    story: {
      ...project.story,
      chapters: project.story.chapters.map((chapter) => ({
        ...chapter,
        href: chapter.href ? localizeInternalHref(chapter.href, locale) : undefined
      }))
    }
  }))
}

export function getLocalizedProjectSection(locale: Locale) {
  return content(locale).projects.section
}

export function getLocalizedAlbums(locale: Locale) {
  const copies = content(locale).albums.entities
  return albums.map((album) => ({ ...album, ...(copies[album.id] ?? {}) }))
}

export function getLocalizedAlbumSection(locale: Locale) {
  return content(locale).albums.section
}

export function getLocalizedConcerts(locale: Locale): Concert[] {
  return mergeById(concerts, content(locale).concerts.entities, 'concert')
}

export function getLocalizedConcertSection(locale: Locale) {
  return content(locale).concerts.section
}

export function getLocalizedConcertState(locale: Locale, now = new Date()): {
  now: Date
  upcoming: Concert[]
  attended: Concert[]
  moods: Record<string, string>
  stats: { total: number; attended: number; upcoming: number; venues: string; artistCount: number; posterCount: number }
  venueCount: number
} {
  const localized = getLocalizedConcerts(locale)
  const upcoming = localized.filter((concert) => isConcertUpcoming(concert, now)).sort((a, b) => a.date.localeCompare(b.date))
  const attended = localized.filter((concert) => !isConcertUpcoming(concert, now))
  const venues = [...new Set(localized.map((concert) => concert.venue))]
  const artists = [...new Set(localized.map((concert) => concert.artist))]
  const posters = new Set(localized.flatMap((concert) => concert.images))
  const attended2026 = attended.filter((concert) => concert.date.startsWith('2026-')).length
  const upcoming2026 = upcoming.filter((concert) => concert.date.startsWith('2026-')).length
  return {
    now,
    upcoming,
    attended,
    moods: { ...content(locale).concerts.moods, '2026': content(locale).concerts.currentYearMood(attended2026, upcoming2026) },
    stats: { total: localized.length, attended: attended.length, upcoming: upcoming.length, venues: venues.join(' / '), artistCount: artists.length, posterCount: posters.size },
    venueCount: venues.length
  }
}

export function getLocalizedCommunity(locale: Locale) {
  return content(locale).community
}

function localizeInternalHref(href: string, locale: Locale) {
  const match = href.match(/^([^#?]+)(\?[^#]*)?(#.*)?$/)
  if (!match) return href
  const page = (Object.keys(pageRegistry) as PageKey[]).find((key) => pageRegistry[key].href === match[1])
  return page ? buildLocalizedPageHref(page, locale, { search: match[2], hash: match[3] }) : href
}
