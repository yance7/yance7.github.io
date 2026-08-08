import { describe, expect, it } from 'vitest'
import { activities, concerts, concertGroups, formatUpdatedLabel, getConcertState, pageMetadata, projects, research } from '../src/data'
import { thumbnailUrl } from '../src/utils/concertMedia'

describe('content contracts', () => {
  it('keeps concert media URLs rooted and thumbnail-safe', () => {
    expect(thumbnailUrl('concert-202511-kpl-01.jpg')).toBe('/assets/concerts/thumbs/concert-202511-kpl-01.webp')
    expect(concerts.every((concert) => concert.id && concert.images.length > 0)).toBe(true)
  })

  it('derives concert state from a supplied Beijing date', () => {
    const state = getConcertState(new Date('2026-08-07T12:00:00+08:00'))
    expect(state.upcoming.map((concert) => concert.id)).toEqual([
      'wangsulong-2026-08-19',
      'wangsulong-2026-08-30'
    ])
    expect(concertGroups['2026']).toHaveLength(8)
  })

  it('keeps featured home activities explicit and stable', () => {
    expect(activities.filter((activity) => activity.featured).map((activity) => activity.id)).toEqual([
      'low-carbon-volunteer',
      'pioneer-research-institute',
      'ap-calculus-assistant'
    ])
  })

  it('keeps content metadata and project/research contracts populated', () => {
    expect(projects.every((project) => project.updatedAt && project.status)).toBe(true)
    expect(research.every((item) => item.updatedAt && item.id)).toBe(true)
    expect(pageMetadata.concerts.updatedAt).toBe('2026-08-08')
    expect(formatUpdatedLabel(pageMetadata.research.updatedAt)).toMatch(/^[A-Z]{3} \d{2}, \d{4}$/)
  })
})
