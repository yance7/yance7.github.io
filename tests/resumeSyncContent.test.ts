import { describe, expect, it } from 'vitest'
import { honorStats, honors, pageMetadata, research } from '../src/data'
import {
  getLocalizedAcademics,
  getLocalizedCommunity,
  getLocalizedHonorStats,
  getLocalizedHonors,
  getLocalizedProjects,
  getLocalizedResearch
} from '../src/data/locales'

const locales = ['zh-CN', 'zh-HK', 'en'] as const

describe('resume-synced content contracts', () => {
  it('keeps the four academic cards and single-sitting SAT copy consistent in every locale', () => {
    for (const locale of locales) {
      const academics = getLocalizedAcademics(locale)

      expect(academics.stats).toHaveLength(4)
      expect(academics.stats[1]).toMatchObject({ value: '1560' })
      expect(academics.stats[1]?.label).toMatch(/SAT/)
      expect(academics.stats[1]?.note).toContain('760')
      expect(academics.stats[1]?.note).toContain('800')
      expect(academics.stats[2]?.value).toBe('108')
      expect(academics.stats[3]?.value).toBe('8.0')
      expect(academics.stats[3]?.note).toContain('8.5')
      expect(academics.satSingle).toMatchObject({ value: '1510' })
      expect(academics.satSingle.note).toContain('710')
      expect(academics.satSingle.note).toContain('800')
      expect(academics.apScores.filter(({ status }) => status === 'done')).toHaveLength(9)
      expect(academics.apScores.filter(({ status }) => status === 'pending')).toHaveLength(3)
      expect(academics.sections.apArchive.copy).toMatch(/尚无成绩|尚無成績|no scores/i)
    }
  })

  it('keeps FishFreshNet V2 metrics and method boundaries aligned in every locale', () => {
    expect(research.find(({ id }) => id === 'fishfreshnet-v2')?.date).toBe('2026.04 — 2026.06')

    for (const locale of locales) {
      const v2 = getLocalizedResearch(locale).find(({ id }) => id === 'fishfreshnet-v2')
      expect(v2?.metrics?.map(({ value }) => value)).toEqual(['99.29%', '4.095M', '96.83%', '65.5–78.2%'])
      expect(`${v2?.methodology?.method} ${v2?.methodology?.result}`).toContain('0.966M')
      expect(`${v2?.methodology?.method} ${v2?.methodology?.result}`).toContain('0.061G')
      expect(v2?.methodology?.result).toContain('65.5')
      expect(`${v2?.title} ${v2?.text} ${v2?.methodology?.method} ${v2?.methodology?.result} ${v2?.methodology?.next}`)
        .not.toMatch(/95\.72|0\.929|5\.31ms|0\.083M|near-zero|近零|僅增加|only add/i)
    }
  })

  it('keeps project, paper, feeding, and maize facts precise across all locales', () => {
    for (const locale of locales) {
      const localizedResearch = getLocalizedResearch(locale)
      const freshEye = localizedResearch.find(({ id }) => id === 'fresheye')
      const v1 = localizedResearch.find(({ id }) => id === 'fishfreshnet-v1')
      const feeding = localizedResearch.find(({ id }) => id === 'multimodal-feeding')
      const maize = localizedResearch.find(({ id }) => id === 'corn-growth')
      const project = getLocalizedProjects(locale).find(({ id }) => id === 'fresheye')
      const reportCopy = `${freshEye?.text} ${freshEye?.methodology?.prototype} ${project?.description} ${project?.story.chapters[2]?.detail}`

      expect(freshEye?.date).toBe('2026.05 — 2026.09')
      expect(freshEye?.methodology?.method).toContain('Hugging Face Spaces')
      expect(`${freshEye?.methodology?.result} ${freshEye?.methodology?.prototype}`).not.toMatch(/<\s*200\s*ms|locally searchable|完全本地|完全本機/i)
      expect(v1?.methodology?.method).toMatch(/4,?800|4800/)
      expect(v1?.methodology?.prototype).toMatch(/Published|發表|发表/)
      expect(`${v1?.methodology?.method} ${v1?.methodology?.result}`).not.toMatch(/3\s*[×x]\s*20|3 levels.*20 samples/i)
      expect(feeding?.methodology?.result).toMatch(/percentage points|個百分點|个百分点/i)
      expect(maize?.methodology?.method).toMatch(/0\.5% COS|0\.5% 壳寡糖|0\.5% 殼寡糖/i)
      expect(`${maize?.text} ${maize?.methodology?.question} ${maize?.methodology?.hypothesis} ${maize?.methodology?.result}`)
        .not.toMatch(/usually below 40%|通常低於 40%|通常低于 40%|causal driver|因果驅動|因果驱动/i)
      expect(reportCopy).toMatch(locale === 'en' ? /four-tab/i : locale === 'zh-HK' ? /四個分頁/ : /四个标签页/)
      expect(reportCopy).not.toMatch(/four-label|四标签报告|四標籤報告/i)
      expect(project?.story.chapters[1]?.detail).toContain('4.095M')
    }
  })

  it('corrects honor labels without changing the historical id, anchor, count, or level totals', () => {
    expect(honors.find(({ id }) => id === 'usabo-2026-silver')).toMatchObject({
      date: '2026.05',
      level: 'excellent'
    })
    expect(honors).toHaveLength(13)
    expect(honorStats.map(({ value }) => value)).toEqual(['13', '4', '2', '7'])

    for (const locale of locales) {
      const records = getLocalizedHonors(locale)
      const bio = records.filter(({ title, org }) => /BIO-USACN|BioOlympiad Initiative USA-China/.test(`${title} ${org}`))
      const honorSummary = getLocalizedHonorStats(locale).find(({ label }) => /distinguished|卓越|卓越級/i.test(label))
      const ukcho = records.find(({ id }) => id === 'ukcho-2026-gold')
      const beijing = records.find(({ id }) => id === 'beijing-sti-2026-second')
      const trae = records.find(({ id }) => id === 'trae-ai-2026-top-350')

      expect(bio).toHaveLength(1)
      expect(bio[0]?.id).toBe('usabo-2026-silver')
      expect(`${bio[0]?.title} ${bio[0]?.org} ${honorSummary?.note}`).not.toContain('USABO')
      expect(ukcho?.title).not.toMatch(/global|世界|全球/i)
      expect(beijing?.title).toMatch(/45/)
      expect(`${trae?.title} ${trae?.org}`).toMatch(/14,?000/)
      expect(`${trae?.title} ${trae?.org}`).toMatch(/participants|參賽者|参赛者/i)
    }
  })

  it('keeps current leadership and activity details aligned with the resume in every locale', () => {
    for (const locale of locales) {
      const community = getLocalizedCommunity(locale)
      const selfManagement = community.leadership.find(({ org }) => /Self Management|自主管理委員會|自主管理委员会/.test(org))
      const volunteer = community.activities.find(({ id }) => id === 'low-carbon-volunteer')
      const pioneer = community.activities.find(({ id }) => id === 'pioneer-analyzing-ai')
      const researchInstitute = community.activities.find(({ id }) => id === 'pioneer-research-institute')
      const forum = community.activities.find(({ id }) => id === 'academic-report-forum')

      expect(selfManagement?.note).toMatch(/712/)
      expect(volunteer?.period).toBe('2024.03 — 2026.09')
      expect(pioneer?.title).toMatch(/Institute|學院|學會|学院|研究院/)
      expect(pioneer?.detail).toMatch(/A-|academic dishonesty|學術不誠實|学术不诚实/)
      expect(pioneer?.detail).toMatch(/report|報告|报告/i)
      expect(pioneer?.detail).toMatch(/innovative assignments|創新作業|创新作业/i)
      expect(pioneer?.detail).not.toMatch(/responsible|負責任|负责任/i)
      expect(pioneer?.detail).toMatch(/science, technology, and society|科学、技术与社会|科學、科技與社會/i)
      expect(researchInstitute?.detail).toMatch(/Applying Value-Sensitive Design|將價值敏感設計|将价值敏感设计/)
      expect(forum?.detail).toMatch(/CNN\/ResNet|CNNs? and ResNet/)
      expect(forum?.detail).toMatch(/attention|注意力/i)
      expect(forum?.detail).toMatch(/multimodal|多模態|多模态/i)
      expect(forum?.detail).toMatch(/FishFreshNet.*V1.*V2/i)
    }
  })

  it('marks synchronized content with the actual update date', () => {
    expect(pageMetadata.academics.updatedAt).toBe('2026-10-22')
    expect(pageMetadata.honors.updatedAt).toBe('2026-10-22')
    expect(pageMetadata.research.updatedAt).toBe('2026-10-22')
    expect(pageMetadata.works.updatedAt).toBe('2026-10-22')
  })
})
