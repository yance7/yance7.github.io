import { describe, expect, it } from 'vitest'
import { activities, albums, concerts, concertGroups, formatUpdatedLabel, getConcertState, pageMetadata, projects, research } from '../src/data'
import { albumCoverFallback, albumCoverSrcset, albumCoverWebp } from '../src/utils/albumMedia'
import { thumbnailUrl } from '../src/utils/concertMedia'

describe('content contracts', () => {
  it('keeps the album release set and artist grouping stable', () => {
    expect(albums).toHaveLength(24)
    expect([...new Set(albums.map((album) => album.artist))]).toEqual([
      '周杰伦', '林俊杰', '薛之谦', '邓紫棋', '汪苏泷', '张杰', '王力宏', '陶喆'
    ])
    const releasesByArtist = albums.reduce<Record<string, number>>((counts, album) => {
      counts[album.artist] = (counts[album.artist] ?? 0) + 1
      return counts
    }, {})
    expect(Object.values(releasesByArtist).every((count) => count === 3)).toBe(true)
  })

  it('keeps album ordering and the single EP explicit', () => {
    expect(albums[0]?.id).toBe('jay-fantasy')
    expect(albums.filter((album) => album.format === 'ep').map((album) => album.id)).toEqual(['jason-most-beautiful-sun'])
  })

  it('keeps album media metadata valid and distinct', () => {
    expect(new Set(albums.map((album) => album.id)).size).toBe(24)
    expect(new Set(albums.map((album) => album.cover)).size).toBe(24)
    expect(albums.every((album) => (
      album.cover === album.id
      && Number.isInteger(album.year)
      && album.appleMusicUrl.startsWith('https://music.apple.com/')
      && album.palette.every((color) => /^#[0-9A-F]{6}$/i.test(color))
    ))).toBe(true)
  })

  it('derives rooted responsive album media URLs', () => {
    expect(albumCoverFallback('jay-fantasy')).toBe('/assets/albums/jay-fantasy.jpg')
    expect(albumCoverWebp('jay-fantasy', 640)).toBe('/assets/albums/thumbs/jay-fantasy-640.webp')
    expect(albumCoverWebp('jay-fantasy', 1200)).toBe('/assets/albums/thumbs/jay-fantasy-1200.webp')
    expect(albumCoverSrcset('jay-fantasy')).toBe('/assets/albums/thumbs/jay-fantasy-640.webp 640w, /assets/albums/thumbs/jay-fantasy-1200.webp 1200w')
  })

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
    expect(pageMetadata.home.updatedAt).toBe('2026-08-08')
    expect(pageMetadata.academics.updatedAt).toBe('2026-08-08')
    expect(formatUpdatedLabel(pageMetadata.research.updatedAt)).toMatch(/^[A-Z]{3} \d{2}, \d{4}$/)
  })

  it('keeps published FishFreshNet V1 metrics aligned with the paper result', () => {
    const v1 = research.find((item) => item.id === 'fishfreshnet-v1')
    expect(v1?.metrics?.[0]).toEqual({ value: '99.23%', label: '准确率', note: 'MFED · paper result' })
    expect(v1?.methodology?.result).toContain('99.23%')
  })

  it('keeps current FishFreshNet project dates and publication status accurate', () => {
    const freshEye = research.find((item) => item.id === 'fresheye')
    const v2 = research.find((item) => item.id === 'fishfreshnet-v2')
    expect(freshEye?.date).toBe('2026.06 — 2026.08')
    expect(v2?.date).toBe('2026.05 — 2026.08')
    expect(v2?.status).toBe('completed')
    expect(v2?.paper).toBeUndefined()
  })
})
