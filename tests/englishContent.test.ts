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

const englishHeroContracts = [
  {
    key: 'academics' as const,
    title: 'From here, tomorrow finds its way',
    credit: { artist: 'JJ Lin', song: '明日坐标', album: '明日坐标' }
  },
  {
    key: 'honors' as const,
    title: 'Step by step, I climb toward the light',
    credit: { artist: 'Jay Chou', song: '蜗牛', album: 'Fantasy Plus' }
  },
  {
    key: 'research' as const,
    title: 'My dream is imperfect; still, you dream it with me',
    credit: { artist: 'TFBOYS', song: '不完美小孩', album: '我们的时光' }
  },
  {
    key: 'works' as const,
    title: 'Slowly I learned: keep striving, and success will come',
    credit: { artist: 'Silence Wang', song: '慢慢懂', album: '慢慢懂' }
  },
  {
    key: 'concerts' as const,
    title: 'Fate brought us together, beyond this restless world',
    credit: { artist: 'G.E.M.', song: '光年之外', album: '' }
  }
] as const

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

  it('uses the approved English lyric titles and source-transparent credits', () => {
    for (const contract of englishHeroContracts) {
      expect(getLocalizedPageMeta('en', contract.key)).toMatchObject({
        title: contract.title,
        credit: contract.credit
      })
      expect(uiMessages.en.page[contract.key].title).toBe(contract.title)
    }
  })

  it('does not retain the old functional archive hero titles', () => {
    const oldTitles = [
      'Academic record',
      'Selected honors',
      'Research beyond the paper',
      'Building ideas into products',
      'Live music archive'
    ]

    const titles = englishHeroContracts.map(({ key }) => getLocalizedPageMeta('en', key).title)
    for (const oldTitle of oldTitles) expect(titles).not.toContain(oldTitle)
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
