import { describe, expect, it } from 'vitest'
import { pageEntries } from '../src/data/pageRegistry'
import {
  getLocalizedAcademics,
  getLocalizedHonors,
  getLocalizedProjects,
  getLocalizedResearch,
  getLocalizedSections
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
    getLocalizedAcademics('en'),
    getLocalizedHonors('en'),
    getLocalizedResearch('en'),
    getLocalizedProjects('en')
  ]

  it('does not use leading or trailing whitespace as a layout hack', () => {
    const strings = englishSources.flatMap(collectStrings)

    expect(strings.every((value) => value === value.trim())).toBe(true)
  })

  it('does not contain accidental repeated spaces', () => {
    const strings = englishSources.flatMap(collectStrings)

    expect(strings.filter((value) => / {2,}/.test(value))).toEqual([])
  })

  it('keeps PageCompass English short labels compact', () => {
    for (const page of pageEntries) {
      const sections = getLocalizedSections('en', page.key)

      expect(
        sections.every((section) => section.shortLabel.length <= 12)
      ).toBe(true)
    }
  })
})
