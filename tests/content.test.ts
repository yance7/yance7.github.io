import { describe, expect, it } from 'vitest'
import { activities, albums, concerts, concertGroups, formatUpdatedLabel, getConcertState, pageMetadata, projects, research } from '../src/data'
import { albumCoverFallback, albumCoverSrcset, albumCoverWebp } from '../src/utils/albumMedia'
import { thumbnailUrl } from '../src/utils/concertMedia'

describe('content contracts', () => {
  it('keeps the exact ordered album release catalogue stable', () => {
    expect(albums.map(({ id, artist, title, year, format }) => ({ id, artist, title, year, format }))).toEqual([
      { id: 'jay-fantasy', artist: '周杰伦', title: '范特西', year: 2001, format: 'album' },
      { id: 'jay-ye-hui-mei', artist: '周杰伦', title: '叶惠美', year: 2003, format: 'album' },
      { id: 'jay-common-jasmine-orange', artist: '周杰伦', title: '七里香', year: 2004, format: 'album' },
      { id: 'jj-second-heaven', artist: '林俊杰', title: '第二天堂', year: 2004, format: 'album' },
      { id: 'jj-cao-cao', artist: '林俊杰', title: '曹操', year: 2006, format: 'album' },
      { id: 'jj-she-says', artist: '林俊杰', title: '她说', year: 2010, format: 'album' },
      { id: 'joker-accident', artist: '薛之谦', title: '意外', year: 2013, format: 'album' },
      { id: 'joker-beginner', artist: '薛之谦', title: '初学者', year: 2016, format: 'album' },
      { id: 'joker-extraterrestrial', artist: '薛之谦', title: '天外来物', year: 2020, format: 'album' },
      { id: 'gem-xposed', artist: '邓紫棋', title: 'Xposed', year: 2012, format: 'album' },
      { id: 'gem-heartbeat', artist: '邓紫棋', title: '新的心跳', year: 2015, format: 'album' },
      { id: 'gem-city-zoo', artist: '邓紫棋', title: '摩天动物园', year: 2019, format: 'album' },
      { id: 'silence-gravity', artist: '汪苏泷', title: '万有引力', year: 2012, format: 'album' },
      { id: 'silence-legendary-movement', artist: '汪苏泷', title: '传世乐章', year: 2014, format: 'album' },
      { id: 'silence-romance-21', artist: '汪苏泷', title: '21世纪罗曼史', year: 2022, format: 'album' },
      { id: 'jason-most-beautiful-sun', artist: '张杰', title: '最美的太阳', year: 2007, format: 'ep' },
      { id: 'jason-after-tomorrow', artist: '张杰', title: '明天过后', year: 2008, format: 'album' },
      { id: 'jason-this-is-love', artist: '张杰', title: '这，就是爱', year: 2010, format: 'album' },
      { id: 'leehom-the-one-and-only', artist: '王力宏', title: '唯一', year: 2001, format: 'album' },
      { id: 'leehom-shangri-la', artist: '王力宏', title: '心中的日月', year: 2004, format: 'album' },
      { id: 'leehom-change-me', artist: '王力宏', title: '改变自己', year: 2007, format: 'album' },
      { id: 'david-tao-self-titled', artist: '陶喆', title: '陶喆同名专辑', year: 1997, format: 'album' },
      { id: 'david-tao-im-ok', artist: '陶喆', title: 'I’m O.K.', year: 1999, format: 'album' },
      { id: 'david-tao-black-tangerine', artist: '陶喆', title: '黑色柳丁', year: 2002, format: 'album' }
    ])
  })

  it('keeps album media metadata valid and distinct', () => {
    expect(new Set(albums.map((album) => album.id)).size).toBe(24)
    expect(new Set(albums.map((album) => album.cover)).size).toBe(24)
    expect(albums.every((album) => (
      album.cover === album.id
      && Number.isInteger(album.year)
      && album.appleMusicUrl.startsWith('https://music.apple.com/')
      && album.palette.length === 2
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
