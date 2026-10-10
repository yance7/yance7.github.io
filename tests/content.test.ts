import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { activities, concerts, concertGroups, getConcertState, honors, honorCategories, pageMetadata, projects, research, researchMethods, worlds } from '../src/data'
import type { ConcertPoster } from '../src/data/types'
import { concertsCopy as englishConcertsCopy } from '../src/data/locales/en/concerts'
import { concertsCopy as simplifiedChineseConcertsCopy } from '../src/data/locales/zh-CN/concerts'
import { concertsCopy as traditionalChineseConcertsCopy } from '../src/data/locales/zh-HK/concerts'
import { thumbnailUrl } from '../src/utils/concertMedia'

function readJpegDimensions(path: string) {
  const bytes = readFileSync(path)
  let offset = 2
  while (offset < bytes.length) {
    while (bytes[offset] === 0xff) offset += 1
    const marker = bytes[offset++]
    if (!marker || marker === 0xd8 || marker === 0xd9) continue
    if (offset + 1 >= bytes.length) break
    const segmentLength = bytes.readUInt16BE(offset)
    if ((marker >= 0xc0 && marker <= 0xc3) || (marker >= 0xc5 && marker <= 0xc7) || (marker >= 0xc9 && marker <= 0xcb) || (marker >= 0xcd && marker <= 0xcf)) {
      return {
        width: bytes.readUInt16BE(offset + 5),
        height: bytes.readUInt16BE(offset + 3)
      }
    }
    offset += segmentLength
  }
  throw new Error(`Could not read JPEG dimensions from ${path}`)
}

