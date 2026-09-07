import { describe, expect, it } from 'vitest'
import { honors } from '../src/data'
import { getLocalizedHonors } from '../src/data/locales'

const locales = ['zh-CN', 'zh-HK', 'en'] as const

describe('honors archive content contract', () => {
  it('keeps thirteen honors in the original chronological order', () => {
    expect(honors).toHaveLength(13)
    expect(honors.map((honor) => honor.id)).toEqual([
      'ai-innovation-2026-third',
      'trae-ai-2026-top-350',
      'ukcho-2026-gold',
      'usabo-2026-silver',
      'ccc-2026-national-bronze',
      'senior-physics-2026-bronze',
      'bbo-2026-gold',
      'ihosa-2026-bce-excellence',
      'beijing-sti-2026-second',
      'usaco-2025-2026-gold',
      'chaoyang-jinpeng-2026-second',
      'chaoyang-sti-2025-first',
      'ccc-2025-regional-excellence'
    ])
    expect(honors.map((honor) => honor.level)).toEqual([
      'emerging', 'peak', 'peak', 'excellent', 'emerging', 'emerging', 'peak',
      'emerging', 'excellent', 'peak', 'emerging', 'emerging', 'emerging'
    ])
  })

  it('keeps stable source coordinates for filtered levels', () => {
    const withCoordinates = honors.map((honor, index) => ({ ...honor, coordinate: index + 1 }))

    expect(withCoordinates.map((honor) => String(honor.coordinate).padStart(2, '0'))).toEqual([
      '01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12', '13'
    ])
    expect(withCoordinates.filter((honor) => honor.level === 'peak').map((honor) => honor.coordinate)).toEqual([2, 3, 7, 10])
  })

  it('keeps the four archive filter counts aligned with the honors levels', () => {
    expect({
      all: honors.length,
      peak: honors.filter(({ level }) => level === 'peak').length,
      excellent: honors.filter(({ level }) => level === 'excellent').length,
      emerging: honors.filter(({ level }) => level === 'emerging').length
    }).toEqual({ all: 13, peak: 4, excellent: 2, emerging: 7 })
  })

  it('uses the corrected TRAE record in every locale', () => {
    for (const locale of locales) {
      const trae = getLocalizedHonors(locale).find((honor) => honor.id === 'trae-ai-2026-top-350')

      expect(trae).toBeDefined()
      const legacyCopy = [
        ['Top', '300'].join(' '),
        ['top', '300'].join('-'),
        ['创意', '大赛'].join(''),
        ['創意', '大賽'].join(''),
        ['参赛', '者'].join(''),
        ['參賽', '者'].join(''),
        ['entr', 'ants'].join('')
      ]
      const copy = `${trae?.title} ${trae?.org}`
      expect(legacyCopy.some((value) => copy.includes(value))).toBe(false)

      if (locale === 'zh-CN') {
        expect(trae).toMatchObject({ title: 'TRAE AI 创造力大赛 · Top 350', org: '约 14,000 份作品' })
      } else if (locale === 'zh-HK') {
        expect(trae).toMatchObject({ title: 'TRAE AI 創造力大賽 · Top 350', org: '約 14,000 份作品' })
      } else {
        expect(trae).toMatchObject({ title: 'TRAE AI Creativity Competition · Top 350', org: 'Approximately 14,000 submissions' })
      }
    }
  })
})
