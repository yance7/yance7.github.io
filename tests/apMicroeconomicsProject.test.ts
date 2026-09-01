import { describe, expect, it } from 'vitest'
import { getLocalizedProjectSection, getLocalizedProjects, getLocalizedWorlds } from '../src/data/locales'
import { projects } from '../src/data/projects'
import { pageRegistry } from '../src/data/pageRegistry'
import { uiMessages } from '../src/i18n'

const locales = ['zh-CN', 'zh-HK', 'en'] as const
const repositoryUrl = 'https://github.com/yance7/ap-microeconomics-notes'

function projectStrings(project: ReturnType<typeof getLocalizedProjects>[number]) {
  return project.story.chapters.flatMap(({ title, detail }) => [title, detail])
}

describe('AP Microeconomics Notes project archive', () => {
  it('keeps the ordered repository dossier contract explicit', () => {
    expect(projects.map(({ id }) => id)).toEqual(['fresheye', 'ap-microeconomics-notes'])

    const ap = projects[1]
    expect(ap).toMatchObject({
      id: 'ap-microeconomics-notes',
      status: 'open-source',
      action: 'repository',
      updatedAt: '2026-08-11',
      title: 'AP Microeconomics 中文讲义',
      en: 'AP Microeconomics Notes',
      domain: 'github.com/yance7/ap-microeconomics-notes',
      tone: 'gold',
      discipline: 'ECONOMICS EDUCATION / OPEN KNOWLEDGE',
      href: repositoryUrl
    })
    expect(ap?.stack).toEqual(['Markdown', 'Python', 'Matplotlib', 'Pandoc'])
    expect(ap?.github).toBeUndefined()
    expect(ap?.story.chapters).toHaveLength(3)
    expect(ap?.story.proof).toEqual([
      { type: 'source', label: 'SOURCE', value: 'GitHub', href: repositoryUrl, external: true }
    ])
    expect(ap?.story.proof.some(({ type }) => type === 'deployment')).toBe(false)
  })

  it('keeps all localized project entities and numeric study facts aligned', () => {
    const localizedIds = locales.map((locale) => getLocalizedProjects(locale).map(({ id }) => id))
    expect(localizedIds[1]).toEqual(localizedIds[0])
    expect(localizedIds[2]).toEqual(localizedIds[0])

    for (const locale of locales) {
      const ap = getLocalizedProjects(locale).find(({ id }) => id === 'ap-microeconomics-notes')
      expect(ap?.story.chapters).toHaveLength(3)
      expect(ap?.href).toBe(repositoryUrl)
      expect(ap?.story.proof).toHaveLength(1)
      expect(projectStrings(ap!)).toEqual(expect.arrayContaining([
        expect.stringContaining(locale === 'en' ? 'Eight' : '八'),
        expect.stringContaining('39'),
        expect.stringContaining('60')
      ]))
    }
  })

  it('keeps the Works count and repository action copy localized', () => {
    expect(pageRegistry.works.sectionIds).toEqual([
      'works-overview',
      'project-fresheye',
      'project-ap-microeconomics-notes'
    ])
    expect(uiMessages['zh-CN'].actions.viewOnGitHub).toBe('在 GitHub 查看')
    expect(uiMessages['zh-HK'].actions.viewOnGitHub).toBe('在 GitHub 查看')
    expect(uiMessages.en.actions.viewOnGitHub).toBe('View on GitHub')

    const expectedWorldDescriptions = {
      'zh-CN': '2 个持续构建的小世界，记录想法如何离开纸面，成为可以使用或继续生长的成果。',
      'zh-HK': '兩個持續建構的小世界，記錄想法如何離開紙面，成為可以使用或繼續成長的成果。',
      en: 'Two evolving project worlds showing how ideas leave the page and become products or open learning resources.'
    }

    for (const locale of locales) {
      const worksWorld = getLocalizedWorlds(locale).find(({ key }) => key === 'works')
      expect(worksWorld?.desc).toBe(expectedWorldDescriptions[locale])
      expect(getLocalizedProjectSection(locale).copyPlural).toContain(
        locale === 'en' ? 'open learning resources' : locale === 'zh-HK' ? '持續建構' : '持续构建'
      )
    }
  })
})
