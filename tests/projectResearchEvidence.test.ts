import { describe, expect, it } from 'vitest'
import { projects, research } from '../src/data'
import { getLocalizedProjects, getLocalizedResearch } from '../src/data/locales'

const locales = ['zh-CN', 'zh-HK', 'en'] as const

describe('project and research evidence', () => {
  it('keeps the Works order while adding Trusted Garden with verified links', () => {
    expect(projects.map(({ id }) => id)).toEqual([
      'fresheye',
      'trusted-garden',
      'ap-microeconomics-notes'
    ])
    expect(projects[0]).toMatchObject({
      id: 'fresheye',
      href: 'https://fresheye.yance.me',
      github: 'https://github.com/yance7/FreshEye'
    })
    expect(projects[2]).toMatchObject({
      id: 'ap-microeconomics-notes',
      href: 'https://github.com/yance7/ap-microeconomics-notes'
    })

    const garden = projects[1]
    expect(garden).toMatchObject({
      id: 'trusted-garden',
      action: 'live',
      status: 'deployed',
      domain: 'trusted-garden.yance.me',
      href: 'https://trusted-garden.yance.me/',
      github: 'https://github.com/yance7/trusted-garden',
      tone: 'violet',
      en: 'Trusted Garden',
      stack: ['Three.js', 'TypeScript', 'Vite', 'glTF']
    })
    expect(garden?.story.proof).toEqual([])
  })

  it('localizes Trusted Garden copy and stays within its verified feature boundaries', () => {
    const expectedTitles = {
      'zh-CN': 'Trusted Garden',
      'zh-HK': 'Trusted Garden',
      en: 'Trusted Garden'
    }
    const expectedMotionTerms = {
      'zh-CN': /视角.*天气.*漫游|天气.*视角.*漫游/,
      'zh-HK': /視角.*天氣.*漫遊|天氣.*視角.*漫遊/,
      en: /view.*weather.*roam|weather.*view.*roam/i
    }
    const expectedSimulatedTerms = {
      'zh-CN': /模拟/,
      'zh-HK': /模擬/,
      en: /simulated/i
    }
    const expectedSameSiteTerms = {
      'zh-CN': /同一站点.*模型.*纹理|模型.*纹理.*同一站点/,
      'zh-HK': /同一網站.*模型.*(?:貼圖|材質)|模型.*(?:貼圖|材質).*同一網站/,
      en: /same site.*models.*textures|models.*textures.*same site/i
    }

    for (const locale of locales) {
      const garden = getLocalizedProjects(locale).find(({ id }) => id === 'trusted-garden')
      expect(garden?.title).toBe(expectedTitles[locale])

      const copy = [
        garden?.value,
        garden?.description,
        garden?.role,
        garden?.discipline,
        garden?.story.label,
        garden?.story.note,
        ...garden?.story.chapters.flatMap(({ label, title, detail }) => [label, title, detail]) ?? [],
        garden?.story.sequenceLabel,
        ...garden?.story.sequence ?? []
      ].join(' ')

      expect(copy).toContain('Three.js')
      expect(copy).toContain('TypeScript')
      expect(copy).toContain('Vite')
      expect(copy).toContain('3D')
      expect(copy).toMatch(expectedMotionTerms[locale])
      expect(copy).toMatch(expectedSimulatedTerms[locale])
      expect(copy).toMatch(expectedSameSiteTerms[locale])
      expect(copy).not.toMatch(/sensor|device|farm control|performance|user metrics|research results?|open-source license|传感器|设备|控制农场|效能指标|用户指标|研究结果|開放原始碼|實際控制|效能指標|使用者指標/i)
    }
  })

  it('offers the multimodal material request without presenting it as a public source', () => {
    const expectedLabels = {
      'zh-CN': '代码未公开，可邮件索取',
      'zh-HK': '程式碼未公開，可電郵索取',
      en: 'Code is not public; available on request by email.'
    }

    for (const locale of locales) {
      const feeding = getLocalizedResearch(locale).find(({ id }) => id === 'multimodal-feeding')
      expect(feeding?.materialRequest).toEqual({
        label: expectedLabels[locale],
        href: 'mailto:yance777@outlook.com'
      })
      expect(feeding?.link).toBeUndefined()
      expect(feeding?.proof).toBeUndefined()
    }

    expect(research.find(({ id }) => id === 'multimodal-feeding')?.link).toBeUndefined()
  })

  it('keeps the maize paper as its primary evidence and does not add an open-project link', () => {
    const paperHref = 'https://www.bio-conferences.org/articles/bioconf/abs/2026/30/bioconf_icbb2026_02029/bioconf_icbb2026_02029.html'

    for (const locale of locales) {
      const maize = getLocalizedResearch(locale).find(({ id }) => id === 'corn-growth')
      expect(maize?.paper).toMatchObject({
        href: paperHref,
        doi: '10.1051/bioconf/202623702029'
      })
      expect(maize?.citation).toContain('10.1051/bioconf/202623702029')
      expect(maize?.methodology?.method).toMatch(/16S rRNA/)
      expect(maize?.link).toBeUndefined()
    }

    expect(research.find(({ id }) => id === 'corn-growth')?.link).toBeUndefined()
  })
})
