import { describe, expect, it } from 'vitest'
import { pageEntries } from '../src/data/pageRegistry'
import {
  getLocalizedAlbumSection,
  getLocalizedAlbums,
  getLocalizedAcademics,
  getLocalizedCommunity,
  getLocalizedConcertSection,
  getLocalizedConcerts,
  getLocalizedHonorCategories,
  getLocalizedHonorLevelLabels,
  getLocalizedHonorSections,
  getLocalizedHonorStats,
  getLocalizedHonors,
  getLocalizedHomeCopy,
  getLocalizedNavItems,
  getLocalizedPageMeta,
  getLocalizedProjectSection,
  getLocalizedProjects,
  getLocalizedResearch,
  getLocalizedResearchMethodGroups,
  getLocalizedResearchMethods,
  getLocalizedResearchSections,
  getLocalizedWorlds
} from '../src/data/locales'
import { uiMessages } from '../src/i18n'

function collectStrings(value: unknown): string[] {
  if (typeof value === 'string') return [value]
  if (Array.isArray(value)) return value.flatMap(collectStrings)

  if (value && typeof value === 'object') {
    return Object.values(value as Record<string, unknown>)
      .flatMap(collectStrings)
  }

  return []
}

describe('English content hygiene', () => {
  const englishSources = [
    uiMessages.en,
    ...pageEntries.map(({ key }) => getLocalizedPageMeta('en', key)),
    getLocalizedNavItems('en'),
    getLocalizedWorlds('en'),
    getLocalizedHomeCopy('en'),
    getLocalizedAcademics('en'),
    getLocalizedHonors('en'),
    getLocalizedHonorCategories('en'),
    getLocalizedHonorLevelLabels('en'),
    getLocalizedHonorSections('en'),
    getLocalizedHonorStats('en'),
    getLocalizedResearch('en'),
    getLocalizedResearchMethods('en'),
    getLocalizedResearchMethodGroups('en'),
    getLocalizedResearchSections('en'),
    getLocalizedProjects('en'),
    getLocalizedProjectSection('en'),
    getLocalizedAlbums('en'),
    getLocalizedAlbumSection('en'),
    getLocalizedConcerts('en'),
    getLocalizedConcertSection('en'),
    getLocalizedCommunity('en')
  ]

  it('does not use leading or trailing whitespace as a layout hack', () => {
    const strings = englishSources.flatMap(collectStrings)

    expect(strings.every((value) => value === value.trim())).toBe(true)
  })

  it('does not contain accidental repeated spaces', () => {
    const strings = englishSources.flatMap(collectStrings)

    expect(strings.filter((value) => / {2,}/.test(value))).toEqual([])
  })

  it('keeps the archive hero titles word-separated in source copy', () => {
    expect([
      getLocalizedPageMeta('en', 'academics').title,
      getLocalizedPageMeta('en', 'honors').title
    ]).toEqual(['Academic record', 'Selected honors'])
  })

  it('keeps the AP project dossier fully localized in English', () => {
    const project = getLocalizedProjects('en').find(({ id }) => id === 'ap-microeconomics-notes')
    expect(project?.title).toBe('AP Microeconomics Notes')
    expect(project?.description).toBe('An open Chinese-language AP Microeconomics study archive with structured course modules, economic diagrams, multiple-choice practice, FRQs, and worked explanations.')
    expect(project?.role).toBe('Content authoring · Curriculum design · Chart and build tooling')
    expect(collectStrings(project).some((value) => /[\u3400-\u9fff]/.test(value))).toBe(false)
    expect(getLocalizedProjectSection('en').copyPlural).toContain('open learning resources')
  })
})