describe('content contracts', () => {
  it('keeps honors limited to the compact archive fields', () => {
    expect(honors.every((honor) => !Object.prototype.hasOwnProperty.call(honor, 'detail'))).toBe(true)
  })

  it('keeps concert media URLs rooted and thumbnail-safe', () => {
    expect(thumbnailUrl('concert-202511-kpl-finals.jpg')).toBe('/assets/concerts/thumbs/concert-202511-kpl-finals.webp')
    expect(concerts.every((concert) => concert.id && concert.poster.file)).toBe(true)
  })

  it('localizes both Jason Zhang concert tours as Bound for 1982', () => {
    const zhangJieIds = ['zhangjie-2025-04-18', 'zhangjie-2026-04-19'] as const
    const tours = zhangJieIds.map((id) => englishConcertsCopy.entities[id]?.tour)

    expect(tours).toEqual(['未·Live — Bound for 1982', '未·Live — Bound for 1982'])
    expect(tours.join(' ')).not.toContain('Kai Wang')
  })

  it('keeps every concert poster available in original and thumbnail formats', () => {
    const posterFiles = new Set(concerts.map((concert) => concert.poster.file))
    const posterContracts: ConcertPoster[] = concerts.map((concert) => concert.poster)
    expect(concerts).toHaveLength(16)
    expect(posterContracts).toHaveLength(16)
    expect(posterFiles).toHaveLength(15)
    expect(concerts.filter((concert) => concert.date.startsWith('2026-'))).toHaveLength(10)
    expect(concerts.every((concert) => !Object.prototype.hasOwnProperty.call(concert, 'images'))).toBe(true)
    expect(concerts.every((concert) => !Object.prototype.hasOwnProperty.call(concert, 'land'))).toBe(true)
    expect([...posterFiles].every((file) => /^[a-z0-9]+(?:-[a-z0-9]+)*\.jpg$/.test(file))).toBe(true)

    for (const concert of concerts) {
      const posterPath = resolve(process.cwd(), 'public/assets/concerts', concert.poster.file)
      const thumbnailPath = resolve(process.cwd(), 'public/assets/concerts/thumbs', concert.poster.file.replace(/\.jpg$/, '.webp'))
      const thumbnailFallbackPath = resolve(process.cwd(), 'public/assets/concerts/thumbs', concert.poster.file)
      expect(existsSync(posterPath)).toBe(true)
      expect(existsSync(thumbnailPath)).toBe(true)
      expect(existsSync(thumbnailFallbackPath)).toBe(true)
      expect(readJpegDimensions(posterPath)).toEqual({ width: concert.poster.width, height: concert.poster.height })
    }
  })

  it('publishes the approved 2026 concert details in all locales', () => {
    const expected = {
      'zhou-shen': {
        date: '2026-09-27',
        zhCN: { artist: '周深', tour: '2026「深深的」巡回演唱会', venue: '鸟巢' },
        zhHK: { artist: '周深', tour: '2026「深深的」巡迴演唱會', venue: '鳥巢' },
        en: { artist: 'Zhou Shen', tour: '2026 Shenshen’s Concert Tour', venue: 'National Stadium' }
      },
      fforever: {
        date: '2026-10-06',
        zhCN: { artist: 'FFOREVER', tour: '「恒星之城」银河加冕 · 北京限定场演唱会', venue: '鸟巢' },
        zhHK: { artist: 'FFOREVER', tour: '「恆星之城」銀河加冕 · 北京限定場演唱會', venue: '鳥巢' },
        en: { artist: 'FFOREVER', tour: 'City of Stars · Beijing Limited Concert', venue: 'National Stadium' }
      }
    } as const

    for (const [id, details] of Object.entries(expected)) {
      const concert = concerts.find((item) => item.id === `${id}-2026-09-27` || item.id === `${id}-2026-10-06`)
      if (!concert) throw new Error(`Missing approved concert record for ${id}`)
      const simplifiedId = concert.id as keyof typeof simplifiedChineseConcertsCopy.entities
      const traditionalId = concert.id as keyof typeof traditionalChineseConcertsCopy.entities
      const englishId = concert.id as keyof typeof englishConcertsCopy.entities
      expect(concert?.date).toBe(details.date)
      expect(simplifiedChineseConcertsCopy.entities[simplifiedId]).toEqual(details.zhCN)
      expect(traditionalChineseConcertsCopy.entities[traditionalId]).toEqual(details.zhHK)
      expect(englishConcertsCopy.entities[englishId]).toEqual(details.en)
    }

    expect(concerts.find((concert) => concert.id === 'jd-summer-2026-05-31')?.date).toBe('2026-05-31')
  })

  it('removes carousel presentation from the single-poster rail', () => {
    const component = readFileSync(resolve(process.cwd(), 'src/components/ConcertArchiveRail.vue'), 'utf8')
    expect(component).not.toContain('carousel-controls')
    expect(component).not.toContain('carouselIndexes')
    expect(component).toContain('item.poster.file')
  })

  it('derives concert state from a supplied Beijing date', () => {
    const state = getConcertState(new Date('2026-08-07T12:00:00+08:00'))
    expect(state.archive.map((concert) => concert.id)).toEqual([
      'fforever-2026-10-06',
      'zhou-shen-2026-09-27',
      'wangsulong-2026-08-30',
      'wangsulong-2026-08-19',
      'xuezhiqian-2026-07-26',
      'zhoujielun-2026-06-26',
      'jd-summer-2026-05-31',
      'mayday-2026-05-15',
      'zhangjie-2026-04-19',
      'huangzihongfan-2026-03-14',
      'kpl-2025-11-08',
      'zhangyixing-2025-10-06',
      'taozhe-2025-09-19',
      'xietingfeng-2025-08-10',
      'zhangjie-2025-04-18',
      'dengziqi-2024-08-25'
    ])
    expect(state.upcoming.map((concert) => concert.id)).toEqual([
      'wangsulong-2026-08-19',
      'wangsulong-2026-08-30',
      'zhou-shen-2026-09-27',
      'fforever-2026-10-06'
    ])
    expect(concertGroups['2026']).toHaveLength(10)
  })

  it('keeps featured home activities explicit and stable', () => {
    expect(activities.filter((activity) => activity.featured).map((activity) => activity.id)).toEqual([
      'low-carbon-volunteer',
      'pioneer-research-institute',
      'ap-calculus-assistant'
    ])
  })

  it('keeps the home works description aligned with the published project count', () => {
    const worksWorld = worlds.find((world) => world.key === 'works')
    expect(worksWorld?.desc).toContain(`${projects.length} 个持续构建的小世界`)
  })

  it('keeps English archive labels and product brand names accurate', () => {
    expect(honorCategories.find((category) => category.key === 'emerging')?.en).toBe('EMERGING')
    expect(researchMethods.find((method) => method.label === 'Hugging Face')?.en).toBe('Hosting')
    expect(projects[0]?.stack).toContain('Hugging Face Spaces')
    expect(research.find((item) => item.id === 'fresheye')?.org).toContain('Hugging Face Spaces')
  })

  it('keeps content metadata and project/research contracts populated', () => {
    expect(projects.every((project) => project.updatedAt && project.status)).toBe(true)
    expect(research.every((item) => item.updatedAt && item.id)).toBe(true)
    expect(pageMetadata.concerts.updatedAt).toBe('2026-09-21')
    expect(pageMetadata.home.updatedAt).toBe('2026-09-21')
    expect(pageMetadata.academics.updatedAt).toBe('2026-08-08')
    expect(pageMetadata.research).toEqual({ updatedAt: '2026-08-08' })
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
