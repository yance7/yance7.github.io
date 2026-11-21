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
    expect(honors.map((honor) => honor.scope)).toEqual([
      'national', 'international', 'international', 'national', 'international', 'international', 'international',
      'national', 'regional', 'international', 'pending', 'pending', 'international'
    ])
  })

  it('keeps stable source coordinates for filtered scopes', () => {
    const withCoordinates = honors.map((honor, index) => ({ ...honor, coordinate: index + 1 }))

    expect(withCoordinates.map((honor) => String(honor.coordinate).padStart(2, '0'))).toEqual([
      '01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12', '13'
    ])
    expect(withCoordinates.filter((honor) => honor.scope === 'international').map((honor) => honor.coordinate)).toEqual([2, 3, 5, 6, 7, 10, 13])
  })

  it('keeps the four archive filter counts aligned with the honor scopes', () => {
    expect({
      all: honors.length,
      international: honors.filter(({ scope }) => scope === 'international').length,
      national: honors.filter(({ scope }) => scope === 'national').length,
      regional: honors.filter(({ scope }) => scope === 'regional').length
    }).toEqual({ all: 13, international: 7, national: 3, regional: 1 })
    expect(honors.filter(({ scope }) => scope === 'pending')).toHaveLength(2)
  })

  it('only shows same-caliber evidence with an official source', () => {
    for (const locale of locales) {
      const records = getLocalizedHonors(locale)
      expect(records.filter((honor) => honor.evidence).map((honor) => honor.id).sort()).toEqual([
        'ai-innovation-2026-third',
        'ccc-2025-regional-excellence',
        'ccc-2026-national-bronze',
        'trae-ai-2026-top-350'
      ])
      expect(records.every((honor) => !honor.source || Boolean(honor.evidence))).toBe(true)
      const trae = records.find((honor) => honor.id === 'trae-ai-2026-top-350')
      expect(trae?.source).toBe('https://bytedance.larkoffice.com/wiki/DScwwZPzsikvNzk5slJc2kgpnie')
    }
  })

  it('keeps district-level records in the pending list for every locale', () => {
    for (const locale of locales) {
      expect(getLocalizedHonors(locale).filter((honor) => honor.scope === 'pending').map((honor) => honor.id))
        .toEqual(['chaoyang-jinpeng-2026-second', 'chaoyang-sti-2025-first'])
    }
  })

  it('uses the updated participant-based TRAE record in every locale', () => {
    for (const locale of locales) {
      const trae = getLocalizedHonors(locale).find((honor) => honor.id === 'trae-ai-2026-top-350')

      expect(trae).toBeDefined()
      const legacyCopy = [
        ['Top', '300'].join(' '),
        ['top', '300'].join('-'),
        ['创意', '大赛'].join(''),
        ['創意', '大賽'].join(''),
        ['14,000', '份作品'].join(' '),
        ['14,000', '份作品'].join(''),
        ['sub', 'missions'].join(' ')
      ]
      const copy = `${trae?.title} ${trae?.org}`
      expect(legacyCopy.some((value) => copy.includes(value))).toBe(false)

      if (locale === 'zh-CN') {
        expect(trae).toMatchObject({ title: 'TRAE AI 创造力大赛 · Top 350', org: '约 14,000 名参赛者' })
      } else if (locale === 'zh-HK') {
        expect(trae).toMatchObject({ title: 'TRAE AI 創造力大賽 · Top 350', org: '約 14,000 名參賽者' })
      } else {
        expect(trae).toMatchObject({ title: 'TRAE AI Creativity Competition · Top 350', org: 'Approximately 14,000 participants' })
      }
    }
  })

  it('keeps official-name corrections aligned across all locale records', () => {
    for (const locale of locales) {
      const records = getLocalizedHonors(locale)
      expect(records.find((honor) => honor.id === 'beijing-sti-2026-second')?.org)
        .toBe('Beijing Youth Science Creation Competition')
      expect(records.find((honor) => honor.id === 'chaoyang-jinpeng-2026-second')?.org)
        .toBe('Chaoyang Youth “Jinpeng” Science and Technology Forum')
      expect(records.find((honor) => honor.id === 'chaoyang-sti-2025-first')?.org)
        .toBe('Chaoyang Youth Science and Technology Innovation Competition')
      expect(records.some((honor) => `${honor.title} ${honor.org}`.includes('Jinping'))).toBe(false)
    }
  })
})
