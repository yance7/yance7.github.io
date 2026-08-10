import { describe, expect, it } from 'vitest'
import { activities, albums, concerts, concertGroups, formatUpdatedLabel, getConcertState, pageMetadata, projects, research } from '../src/data'
import { albumCoverFallback, albumCoverSrcset, albumCoverWebp } from '../src/utils/albumMedia'
import { thumbnailUrl } from '../src/utils/concertMedia'

describe('content contracts', () => {
  it('keeps the exact ordered album release catalogue stable', () => {
    expect(albums.map(({ id, artist, title, year, format, appleMusicUrl }) => ({ id, artist, title, year, format, appleMusicUrl }))).toEqual([
      { id: 'jay-fantasy', artist: '周杰伦', title: '范特西', year: 2001, format: 'album', appleMusicUrl: 'https://music.apple.com/cn/album/%E8%8C%83%E7%89%B9%E8%A5%BF/535739206' },
      { id: 'jay-ye-hui-mei', artist: '周杰伦', title: '叶惠美', year: 2003, format: 'album', appleMusicUrl: 'https://music.apple.com/cn/album/%E8%91%89%E6%83%A0%E7%BE%8E/535824731' },
      { id: 'jay-common-jasmine-orange', artist: '周杰伦', title: '七里香', year: 2004, format: 'album', appleMusicUrl: 'https://music.apple.com/cn/album/%E4%B8%83%E9%87%8C%E9%A6%99/536114662' },
      { id: 'jj-second-heaven', artist: '林俊杰', title: '第二天堂', year: 2004, format: 'album', appleMusicUrl: 'https://music.apple.com/cn/album/%E7%AC%AC%E4%BA%8C%E5%A4%A9%E5%A0%82-%E6%B1%9F%E5%8D%97/1071753622' },
      { id: 'jj-cao-cao', artist: '林俊杰', title: '曹操', year: 2006, format: 'album', appleMusicUrl: 'https://music.apple.com/cn/album/%E6%9B%B9%E6%93%8D/1071513017' },
      { id: 'jj-she-says', artist: '林俊杰', title: '她说', year: 2010, format: 'album', appleMusicUrl: 'https://music.apple.com/cn/album/%E5%A5%B9%E8%AA%AA/1071506928' },
      { id: 'joker-accident', artist: '薛之谦', title: '意外', year: 2013, format: 'album', appleMusicUrl: 'https://music.apple.com/cn/album/%E6%84%8F%E5%A4%96/1788255148' },
      { id: 'joker-beginner', artist: '薛之谦', title: '初学者', year: 2016, format: 'album', appleMusicUrl: 'https://music.apple.com/cn/album/%E5%88%9D%E5%AD%A6%E8%80%85/1787929894' },
      { id: 'joker-extraterrestrial', artist: '薛之谦', title: '天外来物', year: 2020, format: 'album', appleMusicUrl: 'https://music.apple.com/cn/album/%E5%A4%A9%E5%A4%96%E6%9D%A5%E7%89%A9/1787447447' },
      { id: 'gem-xposed', artist: '邓紫棋', title: 'Xposed', year: 2012, format: 'album', appleMusicUrl: 'https://music.apple.com/cn/album/xposed/541862703' },
      { id: 'gem-heartbeat', artist: '邓紫棋', title: '新的心跳', year: 2015, format: 'album', appleMusicUrl: 'https://music.apple.com/cn/album/%E6%96%B0%E7%9A%84%E5%BF%83%E8%B7%B3/1053567923' },
      { id: 'gem-city-zoo', artist: '邓紫棋', title: '摩天动物园', year: 2019, format: 'album', appleMusicUrl: 'https://music.apple.com/cn/album/city-zoo/1491477494' },
      { id: 'silence-gravity', artist: '汪苏泷', title: '万有引力', year: 2012, format: 'album', appleMusicUrl: 'https://music.apple.com/cn/album/%E4%B8%87%E6%9C%89%E5%BC%95%E5%8A%9B/6774677307' },
      { id: 'silence-legendary-movement', artist: '汪苏泷', title: '传世乐章', year: 2014, format: 'album', appleMusicUrl: 'https://music.apple.com/cn/album/%E4%BC%A0%E4%B8%96%E4%B9%90%E7%AB%A0/6774679274' },
      { id: 'silence-romance-21', artist: '汪苏泷', title: '21世纪罗曼史', year: 2022, format: 'album', appleMusicUrl: 'https://music.apple.com/cn/album/21%E4%B8%96%E7%BA%AA%E7%BD%97%E6%9B%BC%E5%8F%B2/6774650828' },
      { id: 'jason-most-beautiful-sun', artist: '张杰', title: '最美的太阳', year: 2007, format: 'ep', appleMusicUrl: 'https://music.apple.com/us/album/%E6%9C%80%E7%BE%8E%E7%9A%84%E5%A4%AA%E9%98%B3-ep/1631475297' },
      { id: 'jason-after-tomorrow', artist: '张杰', title: '明天过后', year: 2008, format: 'album', appleMusicUrl: 'https://music.apple.com/us/album/%E6%98%8E%E5%A4%A9%E8%BF%87%E5%90%8E/1631470434' },
      { id: 'jason-this-is-love', artist: '张杰', title: '这，就是爱', year: 2010, format: 'album', appleMusicUrl: 'https://music.apple.com/us/album/%E8%BF%99-%E5%B0%B1%E6%98%AF%E7%88%B1/1631475679' },
      { id: 'leehom-the-one-and-only', artist: '王力宏', title: '唯一', year: 2001, format: 'album', appleMusicUrl: 'https://music.apple.com/cn/album/%E5%94%AF%E4%B8%80/312506816' },
      { id: 'leehom-shangri-la', artist: '王力宏', title: '心中的日月', year: 2004, format: 'album', appleMusicUrl: 'https://music.apple.com/cn/album/%E5%BF%83%E4%B8%AD%E7%9A%84%E6%97%A5%E6%9C%88/1134344345' },
      { id: 'leehom-change-me', artist: '王力宏', title: '改变自己', year: 2007, format: 'album', appleMusicUrl: 'https://music.apple.com/cn/album/%E6%94%B9%E8%AE%8A%E8%87%AA%E5%B7%B1/1691044816' },
      { id: 'david-tao-self-titled', artist: '陶喆', title: '陶喆同名专辑', year: 1997, format: 'album', appleMusicUrl: 'https://music.apple.com/cn/album/%E9%99%B6%E5%96%86%E5%90%8C%E5%90%8D%E5%B0%88%E8%BC%AF/1416149926' },
      { id: 'david-tao-im-ok', artist: '陶喆', title: 'I’m O.K.', year: 1999, format: 'album', appleMusicUrl: 'https://music.apple.com/cn/album/im-o-k/905206471' },
      { id: 'david-tao-black-tangerine', artist: '陶喆', title: '黑色柳丁', year: 2002, format: 'album', appleMusicUrl: 'https://music.apple.com/cn/album/%E9%BB%91%E8%89%B2%E6%9F%B3%E4%B8%81/914664926' }
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
