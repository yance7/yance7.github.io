import * as original from '../../../src/data/locales/index'
import type { Locale } from '../../../src/i18n/types'
export * from '../../../src/data/locales/index'

const parameters = new URLSearchParams(location.search)
const isEmpty = parameters.get('empty') === '1'

export function getLocalizedProjects(locale: Locale) {
  return isEmpty ? [] : original.getLocalizedProjects(locale)
}

export function getLocalizedResearch(locale: Locale) {
  return isEmpty ? [] : original.getLocalizedResearch(locale)
}

export function getLocalizedHonors(locale: Locale) {
  const honors = original.getLocalizedHonors(locale)
  if (isEmpty) return []
  return parameters.get('filtered') === '1' ? honors.filter(honor => honor.level === 'peak').slice(0, 1) : honors
}

export function getLocalizedHonorStats(locale: Locale) {
  const honors = getLocalizedHonors(locale)
  const levels = ['all', 'peak', 'excellent', 'emerging'] as const
  return original.getLocalizedHonorStats(locale).map((stat, index) => ({
    ...stat,
    value: String(index === 0 ? honors.length : honors.filter(honor => honor.level === levels[index]).length)
  }))
}

export function getLocalizedConcertState(locale: Locale, now?: Date) {
  const state = original.getLocalizedConcertState(locale, now)
  return isEmpty ? { ...state, archive: [], upcoming: [], attended: [], venueCount: 0, stats: { total: 0, attended: 0, upcoming: 0, venues: '', artistCount: 0, posterCount: 0 } } : state
}
