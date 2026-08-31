import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { footerContacts } from '../src/data/footerContacts'
import { enMessages } from '../src/i18n/ui/en'
import { zhCNMessages } from '../src/i18n/ui/zh-CN'
import { zhHKMessages } from '../src/i18n/ui/zh-HK'

const root = process.cwd()

describe('footer contact data', () => {
  it('publishes the four contacts in the locked order', () => {
    expect(footerContacts).toEqual([
      {
        key: 'email',
        href: 'mailto:yance777@outlook.com',
        value: 'yance777@outlook.com',
        external: false
      },
      {
        key: 'github',
        href: 'https://github.com/yance7',
        value: '@yance7',
        external: true
      },
      {
        key: 'instagram',
        href: 'https://www.instagram.com/andreasyan.826/',
        value: '@andreasyan.826',
        external: true
      },
      {
        key: 'x',
        href: 'https://x.com/CeYan77777',
        value: '@CeYan77777',
        external: true
      }
    ])

    const data = readFileSync(resolve(root, 'src/data/footerContacts.ts'), 'utf8')
    const index = readFileSync(resolve(root, 'src/data/index.ts'), 'utf8')
    expect(data).toContain("export type FooterContactKey = 'email' | 'github' | 'instagram' | 'x'")
    expect(data).toContain('export const footerContacts: readonly FooterContact[]')
    expect(index).toContain("export * from './footerContacts'")
  })
})
describe('footer localization contract', () => {
  it('keeps identity, navigation, and contact labels synchronized', () => {
    expect(zhCNMessages.footer).toMatchObject({
      homeLabel: '返回首页',
      contactsLabel: '联系方式',
      archive: '个人档案 / 2026',
      identity: '研究者 / 构建者 / 音乐听众',
      email: '邮箱',
      github: 'GitHub',
      instagram: 'Instagram',
      x: 'X'
    })
    expect(zhHKMessages.footer).toMatchObject({
      homeLabel: '返回首頁',
      contactsLabel: '聯絡方式',
      archive: '個人檔案 / 2026',
      identity: '研究者 / 建構者 / 音樂聽眾',
      email: '電郵',
      github: 'GitHub',
      instagram: 'Instagram',
      x: 'X'
    })
    expect(enMessages.footer).toMatchObject({
      homeLabel: 'Back to home',
      contactsLabel: 'Contact channels',
      archive: 'PERSONAL ARCHIVE / 2026',
      identity: 'RESEARCHER / BUILDER / MUSIC LISTENER',
      email: 'Email',
      github: 'GitHub',
      instagram: 'Instagram',
      x: 'X'
    })

    for (const messages of [zhCNMessages, zhHKMessages, enMessages]) {
      expect(messages.footer).not.toHaveProperty('profile')
      expect(messages.footer).not.toHaveProperty('researchRepos')
      expect(messages.footer).not.toHaveProperty('contact')
    }

    const types = readFileSync(resolve(root, 'src/i18n/types.ts'), 'utf8')
    expect(types).toContain('homeLabel: string')
    expect(types).toContain('contactsLabel: string')
    expect(types).toContain('instagram: string')
    expect(types).toContain('x: string')
    expect(types).not.toContain('researchRepos: string')
  })
})

describe('footer component contract', () => {
  it('uses one localized home mark and a semantic four-link contact grid', () => {
    const footer = readFileSync(resolve(root, 'src/components/SiteFooter.vue'), 'utf8')
    const icon = resolve(root, 'src/components/FooterContactIcon.vue')
    const styles = readFileSync(resolve(root, 'src/styles/components.css'), 'utf8')
    const responsive = readFileSync(resolve(root, 'src/styles/responsive.css'), 'utf8')

    expect(existsSync(icon)).toBe(true)
    expect(footer).toContain("import { footerContacts } from '../data/footerContacts'")
    expect(footer).toContain('<address')
    expect(footer).toContain('<FooterContactIcon')
    expect(footer).toContain('messages.footer.contactsLabel')
    expect(footer).toContain('messages.footer[contact.key]')
    expect(footer).not.toContain('Yance.')
    expect(footer).not.toContain('messages.footer.profile')
    expect(footer).not.toContain('messages.footer.researchRepos')

    const iconSource = readFileSync(icon, 'utf8')
    expect(iconSource).toContain('FooterContactKey')
    expect(iconSource).toContain('viewBox="0 0 24 24"')
    expect(iconSource).toContain('currentColor')
    expect(iconSource).toContain('aria-hidden="true"')

    expect(styles).toContain('.foot-identity')
    expect(styles).toContain('.foot-contacts')
    expect(styles).toMatch(/\.foot-contacts\s*\{[\s\S]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/)
    expect(styles).toContain('min-height: 56px')
    expect(styles).toContain('min-width: 44px')
    expect(styles).not.toContain('transition: all')
    expect(responsive).toContain('@media (max-width: 300px)')
    expect(responsive).toContain('.foot-contacts { grid-template-columns: 1fr; }')
  })
})
